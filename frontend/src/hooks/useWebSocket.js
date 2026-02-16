import { useState, useEffect, useRef, useCallback } from 'react'

// Smart WS URL:
// - localhost → direct to daemon ws://localhost:3001
// - LAN IP / Cloudflare → go through Vite proxy /ws
function getWsUrl() {
  const h = window.location.hostname
  if (h === 'localhost' || h === '127.0.0.1') return 'ws://localhost:3001'
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}
const WS_URL = getWsUrl()
const INITIAL_DELAY = 1000
const MAX_DELAY = 30000

const MAX_OUTPUT_LINES = 1000

export function useWebSocket() {
  const [data, setData] = useState({ teams: [], activity: [], tasks: [], sessions: [], projects: [] })
  const [connected, setConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [executions, setExecutions] = useState(new Map())
  const [outputHistory, setOutputHistory] = useState(new Map())
  const [sessions, setSessions] = useState([])
  const wsRef = useRef(null)
  const reconnectTimer = useRef(null)
  const reconnectDelay = useRef(INITIAL_DELAY)
  const unmountedRef = useRef(false)

  const connect = useCallback(() => {
    if (unmountedRef.current) return

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        if (unmountedRef.current) { ws.close(); return }
        setConnected(true)
        reconnectDelay.current = INITIAL_DELAY
        if (reconnectTimer.current) {
          clearTimeout(reconnectTimer.current)
          reconnectTimer.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === 'update') {
            setData({
              teams: msg.teams ?? [],
              activity: msg.activity ?? [],
              tasks: msg.tasks ?? [],
              sessions: msg.sessions ?? [],
              projects: msg.projects ?? [],
            })
            if (msg.sessions) setSessions(msg.sessions)
            setLastUpdated(msg.timestamp ? new Date(msg.timestamp) : new Date())
            return
          }

          if (msg.type === 'session_state') {
            setSessions(msg.sessions ?? [])
            return
          }

          if (msg.type === 'execution_start') {
            setExecutions((prev) => {
              const next = new Map(prev)
              next.set(`${msg.teamId}:${msg.taskId}`, {
                teamId: msg.teamId,
                taskId: msg.taskId,
                agentName: msg.agentName,
                startedAt: Date.now(),
              })
              return next
            })
            return
          }

          if (msg.type === 'execution_output') {
            setOutputHistory((prev) => {
              const key = `${msg.teamId}:${msg.taskId}`
              const existing = prev.get(key) ?? []
              const entry = { data: msg.data, stream: msg.stream, ts: Date.now() }
              const updated = [...existing, entry]
              // Keep only last N lines
              const trimmed = updated.length > MAX_OUTPUT_LINES
                ? updated.slice(updated.length - MAX_OUTPUT_LINES)
                : updated
              const next = new Map(prev)
              next.set(key, trimmed)
              return next
            })
            return
          }

          if (msg.type === 'execution_end') {
            setExecutions((prev) => {
              const next = new Map(prev)
              next.delete(`${msg.teamId}:${msg.taskId}`)
              return next
            })
            // Add final line to output
            setOutputHistory((prev) => {
              const key = `${msg.teamId}:${msg.taskId}`
              const existing = prev.get(key) ?? []
              const status = msg.exitCode === 0 ? 'completed' : `failed (exit ${msg.exitCode})`
              const entry = { data: `--- Execution ${status} ---`, stream: 'system', ts: Date.now() }
              const next = new Map(prev)
              next.set(key, [...existing, entry])
              return next
            })
            return
          }
        } catch {
          // Ignore parse errors
        }
      }

      ws.onclose = () => {
        setConnected(false)
        wsRef.current = null
        if (!unmountedRef.current) {
          const delay = reconnectDelay.current
          reconnectDelay.current = Math.min(delay * 2, MAX_DELAY)
          reconnectTimer.current = setTimeout(connect, delay)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      if (!unmountedRef.current) {
        const delay = reconnectDelay.current
        reconnectDelay.current = Math.min(delay * 2, MAX_DELAY)
        reconnectTimer.current = setTimeout(connect, delay)
      }
    }
  }, [])

  useEffect(() => {
    unmountedRef.current = false
    connect()
    return () => {
      unmountedRef.current = true
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const refresh = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'refresh' }))
    }
  }, [])

  const clearOutput = useCallback((teamId, taskId) => {
    setOutputHistory((prev) => {
      const next = new Map(prev)
      next.delete(`${teamId}:${taskId}`)
      return next
    })
  }, [])

  return { data, connected, lastUpdated, refresh, executions, outputHistory, clearOutput, sessions }
}
