import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { WebSocketServer, type WebSocket } from 'ws'
import { TeamWatcher } from './watcher.js'
import { readAllActivity } from './inbox.js'
import { readAllTasks, assignTask } from './tasks.js'
import { createTeam, deleteTeam, addAgent, removeAgent, updateAgent } from './manager.js'
import { createTask, updateTaskStatus, deleteTask } from './task-manager.js'
import { createProjectRegistry } from './project-registry.js'
import { createPoolManager } from './pool-manager.js'
import { createDispatcher } from './dispatcher.js'
import { createExecutor } from './executor.js'
import type { ActivityMessage, DashboardState, TaskState, WsMessage, WsBroadcastMessage } from './types.js'

const PORT = Number(process.env.PORT ?? 3001)
const TEAMS_DIR = join(homedir(), '.claude', 'teams')
const TASKS_DIR = join(homedir(), '.claude', 'tasks')
const PROJECT_DIR = process.cwd()
const BROADCAST_INTERVAL = 2000

const watcher = new TeamWatcher(TEAMS_DIR)
const clients = new Set<WebSocket>()
let cachedActivity: readonly ActivityMessage[] = []
let cachedTasks: readonly TaskState[] = []

// ─── Project Registry + Pool Manager setup ───────────────────

const projectRegistry = createProjectRegistry()

function broadcastMessage(msg: WsBroadcastMessage): void {
  const payload = JSON.stringify(msg)
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload)
    }
  }
}

function broadcastSessionState(): void {
  broadcastMessage({
    type: 'session_state',
    sessions: poolManager.getAllSessions(),
  })
}

const poolManager = createPoolManager({
  projectRegistry,
  minPoolSize: 1,
  maxPoolSize: 3,
  onOutput: (sessionId, data, stream) => {
    dispatcher.handleSessionOutput(sessionId, data, stream)
  },
  onTaskComplete: (sessionId) => {
    dispatcher.handleTaskComplete(sessionId)
  },
  onSessionChange: () => {
    broadcastSessionState()
  },
})

const dispatcher = createDispatcher({
  poolManager,
  onOutput: (teamId, taskId, data, stream) => {
    broadcastMessage({
      type: 'execution_output',
      teamId,
      taskId,
      data,
      stream,
    })
  },
  onStart: (teamId, taskId, agentName) => {
    broadcastMessage({
      type: 'execution_start',
      teamId,
      taskId,
      agentName,
    })
  },
  onEnd: (teamId, taskId, exitCode, signal) => {
    broadcastMessage({
      type: 'execution_end',
      teamId,
      taskId,
      exitCode,
      signal,
    })

    // Update task status based on exit code
    const status = exitCode === 0 ? 'completed' : 'blocked'
    updateTaskStatus(TASKS_DIR, teamId, taskId, status).catch(() => {
      // Best effort status update
    })

    // Trigger broadcast for updated state
    broadcast()
  },
})

const executor = createExecutor(dispatcher, poolManager)

// ─── State builder ──────────────────────────────────────────

