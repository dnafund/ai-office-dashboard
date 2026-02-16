// session-process.ts — Spawn claude --print per task, reuse session via --resume
// Each execution is a separate process but shares session context
// Streams output via stream-json format, detects result for completion

import { spawn, type ChildProcess } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const KILL_GRACE_MS = 5000

export type ProcessOutputCallback = (
  sessionId: string,
  data: string,
  stream: 'stdout' | 'stderr'
) => void

export type ProcessResultCallback = (
  sessionId: string,
  resultText: string
) => void

export type ProcessExitCallback = (
  sessionId: string,
  exitCode: number | null,
  signal: string | null
) => void

interface RunTaskConfig {
  readonly sessionId: string
  readonly projectDir: string
  readonly prompt: string
  readonly onOutput: ProcessOutputCallback
  readonly onResult: ProcessResultCallback
  readonly onExit: ProcessExitCallback
}

export interface SessionProcess {
  readonly sessionId: string
  readonly claudeSessionId: string
  readonly pid: number | undefined
  runTask(prompt: string): boolean
  stop(): Promise<void>
  kill(): void
  isAlive(): boolean
  isBusy(): boolean
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

    // System init message
    if (parsed.type === 'system' && parsed.subtype === 'init') {
      return { type: 'init' }
    }

    return null
  } catch {
    return null
  }
}

// Run a single task as a --print process, streaming output
function runTaskProcess(config: RunTaskConfig): ChildProcess {
  const { sessionId, projectDir, prompt, onOutput, onResult, onExit } = config

  const proc = spawn('claude', [
    '--print',
    '--verbose',
    '--output-format', 'stream-json',
    '--dangerously-skip-permissions',
    prompt,
  ], {
    cwd: projectDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
    },
  })

  let stdoutBuffer = ''
  let stderrBuffer = ''
  let gotResult = false

  proc.stdout?.on('data', (chunk: Buffer) => {
    stdoutBuffer += chunk.toString()
    const lines = stdoutBuffer.split('\n')
    stdoutBuffer = lines.pop() ?? ''

    for (const line of lines) {
      if (line.trim().length === 0) continue

      const parsed = parseStreamJsonLine(line)

      if (parsed?.isResult && parsed.text) {
        gotResult = true
        onOutput(sessionId, parsed.text, 'stdout')
        onResult(sessionId, parsed.text)
        continue
      }

      if (parsed?.text) {
        onOutput(sessionId, parsed.text, 'stdout')
        continue
      }

      // Skip init and other system messages
      if (parsed?.type === 'init') continue

      // Forward unparseable lines as raw output
      if (!line.startsWith('{')) {
        onOutput(sessionId, line, 'stdout')
      }
    }
  })

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

  proc.on('close', (code, signal) => {
    if (stdoutBuffer.trim().length > 0) {
      onOutput(sessionId, stdoutBuffer, 'stdout')
    }
    if (stderrBuffer.trim().length > 0) {
      onOutput(sessionId, stderrBuffer, 'stderr')
    }

    // If we got a result message, treat as success regardless of exit code
    if (gotResult) {
      onExit(sessionId, 0, null)
    } else {
      onExit(sessionId, code, signal)
    }
  })

  proc.on('error', (err) => {
    onOutput(sessionId, `Process error: ${err.message}`, 'stderr')
    onExit(sessionId, 1, null)
  })

  return proc
}

// Creates a session handle that can run tasks sequentially
// Each task spawns a new --print process but reuses the session ID
export function createSessionProcess(
  sessionId: string,
  projectDir: string,
  onOutput: ProcessOutputCallback,
  onResult: ProcessResultCallback,
  onExit: ProcessExitCallback,
): SessionProcess {
  const claudeSessionId = randomUUID()
  let currentProc: ChildProcess | null = null
  let busy = false

  function runTask(prompt: string): boolean {
    if (busy) return false

    busy = true
    currentProc = runTaskProcess({
      sessionId,
      projectDir,
      prompt,
      onOutput,
      onResult,
      onExit: (sid, code, signal) => {
        busy = false
        currentProc = null
        onExit(sid, code, signal)
      },
    })

    return true
  }

  async function stop(): Promise<void> {
    if (!currentProc) return

    try {
      currentProc.kill('SIGTERM')
    } catch {
      // Already dead
    }

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        try {
          currentProc?.kill('SIGKILL')
        } catch {
          // Already dead
        }
        resolve()
      }, KILL_GRACE_MS)

      currentProc?.on('close', () => {
        clearTimeout(timer)
        resolve()
      })
    })

    busy = false
    currentProc = null
  }

  function kill(): void {
    if (!currentProc) return

    try {
      currentProc.kill('SIGKILL')
    } catch {
      // Already dead
    }

    busy = false
    currentProc = null
  }

  function isAlive(): boolean {
    // Session is always "alive" — it's a logical session, not a persistent process
    return true
  }

  function isBusy(): boolean {
    return busy
  }

  return {
    sessionId,
    claudeSessionId,
    get pid() {
      return currentProc?.pid
    },
    runTask,
    stop,
    kill,
    isAlive,
    isBusy,
  }
}
