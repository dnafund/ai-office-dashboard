import { useRef, useEffect, useState, useCallback } from 'react'
import { drawTileMap, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './TileMap.js'
import { drawAgent, drawAgentLabel } from './SpriteSheet.js'
import { createAgent, updateAgent, updateAgentFromTeamData } from './Agent.js'
import {
  createCamera, updateCamera, zoomCamera, panCamera, setCameraTarget,
  applyCamera, resetTransform, screenToWorld, getVisibleBounds,
} from './Camera.js'
import { createCanvasPointerHandler } from './CanvasPointerHandler.js'
import { drawSelectionRing, drawHoverHighlight, drawTaskDot } from './SelectionRenderer.js'
import { getAgentsInBox2D } from './getAgentsInBox2D.js'
import {
  toggleSelection, replaceSelection, addToSelection, clearSelection,
} from './SelectionManager.js'
import {
  createParticleSystem, updateParticles, drawParticles,
  emitTypingParticles, emitThoughtBubble, emitSpawnPoof, emitDespawnFade,
} from './ParticleSystem.js'
import {
  createAmbientState, updateAmbient, drawAmbientEffects,
} from './AmbientEffects.js'
import { handleControlGroupKey } from './ControlGroups.js'
import { SelectionBox } from './SelectionBox.jsx'
import { SelectionPanel } from './SelectionPanel.jsx'
import { Minimap } from './Minimap.jsx'
import { Toast } from './Toast.jsx'
import { KeyboardHints } from './KeyboardHints.jsx'

const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE * 2
const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE * 2
const PAN_SPEED = 0.15
const TYPING_EMIT_INTERVAL = 8
const THOUGHT_EMIT_CHANCE = 0.003

const CHARACTER_COLORS = {
  controller: '#8B5CF6', Plan: '#8B5CF6', architect: '#8B5CF6',
  'general-purpose': '#10B981', 'build-error-resolver': '#10B981',
  Explore: '#F59E0B', 'doc-updater': '#F59E0B',
  'code-reviewer': '#3B82F6', 'security-reviewer': '#3B82F6',
  'python-reviewer': '#3B82F6', 'go-reviewer': '#3B82F6',
  tester: '#EF4444', 'e2e-runner': '#EF4444',
}

export function OfficeCanvas({ teams, tasks, roomOverride, onAgentHover, onAgentClick }) {
  const canvasRef = useRef(null)
  const agentsRef = useRef(new Map())
  const animFrameRef = useRef(null)
  const cameraRef = useRef(createCamera(MAP_WIDTH / 2, MAP_HEIGHT / 2))
  const keysRef = useRef(new Set())
  const isPanningRef = useRef(false)
  const lastPanPosRef = useRef(null)
  const particlesRef = useRef(createParticleSystem())
  const ambientRef = useRef(createAmbientState())
  const prevAgentIdsRef = useRef(new Set())
  const pointerRef = useRef(null)
  const selectedAgentsRef = useRef(new Set())
  const frameCountRef = useRef(0)

  const hoveredAgentRef = useRef(null)

  const [selectedAgents, setSelectedAgents] = useState(new Set())
  const [hoveredAgent, setHoveredAgent] = useState(null)
  const [dragBox, setDragBox] = useState({ start: null, end: null, active: false })
  const [controlGroups, setControlGroups] = useState(new Map())
  const [toast, setToast] = useState(null)
  const [minimapAgents, setMinimapAgents] = useState([])
  const [cameraBounds, setCameraBounds] = useState(null)

  selectedAgentsRef.current = selectedAgents
  hoveredAgentRef.current = hoveredAgent

  // Build owner→taskStatus lookup
  const ownerTaskMap = useRef(new Map())
  useEffect(() => {
    const map = new Map()
    for (const ts of tasks) {
      for (const task of ts.tasks) {
        if (task.owner && task.status !== 'completed') {
          map.set(task.owner, task.status)
        }
      }
    }
    ownerTaskMap.current = map
  }, [tasks])

  // Sync agents from team data + spawn/despawn particles
  useEffect(() => {
    const currentAgents = agentsRef.current
    const nextAgents = new Map(currentAgents)
    const seenIds = new Set()
    let memberIndex = 0

    for (const team of teams) {
      for (const member of team.members) {
        seenIds.add(member.agentId)
        const existing = currentAgents.get(member.agentId)
        if (existing) {
          nextAgents.set(member.agentId, updateAgentFromTeamData(existing, member))
        } else {
          const newAgent = createAgent(member, memberIndex)
          nextAgents.set(member.agentId, newAgent)
          if (prevAgentIdsRef.current.size > 0) {
            particlesRef.current = emitSpawnPoof(particlesRef.current, newAgent.x, newAgent.y, TILE_SIZE)
          }
        }
        memberIndex++
      }
    }

    for (const [id, agent] of currentAgents) {
      if (!seenIds.has(id)) {
        particlesRef.current = emitDespawnFade(particlesRef.current, agent.x, agent.y, TILE_SIZE)
        nextAgents.delete(id)
      }
    }
    agentsRef.current = nextAgents
    prevAgentIdsRef.current = seenIds
  }, [teams])

  // Room override
  useEffect(() => {
    const agents = agentsRef.current
    if (agents.size === 0) return
    const nextAgents = new Map()
    for (const [id, agent] of agents) {
      nextAgents.set(id, updateAgentFromTeamData(agent, {
        agentId: agent.id, name: agent.name, agentType: agent.agentType,
        model: agent.model, isActive: agent.isActive,
      }))
    }
    agentsRef.current = nextAgents
  }, [roomOverride])

  // Pointer handler — store external callbacks in refs to avoid recreating handler
  const onAgentClickRef = useRef(onAgentClick)
  const onAgentHoverRef = useRef(onAgentHover)
  onAgentClickRef.current = onAgentClick
  onAgentHoverRef.current = onAgentHover

  useEffect(() => {
    pointerRef.current = createCanvasPointerHandler({
      getAgentAtPoint(wx, wy) {
        for (const a of agentsRef.current.values()) {
          if (wx >= a.x && wx <= a.x + 1 && wy >= a.y && wy <= a.y + 1) return a
        }
        return null
      },
      onDragStart(s) { setDragBox({ start: s, end: s, active: true }) },
      onDragMove(s, c) { setDragBox({ start: s, end: c, active: true }) },
      onDragEnd(s, e, ctrl) {
        setDragBox({ start: null, end: null, active: false })
        const ids = getAgentsInBox2D(agentsRef.current, cameraRef.current, CANVAS_WIDTH, CANVAS_HEIGHT, s, e)
        if (ids.length === 0 && !ctrl) { setSelectedAgents(clearSelection()); return }
        setSelectedAgents(ctrl ? addToSelection(selectedAgentsRef.current, ids) : replaceSelection(ids))
      },
      onAgentClick(agent, ctrl) {
        setSelectedAgents(toggleSelection(selectedAgentsRef.current, agent.id, ctrl))
        onAgentClickRef.current?.(agent)
      },
      onEmptyClick() { setSelectedAgents(clearSelection()); onAgentClickRef.current?.(null) },
      onHover(agent) { setHoveredAgent(agent?.id ?? null); onAgentHoverRef.current?.(agent) },
    })
  }, [])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let lastTime = performance.now()

    function gameLoop(now) {
      const dt = Math.min((now - lastTime) / 16.67, 3)
      lastTime = now
      frameCountRef.current++

      // Keyboard pan
      let cam = cameraRef.current
      const keys = keysRef.current
      if (keys.size > 0) {
        const sp = PAN_SPEED / cam.zoom * dt
        let dx = 0, dy = 0
        if (keys.has('w') || keys.has('arrowup')) dy -= sp
        if (keys.has('s') || keys.has('arrowdown')) dy += sp
        if (keys.has('a') || keys.has('arrowleft')) dx -= sp
        if (keys.has('d') || keys.has('arrowright')) dx += sp
        if (dx || dy) cam = panCamera(cam, dx, dy)
      }
      cam = updateCamera(cam, dt)
      cameraRef.current = cam

      // Clear
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#050508'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Ambient (screen space)
      ambientRef.current = updateAmbient(ambientRef.current, dt)
      drawAmbientEffects(ctx, ambientRef.current, CANVAS_WIDTH, CANVAS_HEIGHT, now)

      // Camera
      applyCamera(ctx, cam, CANVAS_WIDTH, CANVAS_HEIGHT)
      const bounds = getVisibleBounds(cam, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Tilemap
      drawTileMap(ctx, 1, bounds)

      // Agents — build updated map (immutable), then draw from it
      const prevAgents = agentsRef.current
      const sel = selectedAgentsRef.current
      const hovered = hoveredAgentRef.current
      const updatedAgents = new Map()
      for (const [id, agent] of prevAgents) {
        updatedAgents.set(id, updateAgent(agent, dt))
      }
      agentsRef.current = updatedAgents

      for (const agent of updatedAgents.values()) {
        if (agent.x < bounds.minTileX - 1 || agent.x > bounds.maxTileX + 1 ||
            agent.y < bounds.minTileY - 1 || agent.y > bounds.maxTileY + 1) continue

        const px = agent.x * TILE_SIZE
        const py = agent.y * TILE_SIZE
        drawAgent(ctx, px, py, TILE_SIZE, agent.agentType, agent.direction, agent.frame, agent.isActive)
        drawAgentLabel(ctx, px, py, TILE_SIZE, agent.name, agent.agentType, 1)

        if (sel.has(agent.id)) drawSelectionRing(ctx, agent, now)
        if (hovered === agent.id && !sel.has(agent.id)) drawHoverHighlight(ctx, agent)

        const ts = ownerTaskMap.current.get(agent.name)
        if (ts) drawTaskDot(ctx, agent, ts, now)

        // Particles emit
        if (agent.isActive && !agent.isMoving && frameCountRef.current % TYPING_EMIT_INTERVAL === 0) {
          particlesRef.current = emitTypingParticles(particlesRef.current, agent.x, agent.y, TILE_SIZE)
        }
        if (!agent.isActive && !agent.isMoving && Math.random() < THOUGHT_EMIT_CHANCE) {
          particlesRef.current = emitThoughtBubble(particlesRef.current, agent.x, agent.y, TILE_SIZE)
        }
      }

      // Particles
      particlesRef.current = updateParticles(particlesRef.current, dt)
      drawParticles(ctx, particlesRef.current, now)

      resetTransform(ctx)

      // Minimap data (every 30 frames)
      if (frameCountRef.current % 30 === 0) {
        const data = []
        for (const [id, a] of updatedAgents) {
          data.push({ id, x: a.x, y: a.y, color: CHARACTER_COLORS[a.agentType] || '#FFD700' })
        }
        setMinimapAgents(data)
        setCameraBounds(bounds)
      }

      animFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animFrameRef.current = requestAnimationFrame(gameLoop)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [])

  // Keyboard: WASD + ESC + Control Groups
  useEffect(() => {
    const onDown = (e) => {
      const k = e.key.toLowerCase()
      if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) {
        keysRef.current.add(k); return
      }
      if (e.key === 'Escape') { setSelectedAgents(clearSelection()); return }
      handleControlGroupKey(e, controlGroups, selectedAgentsRef.current,
        (s) => setSelectedAgents(s), setControlGroups, (m) => setToast(m))
    }
    const onUp = (e) => keysRef.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp) }
  }, [controlGroups])

  // Scroll zoom disabled — let page scroll naturally

  // Mouse handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2 || e.button === 1) {
      e.preventDefault(); isPanningRef.current = true
      lastPanPosRef.current = { x: e.clientX, y: e.clientY }; return
    }
    const c = canvasRef.current
    if (!c || !pointerRef.current) return
    const r = c.getBoundingClientRect()
    const sx = (e.clientX - r.left) * (CANVAS_WIDTH / r.width)
    const sy = (e.clientY - r.top) * (CANVAS_HEIGHT / r.height)
    const w = screenToWorld(cameraRef.current, sx, sy, CANVAS_WIDTH, CANVAS_HEIGHT)
    pointerRef.current.handleMouseDown(e, sx, sy, w.tileX, w.tileY)
  }, [])

  const handleMouseUp = useCallback((e) => {
    if (e.button === 2 || e.button === 1) {
      isPanningRef.current = false; lastPanPosRef.current = null; return
    }
    const c = canvasRef.current
    if (!c || !pointerRef.current) return
    const r = c.getBoundingClientRect()
    const sx = (e.clientX - r.left) * (CANVAS_WIDTH / r.width)
    const sy = (e.clientY - r.top) * (CANVAS_HEIGHT / r.height)
    const w = screenToWorld(cameraRef.current, sx, sy, CANVAS_WIDTH, CANVAS_HEIGHT)
    pointerRef.current.handleMouseUp(e, sx, sy, w.tileX, w.tileY, e.ctrlKey || e.metaKey)
  }, [])

  const handleMouseMove = useCallback((e) => {
    const c = canvasRef.current
    if (!c) return
    const r = c.getBoundingClientRect()

    if (isPanningRef.current && lastPanPosRef.current) {
      const cam = cameraRef.current
      const ppt = cam.zoom * TILE_SIZE * 2 * (r.width / CANVAS_WIDTH)
      cameraRef.current = panCamera(cam,
        -(e.clientX - lastPanPosRef.current.x) / ppt,
        -(e.clientY - lastPanPosRef.current.y) / ppt)
      lastPanPosRef.current = { x: e.clientX, y: e.clientY }
      c.style.cursor = 'grabbing'; return
    }

    if (pointerRef.current) {
      const sx = (e.clientX - r.left) * (CANVAS_WIDTH / r.width)
      const sy = (e.clientY - r.top) * (CANVAS_HEIGHT / r.height)
      const w = screenToWorld(cameraRef.current, sx, sy, CANVAS_WIDTH, CANVAS_HEIGHT)
      pointerRef.current.handleMouseMove(e, sx, sy, w.tileX, w.tileY)
      const st = pointerRef.current.getState()
      c.style.cursor = st === 'DRAGGING' ? 'crosshair'
        : hoveredAgentRef.current ? 'pointer' : 'default'
    }
  }, [])

  const handleContextMenu = useCallback((e) => e.preventDefault(), [])
  const handleToastDismiss = useCallback(() => setToast(null), [])

  const handleMinimapClick = useCallback((pos) => {
    cameraRef.current = setCameraTarget(cameraRef.current, pos.tileX, pos.tileY)
  }, [])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-full rounded-lg border border-white/10"
        style={{ touchAction: 'none' }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />

      <SelectionBox dragBox={dragBox} />

      {selectedAgents.size > 0 && (
        <div className="absolute top-4 left-4 z-10 page-enter">
          <SelectionPanel
            selectedAgents={selectedAgents}
            teams={teams}
            onDeselectAll={() => setSelectedAgents(clearSelection())}
            onSelectAll={() => {
              const ids = teams.flatMap(t => (t.members || []).map(m => m.agentId))
              setSelectedAgents(new Set(ids))
            }}
          />
        </div>
      )}

      {toast && (
        <div className="absolute top-4 right-4 z-20">
          <Toast message={toast} onDismiss={handleToastDismiss} />
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-10">
        <KeyboardHints />
      </div>
    </div>
  )
}
