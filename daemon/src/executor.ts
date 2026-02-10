// executor.ts — Spawn and manage claude CLI processes
// Streams output back via callbacks, enforces concurrency limits and timeouts

import { spawn, type ChildProcess } from 'node:child_process'
import type { ExecutionInfo, ExecutionStatus } from './types.js'

const MAX_CONCURRENT = 5
const EXECUTION_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const KILL_GRACE_MS = 5000

interface ExecutionEntry {
  readonly info: ExecutionInfo
  readonly process: ChildProcess
  readonly timeoutId: ReturnType<typeof setTimeout>
}

type OutputCallback = (
  teamId: string,
  taskId: string,
  data: string,
  stream: 'stdout' | 'stderr'
) => void

type EndCallback = (
  teamId: string,
  taskId: string,
  exitCode: number | null,
  signal: string | null
) => void

type StartCallback = (
  teamId: string,
  taskId: string,
  agentName: string
) => void

export function createExecutor() {
  const executions = new Map<string, ExecutionEntry>()
  let onOutput: OutputCallback | null = null
  let onEnd: EndCallback | null = null
  let onStart: StartCallback | null = null

  function executionKey(teamId: string, taskId: string): string {
    return `${teamId}:${taskId}`
  }

  function getActiveCount(): number {
    return executions.size
  }

  function getActiveExecutions(): readonly ExecutionInfo[] {
    return Array.from(executions.values()).map((e) => e.info)
  }

  function isRunning(teamId: string, taskId: string): boolean {
    return executions.has(executionKey(teamId, taskId))
  }

  function startExecution(
    teamId: string,
    taskId: string,
    agentName: string,
    prompt: string
  ): ExecutionInfo {
    const key = executionKey(teamId, taskId)

    if (executions.has(key)) {
      throw new Error(`Task ${taskId} is already executing`)
    }

    if (getActiveCount() >= MAX_CONCURRENT) {
      throw new Error(`Max concurrent executions (${MAX_CONCURRENT}) reached`)
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required')
    }

    const info: ExecutionInfo = {
      taskId,
      teamId,
      agentName,
      status: 'running',
      startedAt: Date.now(),
      pid: undefined,
    }

    const proc = spawn('claude', [
      '--print',
      '--verbose',
      '--output-format', 'stream-json',
      '--dangerously-skip-permissions',
      prompt.trim(),
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
      },
    })

    const infoWithPid: ExecutionInfo = {
      ...info,
      pid: proc.pid,
    }

    // Notify start
    onStart?.(teamId, taskId, agentName)

    // Stream stdout line by line
    let stdoutBuffer = ''
    proc.stdout?.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString()
      const lines = stdoutBuffer.split('\n')
      // Keep last incomplete line in buffer
      stdoutBuffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.trim().length > 0) {
          onOutput?.(teamId, taskId, line, 'stdout')
        }
      }
    })

    // Stream stderr
    let stderrBuffer = ''
    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrBuffer += chunk.toString()
      const lines = stderrBuffer.split('\n')
      stderrBuffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.trim().length > 0) {
          onOutput?.(teamId, taskId, line, 'stderr')
        }
      }
    })

    // Handle exit
    proc.on('close', (code, signal) => {
      // Flush remaining buffers
      if (stdoutBuffer.trim().length > 0) {
        onOutput?.(teamId, taskId, stdoutBuffer, 'stdout')
      }
      if (stderrBuffer.trim().length > 0) {
        onOutput?.(teamId, taskId, stderrBuffer, 'stderr')
      }

      const entry = executions.get(key)
      if (entry) {
        clearTimeout(entry.timeoutId)
        executions.delete(key)
      }

      onEnd?.(teamId, taskId, code, signal)
    })

    proc.on('error', (err) => {
      const entry = executions.get(key)
      if (entry) {
        clearTimeout(entry.timeoutId)
        executions.delete(key)
      }

      onOutput?.(teamId, taskId, `Process error: ${err.message}`, 'stderr')
      onEnd?.(teamId, taskId, 1, null)
    })

    // Timeout
    const timeoutId = setTimeout(() => {
      if (executions.has(key)) {
        onOutput?.(teamId, taskId, 'Execution timed out after 10 minutes', 'stderr')
        cancelExecution(teamId, taskId)
      }
    }, EXECUTION_TIMEOUT_MS)

    executions.set(key, {
      info: infoWithPid,
      process: proc,
      timeoutId,
    })

    return infoWithPid
  }

  function cancelExecution(teamId: string, taskId: string): boolean {
    const key = executionKey(teamId, taskId)
    const entry = executions.get(key)

    if (!entry) {
      return false
    }

    const proc = entry.process

    // Try SIGTERM first
    proc.kill('SIGTERM')

    // Force kill after grace period
    setTimeout(() => {
      try {
        proc.kill('SIGKILL')
      } catch {
        // Process may have already exited
      }
    }, KILL_GRACE_MS)

    return true
  }

  function setOnOutput(cb: OutputCallback): void {
    onOutput = cb
  }

  function setOnEnd(cb: EndCallback): void {
    onEnd = cb
  }

  function setOnStart(cb: StartCallback): void {
    onStart = cb
  }

  function shutdown(): void {
    for (const [key, entry] of executions) {
      clearTimeout(entry.timeoutId)
      try {
        entry.process.kill('SIGTERM')
      } catch {
        // Best effort
      }
    }
    executions.clear()
  }

  return {
    startExecution,
    cancelExecution,
    getActiveExecutions,
    getActiveCount,
    isRunning,
    setOnOutput,
    setOnEnd,
    setOnStart,
    shutdown,
  }
}

export type Executor = ReturnType<typeof createExecutor>
