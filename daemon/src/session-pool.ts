// session-pool.ts — Pool of warm Claude CLI sessions
// Manages spawning, pre-warming, health checks, idle cleanup
// Delegates process lifecycle to session-process.ts

import { randomUUID } from 'node:crypto'
import { createSessionProcess, type SessionProcess } from './session-process.js'
import type { SessionRegistry } from './session-registry.js'
import type { SessionInfo } from './types.js'

interface PoolConfig {
  readonly minPoolSize: number
  readonly maxPoolSize: number
  readonly idleTimeoutMs: number
  readonly healthCheckIntervalMs: number
  readonly projectDir: string
}

const DEFAULT_CONFIG: PoolConfig = {
  minPoolSize: 1,
  maxPoolSize: 5,
  idleTimeoutMs: 15 * 60 * 1000,
  healthCheckIntervalMs: 30 * 1000,
  projectDir: process.cwd(),
}

type OutputCallback = (
  sessionId: string,
  data: string,
  stream: 'stdout' | 'stderr'
) => void

type TaskCompleteCallback = (sessionId: string) => void
type SessionChangeCallback = () => void

interface PoolCreateConfig {
  readonly registry: SessionRegistry
  readonly onOutput: OutputCallback
  readonly onTaskComplete: TaskCompleteCallback
  readonly onSessionChange?: SessionChangeCallback
  readonly config?: Partial<PoolConfig>
}

export function createSessionPool(createConfig: PoolCreateConfig) {
  const {
    registry,
    onOutput,
    onTaskComplete,
    onSessionChange,
  } = createConfig

  const poolConfig: PoolConfig = {
    ...DEFAULT_CONFIG,
    ...createConfig.config,
  }

  const processes = new Map<string, SessionProcess>()
  let healthCheckTimer: ReturnType<typeof setInterval> | null = null
  let shuttingDown = false

  function notifyChange(): void {
    onSessionChange?.()
  }

  function replenishPool(): void {
    if (shuttingDown) return

    const idleCount = registry.getIdleCount()
    const totalCount = registry.getSessionCount()

    if (idleCount < poolConfig.minPoolSize && totalCount < poolConfig.maxPoolSize) {
      const toSpawn = Math.min(
        poolConfig.minPoolSize - idleCount,
        poolConfig.maxPoolSize - totalCount
      )

      for (let i = 0; i < toSpawn; i++) {
        spawnNew().catch(() => {
          // Best effort pre-warming
        })
      }
    }
  }

  function handleSessionReady(sessionId: string): void {
    const session = registry.getSession(sessionId)
    if (!session) return

    // Only transition to idle if still in starting state
    if (session.state === 'starting') {
      registry.updateState(sessionId, 'idle')
      notifyChange()
    }
  }

  function handleSessionResult(sessionId: string, _resultText: string): void {
    const session = registry.getSession(sessionId)
    if (!session) return

    // Release the task → session becomes idle
    registry.releaseTask(sessionId)
    onTaskComplete(sessionId)
    notifyChange()

    // Replenish pool if needed
    replenishPool()
  }

  function handleSessionExit(
    sessionId: string,
    _exitCode: number | null,
    _signal: string | null
  ): void {
    processes.delete(sessionId)
    registry.updateState(sessionId, 'dead')
    registry.unregister(sessionId)
    notifyChange()

    // Replenish pool after a session dies
    replenishPool()
  }

  function runHealthCheck(): void {
    const now = Date.now()
    const allSessions = registry.getAllSessions()

    for (const session of allSessions) {
      const proc = processes.get(session.sessionId)

      // Check if process is dead but registry thinks it's alive
      if (proc && !proc.isAlive() && session.state !== 'dead') {
        processes.delete(session.sessionId)
        registry.updateState(session.sessionId, 'dead')
        registry.unregister(session.sessionId)
        notifyChange()
        continue
      }

      // Reap idle sessions past timeout
      if (
        session.state === 'idle' &&
        now - session.lastActiveAt > poolConfig.idleTimeoutMs &&
        registry.getIdleCount() > poolConfig.minPoolSize
      ) {
        const idleProc = processes.get(session.sessionId)
        if (idleProc) {
          registry.updateState(session.sessionId, 'stopping')
          notifyChange()
          idleProc.stop().then(() => {
            processes.delete(session.sessionId)
            registry.unregister(session.sessionId)
            notifyChange()
          }).catch(() => {
            processes.delete(session.sessionId)
            registry.unregister(session.sessionId)
            notifyChange()
          })
        }
      }
    }

    replenishPool()
  }

  async function start(): Promise<void> {
    shuttingDown = false

    // Start health check interval
    healthCheckTimer = setInterval(runHealthCheck, poolConfig.healthCheckIntervalMs)

    // Pre-warm pool
    replenishPool()
  }

  async function spawnNew(): Promise<SessionInfo> {
    if (registry.getSessionCount() >= poolConfig.maxPoolSize) {
      throw new Error(`Max pool size (${poolConfig.maxPoolSize}) reached`)
    }

    const sessionId = randomUUID()
    const info = registry.register(sessionId, poolConfig.projectDir)

    const proc = createSessionProcess({
      sessionId,
      projectDir: poolConfig.projectDir,
      onOutput,
      onReady: handleSessionReady,
      onResult: handleSessionResult,
      onExit: handleSessionExit,
    })

    processes.set(sessionId, proc)

    if (proc.pid) {
      registry.updatePid(sessionId, proc.pid)
    }

    notifyChange()
    return info
  }

  function acquireIdle(): SessionInfo | null {
    const idleSessions = registry.getIdleSessions()
    if (idleSessions.length === 0) return null

    // Pick the most recently active idle session
    const sorted = [...idleSessions].sort(
      (a, b) => b.lastActiveAt - a.lastActiveAt
    )

    return sorted[0] ?? null
  }

  async function getOrSpawn(): Promise<SessionInfo | null> {
    const idle = acquireIdle()
    if (idle) return idle

    if (registry.getSessionCount() < poolConfig.maxPoolSize) {
      return spawnNew()
    }

    return null
  }

  function sendToSession(sessionId: string, prompt: string): boolean {
    const proc = processes.get(sessionId)
    if (!proc) return false

    return proc.sendMessage(prompt)
  }

  function cancelSession(sessionId: string): boolean {
    const proc = processes.get(sessionId)
    if (!proc) return false

    proc.kill()
    return true
  }

  async function stopSession(sessionId: string): Promise<void> {
    const proc = processes.get(sessionId)
    if (!proc) return

    registry.updateState(sessionId, 'stopping')
    notifyChange()

    await proc.stop()
    processes.delete(sessionId)
    registry.unregister(sessionId)
    notifyChange()
  }

  async function shutdown(): Promise<void> {
    shuttingDown = true

    if (healthCheckTimer) {
      clearInterval(healthCheckTimer)
      healthCheckTimer = null
    }

    const stopPromises = Array.from(processes.values()).map(async (proc) => {
      try {
        await proc.stop()
      } catch {
        proc.kill()
      }
    })

    await Promise.allSettled(stopPromises)
    processes.clear()
  }

  function getStats() {
    const all = registry.getAllSessions()
    return {
      total: all.length,
      idle: all.filter((s) => s.state === 'idle').length,
      busy: all.filter((s) => s.state === 'busy').length,
      starting: all.filter((s) => s.state === 'starting').length,
    }
  }

  return {
    start,
    spawnNew,
    acquireIdle,
    getOrSpawn,
    sendToSession,
    cancelSession,
    stopSession,
    shutdown,
    getStats,
  }
}

export type SessionPool = ReturnType<typeof createSessionPool>
