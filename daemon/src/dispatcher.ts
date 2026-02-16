// dispatcher.ts — Smart task dispatch algorithm
// Routes tasks to idle sessions or spawns new ones
// Maps session output back to task channels for WebSocket broadcast

import { taskKeyOf } from './session-registry.js'
import type { PoolManager } from './pool-manager.js'
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
  readonly poolManager: PoolManager
  readonly onOutput: OutputCallback
  readonly onStart: StartCallback
  readonly onEnd: EndCallback
}

interface TaskMeta {
  readonly teamId: string
  readonly taskId: string
  readonly agentName: string
  readonly sessionId: string
  readonly projectId: string
  readonly timeoutId: ReturnType<typeof setTimeout>
  readonly startedAt: number
}

export function createDispatcher(config: DispatcherConfig) {
  const { poolManager, onOutput, onStart, onEnd } = config
  const activeTasks = new Map<string, TaskMeta>()

  // Called by session-pool when a session emits output
  // Uses activeTasks map to route output to the correct task
  function handleSessionOutput(
    sessionId: string,
    data: string,
    stream: 'stdout' | 'stderr'
  ): void {
    for (const [, meta] of activeTasks) {
      if (meta.sessionId === sessionId) {
        onOutput(meta.teamId, meta.taskId, data, stream)
        return
      }
    }
  }

  // Called by session-pool when a task completes (result event)
  function handleTaskComplete(sessionId: string): void {
    for (const [taskKey, meta] of activeTasks) {
      if (meta.sessionId === sessionId) {
        clearTimeout(meta.timeoutId)
        activeTasks.delete(taskKey)
        onEnd(meta.teamId, meta.taskId, 0, null)
        return
      }
    }
  }

  // Called when a session dies unexpectedly
  function handleSessionDeath(sessionId: string): void {
    for (const [taskKey, meta] of activeTasks) {
      if (meta.sessionId === sessionId) {
        clearTimeout(meta.timeoutId)
        activeTasks.delete(taskKey)
        onOutput(meta.teamId, meta.taskId, 'Session died unexpectedly', 'stderr')
        onEnd(meta.teamId, meta.taskId, 1, null)
        break
      }
    }
  }

  async function dispatch(request: DispatchRequest): Promise<DispatchResult> {
    const { teamId, taskId, agentName, prompt, projectId } = request
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

    // 2. Resolve project pool
    if (!projectId) {
      return {
        sessionId: '',
        taskKey,
        dispatched: false,
        reason: 'No projectId specified',
      }
    }

    const poolEntry = await poolManager.getOrCreatePool(projectId)
    if (!poolEntry) {
      return {
        sessionId: '',
        taskKey,
        dispatched: false,
        reason: `Project not found: ${projectId}`,
      }
    }

    const { pool, registry } = poolEntry

    // 3. Get or spawn a session from the project's pool
    const session = request.preferNewSession
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
      projectId,
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

    // Cancel session in the project's pool
    const entry = poolManager.getPool(meta.projectId)
    if (entry) {
      entry.pool.cancelSession(meta.sessionId)
    }

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
    return Array.from(activeTasks.values()).map((meta) => {
      const entry = poolManager.getPool(meta.projectId)
      const session = entry?.registry.getSession(meta.sessionId)
      return {
        taskId: meta.taskId,
        teamId: meta.teamId,
        agentName: meta.agentName,
        status: 'running' as const,
        startedAt: meta.startedAt,
        pid: session?.pid,
      }
    })
  }

  async function shutdown(): Promise<void> {
    // Clear all timeouts
    for (const [, meta] of activeTasks) {
      clearTimeout(meta.timeoutId)
    }
    activeTasks.clear()

    await poolManager.shutdown()
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
