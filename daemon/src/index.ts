import { createServer } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { WebSocketServer, type WebSocket } from 'ws'
import { TeamWatcher } from './watcher.js'
import { readAllActivity } from './inbox.js'
import type { ActivityMessage, DashboardState, WsMessage } from './types.js'

const PORT = Number(process.env.PORT ?? 3001)
const TEAMS_DIR = join(homedir(), '.claude', 'teams')
const BROADCAST_INTERVAL = 2000

const watcher = new TeamWatcher(TEAMS_DIR)
const clients = new Set<WebSocket>()
let cachedActivity: readonly ActivityMessage[] = []

async function buildState(): Promise<DashboardState> {
  const teams = watcher.getTeams()
  const teamIds = teams.map((t) => t.id)
  cachedActivity = await readAllActivity(TEAMS_DIR, teamIds)

  return {
    teams,
    activity: cachedActivity,
    timestamp: Date.now(),
  }
}

async function broadcast(): Promise<void> {
  const state = await buildState()
  const msg: WsMessage = {
    type: 'update',
    ...state,
  }
  const payload = JSON.stringify(msg)

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload)
    }
  }
}

// HTTP server for REST endpoint
const server = createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url === '/api/teams' && req.method === 'GET') {
    buildState().then((state) => {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(state))
    }).catch(() => {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Internal error' }))
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

// WebSocket server
const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  clients.add(ws)

  // Send initial state
  buildState().then((state) => {
    const msg: WsMessage = { type: 'update', ...state }
    ws.send(JSON.stringify(msg))
  })

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString())
      if (parsed.type === 'refresh') {
        buildState().then((state) => {
          const refreshMsg: WsMessage = { type: 'update', ...state }
          ws.send(JSON.stringify(refreshMsg))
        })
      }
    } catch {
      // Ignore malformed messages
    }
  })

  ws.on('close', () => {
    clients.delete(ws)
  })
})

// Start
async function main(): Promise<void> {
  await watcher.start((teams) => {
    // File change detected — broadcast immediately
    broadcast()
  })

  // Also broadcast on interval for smooth updates
  setInterval(broadcast, BROADCAST_INTERVAL)

  server.listen(PORT, () => {
    process.stdout.write(`\n🏢 AI Office Daemon running on :${PORT}\n`)
    process.stdout.write(`   Teams dir: ${TEAMS_DIR}\n`)
    process.stdout.write(`   REST: http://localhost:${PORT}/api/teams\n`)
    process.stdout.write(`   WS:   ws://localhost:${PORT}\n\n`)
  })
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`)
  process.exit(1)
})
