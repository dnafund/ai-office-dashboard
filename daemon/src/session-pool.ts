// session-pool.ts — Pool of logical Claude sessions
// Each session can run one task at a time (spawns a --print process per task)
// Sessions are lightweight handles — no persistent processes when idle

import { randomUUID } from 'node:crypto'
import { createSessionProcess, type SessionProcess } from './session-process.js'
import type { SessionRegistry } from './session-registry.js'
import type { SessionInfo } from './types.js'

interface PoolConfig {
  readonly minPoolSize: number
  readonly maxPoolSize: number
  readonly projectDir: string
}

const DEFAULT_CONFIG: PoolConfig = {
  minPoolSize: 1,
  maxPoolSize: 5,
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
  let shuttingDown = false

  function notifyChange(): void {
    onSessionChange?.()
  }

  function createSession(): SessionInfo {
    const sessionId = randomUUID()
    const info = registry.register(sessionId, poolConfig.projectDir)

    const proc = createSessionProcess(
      sessionId,
      poolConfig.projectDir,
      onOutput,
      (sid, _resultText) => {
        // Task completed — notify before releasing
        onTaskComplete(sid)
        registry.releaseTask(sid)
        notifyChange()
      },
      (sid, exitCode, _signal) => {
        // Process exited (task done or failed)
        const session = registry.getSession(sid)
        if (session?.state === 'busy') {
          // Task failed without result
          onTaskComplete(sid)
          registry.releaseTask(sid)
          notifyChange()
        }
      },
    )

    processes.set(sessionId, proc)

    // Sessions are immediately ready (no persistent process)
    registry.updateState(sessionId, 'idle')
    notifyChange()

    return { ...info, state: 'idle' }
  }

  function ensureMinPool(): void {
    if (shuttingDown) return

    const idleCount = registry.getIdleCount()
    const totalCount = registry.getSessionCount()

    if (idleCount < poolConfig.minPoolSize && totalCount < poolConfig.maxPoolSize) {
      const toCreate = Math.min(
        poolConfig.minPoolSize - idleCount,
        poolConfig.maxPoolSize - totalCount
      )

      for (let i = 0; i < toCreate; i++) {
        createSession()
      }
    }
  }

  async function start(): Promise<void> {
    shuttingDown = false
    ensureMinPool()
  }

  async function spawnNew(): Promise<SessionInfo> {
    if (registry.getSessionCount() >= poolConfig.maxPoolSize) {
      throw new Error(`Max pool size (${poolConfig.maxPoolSize}) reached`)
    }

    return createSession()
  }

  function acquireIdle(): SessionInfo | null {
    const idleSessions = registry.getIdleSessions()
    if (idleSessions.length === 0) return null

    // Pick most recently active
    const sorted = [...idleSessions].sort(
      (a, b) => b.lastActiveAt - a.lastActiveAt
    )

    return sorted[0] ?? null
  }

  async function getOrSpawn(): Promise<SessionInfo | null> {
    const idle = acquireIdle()
    if (idle) return idle

    if (registry.getSessionCount() < poolConfig.maxPoolSize) {
      return createSession()
    }

    return null
  }

  function sendToSession(sessionId: string, prompt: string): boolean {
    const proc = processes.get(sessionId)
    if (!proc) return false

    const sent = proc.runTask(prompt)
    if (sent) {
      registry.touch(sessionId)
    }
    return sent
  }

  function cancelSession(sessionId: string): boolean {
    const proc = processes.get(sessionId)
    if (!proc) return false

    proc.kill()
    registry.releaseTask(sessionId)
    notifyChange()
    return true
  }

  async function stopSession(sessionId: string): Promise<void> {
    const proc = processes.get(sessionId)
    if (proc) {
      await proc.stop()
      processes.delete(sessionId)
    }
    registry.updateState(sessionId, 'dead')
    registry.unregister(sessionId)
    notifyChange()

    // Replenish pool
    ensureMinPool()
  }

  async function shutdown(): Promise<void> {
    shuttingDown = true

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
