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

export function useWebSocket() {
  const [data, setData] = useState({ teams: [], activity: [] })
  const [connected, setConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
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
            setData({ teams: msg.teams ?? [], activity: msg.activity ?? [] })
            setLastUpdated(msg.timestamp ? new Date(msg.timestamp) : new Date())
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

  return { data, connected, lastUpdated, refresh }
}
