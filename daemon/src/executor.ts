// executor.ts — Thin facade over the dispatcher
// Maintains the same external API so index.ts requires minimal changes
// Delegates all execution logic to the dispatcher + session pool

import type { Dispatcher } from './dispatcher.js'
import type { SessionRegistry } from './session-registry.js'
import type { ExecutionInfo } from './types.js'

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

export function createExecutor(
  dispatcher: Dispatcher,
  registry: SessionRegistry
) {
  let onOutput: OutputCallback | null = null
  let onEnd: EndCallback | null = null
  let onStart: StartCallback | null = null

  function getActiveCount(): number {
    return dispatcher.getActiveExecutions().length
  }

  function getActiveExecutions(): readonly ExecutionInfo[] {
    return dispatcher.getActiveExecutions()
  }

  function isRunning(teamId: string, taskId: string): boolean {
    return dispatcher.isDispatched(teamId, taskId)
  }

  async function startExecution(
    teamId: string,
    taskId: string,
    agentName: string,
    prompt: string
  ): Promise<ExecutionInfo> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required')
    }

    const result = await dispatcher.dispatch({
      teamId,
      taskId,
      agentName,
      prompt: prompt.trim(),
    })

    if (!result.dispatched) {
      throw new Error(result.reason ?? 'Dispatch failed')
    }

    const session = registry.getSession(result.sessionId)

    return {
      taskId,
      teamId,
      agentName,
      status: 'running',
      startedAt: Date.now(),
      pid: session?.pid,
    }
  }

  function cancelExecution(teamId: string, taskId: string): boolean {
    return dispatcher.cancel(teamId, taskId)
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

  async function shutdown(): Promise<void> {
    await dispatcher.shutdown()
  }

  // These getters are used by the dispatcher wiring in index.ts
  function getOnOutput(): OutputCallback | null {
    return onOutput
  }

  function getOnEnd(): EndCallback | null {
    return onEnd
  }

  function getOnStart(): StartCallback | null {
    return onStart
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
    getOnOutput,
    getOnEnd,
    getOnStart,
    shutdown,
  }
}

export type Executor = ReturnType<typeof createExecutor>
