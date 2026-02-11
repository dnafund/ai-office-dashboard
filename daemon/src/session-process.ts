// session-process.ts — Manages a single long-running Claude CLI process
// Uses --input-format stream-json for bidirectional communication
// Stdin stays open: write JSON messages to trigger new tasks
// Stdout emits stream-json events: parse assistant/result messages

import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const KILL_GRACE_MS = 5000

export type ProcessOutputCallback = (
  sessionId: string,
  data: string,
  stream: 'stdout' | 'stderr'
) => void

export type ProcessReadyCallback = (sessionId: string) => void

export type ProcessResultCallback = (
  sessionId: string,
  resultText: string
) => void

export type ProcessExitCallback = (
  sessionId: string,
  exitCode: number | null,
  signal: string | null
) => void

interface SessionProcessConfig {
  readonly sessionId: string
  readonly projectDir: string
  readonly onOutput: ProcessOutputCallback
  readonly onReady: ProcessReadyCallback
  readonly onResult: ProcessResultCallback
  readonly onExit: ProcessExitCallback
}

export interface SessionProcess {
  readonly sessionId: string
  readonly pid: number | undefined
  sendMessage(prompt: string): boolean
  stop(): Promise<void>
  kill(): void
  isAlive(): boolean
}

function parseStreamJsonLine(line: string): {
  type: string
  text?: string
  isResult?: boolean
} | null {
  try {
    const parsed = JSON.parse(line)

    // Result message — task is done
    if (parsed.type === 'result') {
      const resultText = typeof parsed.result === 'string'
        ? parsed.result
        : parsed.result?.text ?? JSON.stringify(parsed.result)
      return { type: 'result', text: resultText, isResult: true }
    }

    // Assistant message with content
    if (parsed.type === 'assistant' && parsed.message?.content) {
      const content = parsed.message.content
      if (Array.isArray(content)) {
        const textParts = content
          .filter((c: { type: string }) => c.type === 'text')
          .map((c: { text: string }) => c.text)
          .join('')
        if (textParts.length > 0) {
          return { type: 'assistant', text: textParts }
        }
      }
      return null
    }

    // System init/ready message
    if (parsed.type === 'system' && parsed.subtype === 'init') {
      return { type: 'init' }
    }

    return null
  } catch {
    return null
  }
}

export function createSessionProcess(config: SessionProcessConfig): SessionProcess {
  const { sessionId, projectDir, onOutput, onReady, onResult, onExit } = config

  let proc: ChildProcess | null = null
  let alive = false
  let ready = false
  let stdoutBuffer = ''
  let stderrBuffer = ''

  // Generate a unique Claude session ID for this process
  const claudeSessionId = randomUUID()

  proc = spawn('claude', [
    '--print',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--session-id', claudeSessionId,
    '--dangerously-skip-permissions',
    '--verbose',
  ], {
    cwd: projectDir,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
    },
  })

  alive = true

  // Parse stdout line by line (stream-json format)
  proc.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuffer += chunk.toString()
    const lines = stdoutBuffer.split('\n')
    stdoutBuffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.trim().length === 0) continue

      const parsed = parseStreamJsonLine(line)

      if (parsed?.type === 'init' && !ready) {
        ready = true
        onReady(sessionId)
        continue
      }

      if (parsed?.isResult && parsed.text) {
        onOutput(sessionId, parsed.text, 'stdout')
        onResult(sessionId, parsed.text)
        continue
      }

      if (parsed?.text) {
        onOutput(sessionId, parsed.text, 'stdout')
        continue
      }

      // Forward raw line if we couldn't parse it
      onOutput(sessionId, line, 'stdout')
    }
  })

  // Stream stderr
  proc.stderr?.on('data', (chunk: Buffer) => {
    stderrBuffer += chunk.toString()
    const lines = stderrBuffer.split('\n')
    stderrBuffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.trim().length > 0) {
        onOutput(sessionId, line, 'stderr')
      }
    }
  })

  // Handle process exit
  proc.on('close', (code, signal) => {
    // Flush remaining buffers
    if (stdoutBuffer.trim().length > 0) {
      onOutput(sessionId, stdoutBuffer, 'stdout')
    }
    if (stderrBuffer.trim().length > 0) {
      onOutput(sessionId, stderrBuffer, 'stderr')
    }

    alive = false
    ready = false
    onExit(sessionId, code, signal)
  })

  proc.on('error', (err) => {
    alive = false
    ready = false
    onOutput(sessionId, `Process error: ${err.message}`, 'stderr')
    onExit(sessionId, 1, null)
  })

  // If no init message within 30s, consider it ready anyway
  const readyTimeout = setTimeout(() => {
    if (!ready && alive) {
      ready = true
      onReady(sessionId)
    }
  }, 30_000)

  function sendMessage(prompt: string): boolean {
    if (!proc || !alive || !proc.stdin?.writable) {
      return false
    }

    try {
      const message = JSON.stringify({
        type: 'user',
        message: {
          role: 'user',
          content: prompt,
        },
      })
      proc.stdin.write(message + '\n')
      return true
    } catch {
      return false
    }
  }

  async function stop(): Promise<void> {
    clearTimeout(readyTimeout)

    if (!proc || !alive) return

    // Try graceful close first
    try {
      if (proc.stdin?.writable) {
        proc.stdin.end()
      }
      proc.kill('SIGTERM')
    } catch {
      // Process may have already exited
    }

    // Force kill after grace period
    await new Promise<void>((resolve) => {
      const forceKillTimer = setTimeout(() => {
        try {
          proc?.kill('SIGKILL')
        } catch {
          // Already dead
        }
        resolve()
      }, KILL_GRACE_MS)

      proc?.on('close', () => {
        clearTimeout(forceKillTimer)
        resolve()
      })
    })
  }

  function kill(): void {
    clearTimeout(readyTimeout)
    if (!proc || !alive) return

    try {
      proc.kill('SIGKILL')
    } catch {
      // Already dead
    }
  }

  function isAlive(): boolean {
    return alive
  }

  return {
    sessionId,
    get pid() {
      return proc?.pid
    },
    sendMessage,
    stop,
    kill,
    isAlive,
  }
}