async function buildState(): Promise<DashboardState> {
  const teams = watcher.getTeams()
  const teamIds = teams.map((t) => t.id)
  cachedActivity = await readAllActivity(TEAMS_DIR, teamIds)
  cachedTasks = await readAllTasks(TASKS_DIR, teamIds)

  return {
    teams,
    activity: cachedActivity,
    tasks: cachedTasks,
    sessions: poolManager.getAllSessions(),
    projects: projectRegistry.getAll(),
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

// ─── HTTP helpers ────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

function json(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function parseUrl(url: string): { path: string; segments: string[] } {
  const path = url.split('?')[0]
  const segments = path.split('/').filter(Boolean)
  return { path, segments }
}

// ─── HTTP server ─────────────────────────────────────────────

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const { path, segments } = parseUrl(req.url ?? '/')

  try {
    // ─── Project routes ────────────────────────────────────

    // GET /api/projects — list all projects
    if (path === '/api/projects' && req.method === 'GET') {
      return json(res, 200, { projects: projectRegistry.getAll() })
    }

    // POST /api/projects — register { name, path }
    if (path === '/api/projects' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req))
      if (!body.name || typeof body.name !== 'string') {
        return json(res, 400, { error: 'Missing or invalid name' })
      }
      if (!body.path || typeof body.path !== 'string') {
        return json(res, 400, { error: 'Missing or invalid path' })
      }
      const project = await projectRegistry.register(body.name, body.path, body.color)
      broadcast()
      return json(res, 201, project)
    }

    // DELETE /api/projects/:id — unregister + stop pool
    if (segments[0] === 'api' && segments[1] === 'projects' && segments.length === 3 && req.method === 'DELETE') {
      const projectId = segments[2]
      await poolManager.stopPool(projectId)
      const removed = await projectRegistry.unregister(projectId)
      if (!removed) {
        return json(res, 404, { error: 'Project not found' })
      }
      broadcast()
      return json(res, 200, { ok: true })
    }

    // ─── Team routes ───────────────────────────────────────

    // GET /api/teams — list all teams + activity
    if (path === '/api/teams' && req.method === 'GET') {
      const state = await buildState()
      return json(res, 200, state)
    }

    // POST /api/teams — create team { name: string }
    if (path === '/api/teams' && req.method === 'POST') {
      const body = JSON.parse(await readBody(req))
      const result = await createTeam(TEAMS_DIR, body.name)
      await watcher.rescan()
      broadcast()
      return json(res, 201, result)
    }

    // DELETE /api/teams/:teamId — delete team
    if (segments[0] === 'api' && segments[1] === 'teams' && segments.length === 3 && req.method === 'DELETE') {
      const teamId = segments[2]
      await deleteTeam(TEAMS_DIR, teamId)
      await watcher.rescan()
      broadcast()
      return json(res, 200, { ok: true })
    }

    // POST /api/teams/:teamId/agents — add agent { name, agentType }
    if (segments[0] === 'api' && segments[1] === 'teams' && segments[3] === 'agents' && segments.length === 4 && req.method === 'POST') {
      const teamId = segments[2]
      const body = JSON.parse(await readBody(req))
      const member = await addAgent(TEAMS_DIR, teamId, body.name, body.agentType)
      await watcher.rescan()
      broadcast()
      return json(res, 201, member)
    }

    // PUT /api/teams/:teamId/agents/:agentId — update agent
    if (segments[0] === 'api' && segments[1] === 'teams' && segments[3] === 'agents' && segments.length === 5 && req.method === 'PUT') {
      const teamId = segments[2]
      const agentId = segments[4]
      const body = JSON.parse(await readBody(req))
      await updateAgent(TEAMS_DIR, teamId, agentId, body)
      await watcher.rescan()
      broadcast()
      return json(res, 200, { ok: true })
    }

    // DELETE /api/teams/:teamId/agents/:agentId — remove agent
    if (segments[0] === 'api' && segments[1] === 'teams' && segments[3] === 'agents' && segments.length === 5 && req.method === 'DELETE') {
      const teamId = segments[2]
      const agentId = segments[4]
      await removeAgent(TEAMS_DIR, teamId, agentId)
      await watcher.rescan()
      broadcast()
      return json(res, 200, { ok: true })
    }

    // ─── Task routes ───────────────────────────────────────

    // GET /api/tasks — list all tasks
    if (path === '/api/tasks' && req.method === 'GET') {
      const teams = watcher.getTeams()
      const teamIds = teams.map((t) => t.id)
      const tasks = await readAllTasks(TASKS_DIR, teamIds)
      return json(res, 200, { tasks })
    }

    // POST /api/tasks/:teamId/assign — assign task { taskId: string, owner: string }
    if (segments[0] === 'api' && segments[1] === 'tasks' && segments[3] === 'assign' && segments.length === 4 && req.method === 'POST') {
      const teamId = segments[2]
      const body = JSON.parse(await readBody(req))
      if (!body.taskId || !body.owner || typeof body.taskId !== 'string' || typeof body.owner !== 'string') {
        return json(res, 400, { error: 'Missing or invalid taskId/owner' })
      }
      await assignTask(TASKS_DIR, teamId, body.taskId, body.owner)
      broadcast()
      return json(res, 200, { ok: true })
    }

    // POST /api/tasks/:teamId/create — create task { subject, description?, owner? }
    if (segments[0] === 'api' && segments[1] === 'tasks' && segments[3] === 'create' && segments.length === 4 && req.method === 'POST') {
      const teamId = segments[2]
      const body = JSON.parse(await readBody(req))
      if (!body.subject || typeof body.subject !== 'string') {
        return json(res, 400, { error: 'Missing or invalid subject' })
      }
      const task = await createTask(TASKS_DIR, teamId, body.subject, body.description, body.owner)
      broadcast()
      return json(res, 201, task)
    }

    // PUT /api/tasks/:teamId/:taskId/status — update status { status }
    if (segments[0] === 'api' && segments[1] === 'tasks' && segments[4] === 'status' && segments.length === 5 && req.method === 'PUT') {
      const teamId = segments[2]
      const taskId = segments[3]
      const body = JSON.parse(await readBody(req))
      if (!body.status || typeof body.status !== 'string') {
        return json(res, 400, { error: 'Missing or invalid status' })
      }
      const updated = await updateTaskStatus(TASKS_DIR, teamId, taskId, body.status)
      broadcast()
      return json(res, 200, updated)
    }

    // POST /api/tasks/:teamId/:taskId/execute — execute task { agentName, prompt?, projectId }
    if (segments[0] === 'api' && segments[1] === 'tasks' && segments[4] === 'execute' && segments.length === 5 && req.method === 'POST') {
      const teamId = segments[2]
      const taskId = segments[3]
      const body = JSON.parse(await readBody(req))
      if (!body.agentName || typeof body.agentName !== 'string') {
        return json(res, 400, { error: 'Missing or invalid agentName' })
      }
      if (!body.projectId || typeof body.projectId !== 'string') {
        return json(res, 400, { error: 'Missing or invalid projectId' })
      }
      const prompt = body.prompt || `Execute task: ${body.agentName}`
      await updateTaskStatus(TASKS_DIR, teamId, taskId, 'in_progress')
      const execInfo = await executor.startExecution(teamId, taskId, body.agentName, prompt, body.projectId)
      broadcast()
      return json(res, 200, execInfo)
    }

    // POST /api/tasks/:teamId/:taskId/cancel — cancel execution
    if (segments[0] === 'api' && segments[1] === 'tasks' && segments[4] === 'cancel' && segments.length === 5 && req.method === 'POST') {
      const teamId = segments[2]
      const taskId = segments[3]
      const cancelled = executor.cancelExecution(teamId, taskId)
      if (cancelled) {
        await updateTaskStatus(TASKS_DIR, teamId, taskId, 'blocked')
        broadcast()
      }
      return json(res, 200, { ok: cancelled })
    }

    // DELETE /api/tasks/:teamId/:taskId — delete task
    if (segments[0] === 'api' && segments[1] === 'tasks' && segments.length === 4 && req.method === 'DELETE') {
      const teamId = segments[2]
      const taskId = segments[3]
      // Cancel execution if running
      if (executor.isRunning(teamId, taskId)) {
        executor.cancelExecution(teamId, taskId)
      }
      await deleteTask(TASKS_DIR, teamId, taskId)
      broadcast()
      return json(res, 200, { ok: true })
    }

    // GET /api/executions — list active executions
    if (path === '/api/executions' && req.method === 'GET') {
      return json(res, 200, { executions: executor.getActiveExecutions() })
    }

    // ─── Session routes ───────────────────────────────────────

    // GET /api/sessions — list all sessions across all projects
    if (path === '/api/sessions' && req.method === 'GET') {
      return json(res, 200, {
        sessions: poolManager.getAllSessions(),
        stats: poolManager.getAllStats(),
      })
    }

    json(res, 404, { error: 'Not found' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    json(res, 500, { error: message })
  }
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
  // Load project registry and ensure cwd is registered
  await projectRegistry.load()
  const defaultProject = await projectRegistry.ensureDefault(PROJECT_DIR)
  process.stdout.write(`   Default project: ${defaultProject.name} (${defaultProject.path})\n`)

  await watcher.start(() => {
    broadcast()
  })

  // Pre-warm a pool for the default project
  await poolManager.getOrCreatePool(defaultProject.id)
  process.stdout.write(`   Pool started for default project\n`)

  // Also broadcast on interval for smooth updates
  setInterval(broadcast, BROADCAST_INTERVAL)

  server.listen(PORT, () => {
    process.stdout.write(`\n🏢 AI Office Daemon running on :${PORT}\n`)
    process.stdout.write(`   Teams dir: ${TEAMS_DIR}\n`)
    process.stdout.write(`   Projects: ${projectRegistry.getAll().length} registered\n`)
    process.stdout.write(`   REST: http://localhost:${PORT}/api/teams\n`)
    process.stdout.write(`   WS:   ws://localhost:${PORT}\n\n`)
  })
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  await executor.shutdown()
  process.exit(0)
})
process.on('SIGINT', async () => {
  await executor.shutdown()
  process.exit(0)
})
