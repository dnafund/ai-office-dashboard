// pool-manager.ts — Manages multiple session pools, one per project
// Lazy pool creation: only spawns when first task dispatched to a project

import { createSessionPool, type SessionPool } from './session-pool.js'
import { createSessionRegistry, type SessionRegistry } from './session-registry.js'
import type { ProjectRegistry } from './project-registry.js'
import type { SessionInfo } from './types.js'

interface PoolManagerConfig {
  readonly projectRegistry: ProjectRegistry
  readonly minPoolSize: number
  readonly maxPoolSize: number
  readonly onOutput: (sessionId: string, data: string, stream: 'stdout' | 'stderr') => void
  readonly onTaskComplete: (sessionId: string) => void
  readonly onSessionChange?: () => void
}

interface PoolEntry {
  readonly projectId: string
  readonly pool: SessionPool
  readonly registry: SessionRegistry
}

export function createPoolManager(config: PoolManagerConfig) {
  const {
    projectRegistry,
    minPoolSize,
    maxPoolSize,
    onOutput,
    onTaskComplete,
    onSessionChange,
  } = config

  const pools = new Map<string, PoolEntry>()

  function createPoolForProject(projectId: string, projectDir: string): PoolEntry {
    const registry = createSessionRegistry()

    const pool = createSessionPool({
      registry,
      onOutput,
      onTaskComplete,
      onSessionChange,
      config: {
        minPoolSize,
        maxPoolSize,
        projectDir,
      },
    })

    const entry: PoolEntry = { projectId, pool, registry }
    pools.set(projectId, entry)
    return entry
  }

  async function getOrCreatePool(projectId: string): Promise<PoolEntry | null> {
    const existing = pools.get(projectId)
    if (existing) return existing

    const project = projectRegistry.getById(projectId)
    if (!project) return null

    const entry = createPoolForProject(projectId, project.path)
    await entry.pool.start()
    return entry
  }

  function getPool(projectId: string): PoolEntry | null {
    return pools.get(projectId) ?? null
  }

  function getAllSessions(): readonly SessionInfo[] {
    const allSessions: SessionInfo[] = []
    for (const [, entry] of pools) {
      allSessions.push(...entry.registry.getAllSessions())
    }
    return allSessions
  }

  function getAllStats() {
    const stats: Record<string, ReturnType<SessionPool['getStats']>> = {}
    for (const [projectId, entry] of pools) {
      stats[projectId] = entry.pool.getStats()
    }
    return stats
  }

  async function stopPool(projectId: string): Promise<void> {
    const entry = pools.get(projectId)
    if (!entry) return

    await entry.pool.shutdown()
    pools.delete(projectId)
  }

  async function shutdown(): Promise<void> {
    const stopPromises = Array.from(pools.keys()).map((id) => stopPool(id))
    await Promise.allSettled(stopPromises)
    pools.clear()
  }

  return {
    getOrCreatePool,
    getPool,
    getAllSessions,
    getAllStats,
    stopPool,
    shutdown,
  }
}

export type PoolManager = ReturnType<typeof createPoolManager>
