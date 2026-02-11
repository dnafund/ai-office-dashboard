// dispatcher.ts — Smart task dispatch algorithm
// Routes tasks to idle sessions or spawns new ones
// Maps session output back to task channels for WebSocket broadcast

import { taskKeyOf, parseTaskKey } from './session-registry.js'
import type { SessionRegistry } from './session-registry.js'
import type { SessionPool } from './session-pool.js'
import type { DispatchRequest, DispatchResult, ExecutionInfo } from './types.js'

const TASK_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

type OutputCallback = (
  teamId: string,
  taskId: string,
  data: string,
  stream: 'stdout' | 'stderr'
) => void

type StartCallback = (
  teamId: string,
  taskId: string,
  agentName: string
) => void

type EndCallback = (
  teamId: string,
  taskId: string,
  exitCode: number | null,
  signal: string | null
) => void

interface DispatcherConfig {
  readonly pool: SessionPool
  readonly registry: SessionRegistry
  readonly onOutput: OutputCallback
  readonly onStart: StartCallback
  readonly onEnd: EndCallback
}

interface TaskMeta {
  readonly teamId: string
  readonly taskId: string
  readonly agentName: string
  readonly sessionId: string
  readonly timeoutId: ReturnType<typeof setTimeout>
  readonly startedAt: number
}

export function createDispatcher(config: DispatcherConfig) {
  const { pool, registry, onOutput, onStart, onEnd } = config
  const activeTasks = new Map<string, TaskMeta>()

  // Called by session-pool when a session emits output
  function handleSessionOutput(
    sessionId: string,
    data: string,
    stream: 'stdout' | 'stderr'
  ): void {
    const session = registry.getSession(sessionId)
    if (!session?.currentTaskKey) return

    const parsed = parseTaskKey(session.currentTaskKey)
    if (!parsed) return

    onOutput(parsed.teamId, parsed.taskId, data, stream)
  }

  // Called by session-pool when a task completes (result event)
  function handleTaskComplete(sessionId: string): void {
    const session = registry.getSession(sessionId)
    if (!session?.currentTaskKey) return

    const parsed = parseTaskKey(session.currentTaskKey)
    if (!parsed) return

    const taskKey = session.currentTaskKey
    const meta = activeTasks.get(taskKey)
    if (meta) {
      clearTimeout(meta.timeoutId)
      activeTasks.delete(taskKey)
    }

    onEnd(parsed.teamId, parsed.taskId, 0, null)
  }

  // Called when a session dies unexpectedly
  function handleSessionDeath(sessionId: string): void {
    // Find any task assigned to this session
    for (const [taskKey, meta] of activeTasks) {
      if (meta.sessionId === sessionId) {
        clearTimeout(meta.timeoutId)
        activeTasks.delete(taskKey)

        const parsed = parseTaskKey(taskKey)
        if (parsed) {
          onOutput(parsed.teamId, parsed.taskId, 'Session died unexpectedly', 'stderr')
          onEnd(parsed.teamId, parsed.taskId, 1, null)
        }
        break
      }
    }
  }

  async function dispatch(request: DispatchRequest): Promise<DispatchResult> {
    const { teamId, taskId, agentName, prompt } = request
    const taskKey = taskKeyOf(teamId, taskId)

    // 1. Check if task already dispatched
    if (activeTasks.has(taskKey)) {
      return {
        sessionId: '',
        taskKey,
        dispatched: false,
        reason: 'Task already running',
      }
    }

    // 2. Get or spawn a session
    let session = request.preferNewSession
      ? await pool.spawnNew()
      : await pool.getOrSpawn()

    if (!session) {
      return {
        sessionId: '',
        taskKey,
        dispatched: false,
        reason: 'No sessions available (pool exhausted)',
      }
    }

    // 3. Wait for session to be ready if it's still starting
    if (session.state === 'starting') {
      await waitForSessionReady(session.sessionId, 30_000)
      session = registry.getSession(session.sessionId)
      if (!session || session.state === 'dead') {
        return {
          sessionId: '',
          taskKey,
          dispatched: false,
          reason: 'Session failed to start',
        }
      }
    }

    // 4. Assign task to session
    registry.assignTask(session.sessionId, taskKey)

    // 5. Set up timeout
    const timeoutId = setTimeout(() => {
      if (activeTasks.has(taskKey)) {
        const meta = activeTasks.get(taskKey)
        if (meta) {
          onOutput(teamId, taskId, 'Task timed out after 10 minutes', 'stderr')
          pool.cancelSession(meta.sessionId)
          activeTasks.delete(taskKey)
          onEnd(teamId, taskId, 1, 'SIGTERM')
        }
      }
    }, TASK_TIMEOUT_MS)

    // 6. Track the task
    activeTasks.set(taskKey, {
      teamId,
      taskId,
      agentName,
      sessionId: session.sessionId,
      timeoutId,
      startedAt: Date.now(),
    })

    // 7. Notify start
    onStart(teamId, taskId, agentName)

    // 8. Send prompt to session
    const sent = pool.sendToSession(session.sessionId, prompt)
    if (!sent) {
      clearTimeout(timeoutId)
      activeTasks.delete(taskKey)
      registry.releaseTask(session.sessionId)

      return {
        sessionId: session.sessionId,
        taskKey,
        dispatched: false,
        reason: 'Failed to send message to session',
      }
    }

    return {
      sessionId: session.sessionId,
      taskKey,
      dispatched: true,
    }
  }

  function cancel(teamId: string, taskId: string): boolean {
    const taskKey = taskKeyOf(teamId, taskId)
    const meta = activeTasks.get(taskKey)
    if (!meta) return false

    clearTimeout(meta.timeoutId)
    activeTasks.delete(taskKey)

    pool.cancelSession(meta.sessionId)
    onEnd(teamId, taskId, null, 'SIGTERM')

    return true
  }

  function isDispatched(teamId: string, taskId: string): boolean {
    return activeTasks.has(taskKeyOf(teamId, taskId))
  }

  function getSessionForTask(teamId: string, taskId: string): string | null {
    const meta = activeTasks.get(taskKeyOf(teamId, taskId))
    return meta?.sessionId ?? null
  }

  function getActiveExecutions(): readonly ExecutionInfo[] {
    return Array.from(activeTasks.values()).map((meta) => ({
      taskId: meta.taskId,
      teamId: meta.teamId,
      agentName: meta.agentName,
      status: 'running' as const,
      startedAt: meta.startedAt,
      pid: registry.getSession(meta.sessionId)?.pid,
    }))
  }

  async function shutdown(): Promise<void> {
    // Clear all timeouts
    for (const [, meta] of activeTasks) {
      clearTimeout(meta.timeoutId)
    }
    activeTasks.clear()

    await pool.shutdown()
  }

  function waitForSessionReady(sessionId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const start = Date.now()

      const check = () => {
        const session = registry.getSession(sessionId)
        if (!session || session.state !== 'starting' || Date.now() - start > timeoutMs) {
          resolve()
          return
        }
        setTimeout(check, 500)
      }

      check()
    })
  }

  return {
    dispatch,
    cancel,
    isDispatched,
    getSessionForTask,
    getActiveExecutions,
    handleSessionOutput,
    handleTaskComplete,
    handleSessionDeath,
    shutdown,
  }
}

export type Dispatcher = ReturnType<typeof createDispatcher>
