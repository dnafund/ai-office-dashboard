// session-registry.ts — Pure data structure tracking all session states
// No process management — just the registry of what exists and their states
// All public methods return new objects (immutable patterns)

import type { SessionInfo, SessionState } from './types.js'

function taskKeyOf(teamId: string, taskId: string): string {
  return `${teamId}:${taskId}`
}

function parseTaskKey(key: string): { teamId: string; taskId: string } | null {
  const idx = key.indexOf(':')
  if (idx < 0) return null
  return { teamId: key.slice(0, idx), taskId: key.slice(idx + 1) }
}

export function createSessionRegistry() {
  const sessions = new Map<string, SessionInfo>()

  function register(sessionId: string, projectDir: string): SessionInfo {
    if (sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already registered`)
    }

    const now = Date.now()
    const info: SessionInfo = {
      sessionId,
      pid: undefined,
      state: 'starting',
      createdAt: now,
      lastActiveAt: now,
      currentTaskKey: undefined,
      totalTasksCompleted: 0,
      projectDir,
    }

    sessions.set(sessionId, info)
    return info
  }

  function updateState(sessionId: string, state: SessionState): SessionInfo | null {
    const existing = sessions.get(sessionId)
    if (!existing) return null

    const updated: SessionInfo = {
      ...existing,
      state,
      lastActiveAt: Date.now(),
    }

    sessions.set(sessionId, updated)
    return updated
  }

  function updatePid(sessionId: string, pid: number): SessionInfo | null {
    const existing = sessions.get(sessionId)
    if (!existing) return null

    const updated: SessionInfo = {
      ...existing,
      pid,
      lastActiveAt: Date.now(),
    }

    sessions.set(sessionId, updated)
    return updated
  }

  function assignTask(sessionId: string, taskKey: string): SessionInfo | null {
    const existing = sessions.get(sessionId)
    if (!existing) return null

    if (existing.state !== 'idle' && existing.state !== 'starting') {
      throw new Error(`Cannot assign task to session in state: ${existing.state}`)
    }

    const updated: SessionInfo = {
      ...existing,
      state: 'busy',
      currentTaskKey: taskKey,
      lastActiveAt: Date.now(),
    }

    sessions.set(sessionId, updated)
    return updated
  }

  function releaseTask(sessionId: string): SessionInfo | null {
    const existing = sessions.get(sessionId)
    if (!existing) return null

    const updated: SessionInfo = {
      ...existing,
      state: 'idle',
      currentTaskKey: undefined,
      lastActiveAt: Date.now(),
      totalTasksCompleted: existing.totalTasksCompleted + 1,
    }

    sessions.set(sessionId, updated)
    return updated
  }

  function unregister(sessionId: string): boolean {
    return sessions.delete(sessionId)
  }

  function getSession(sessionId: string): SessionInfo | null {
    return sessions.get(sessionId) ?? null
  }

  function getAllSessions(): readonly SessionInfo[] {
    return Array.from(sessions.values())
  }

  function getIdleSessions(): readonly SessionInfo[] {
    return Array.from(sessions.values()).filter((s) => s.state === 'idle')
  }

  function getBusySessions(): readonly SessionInfo[] {
    return Array.from(sessions.values()).filter((s) => s.state === 'busy')
  }

  function getSessionByTask(taskKey: string): SessionInfo | null {
    for (const session of sessions.values()) {
      if (session.currentTaskKey === taskKey) {
        return session
      }
    }
    return null
  }

  function getSessionCount(): number {
    return sessions.size
  }

  function getIdleCount(): number {
    let count = 0
    for (const session of sessions.values()) {
      if (session.state === 'idle') count++
    }
    return count
  }

  function touch(sessionId: string): void {
    const existing = sessions.get(sessionId)
    if (!existing) return

    sessions.set(sessionId, {
      ...existing,
      lastActiveAt: Date.now(),
    })
  }

  return {
    register,
    updateState,
    updatePid,
    assignTask,
    releaseTask,
    unregister,
    getSession,
    getAllSessions,
    getIdleSessions,
    getBusySessions,
    getSessionByTask,
    getSessionCount,
    getIdleCount,
    touch,
    taskKeyOf,
    parseTaskKey,
  }
}

export type SessionRegistry = ReturnType<typeof createSessionRegistry>
export { taskKeyOf, parseTaskKey }
