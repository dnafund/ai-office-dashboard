import { useRef, useEffect, useState, useCallback } from 'react'
import { drawTileMap, TILE_SIZE, MAP_WIDTH, MAP_HEIGHT } from './TileMap.js'
import { drawAgent, drawAgentLabel } from './SpriteSheet.js'
import { createAgent, updateAgent, updateAgentFromTeamData } from './Agent.js'
import { ROOMS } from './TileMap.js'

const SCALE = 2
const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE * SCALE
const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE * SCALE

export function OfficeCanvas({ teams, roomOverride, onAgentHover, onAgentClick }) {
  const canvasRef = useRef(null)
  const agentsRef = useRef(new Map())
  const animFrameRef = useRef(null)
  const [hoveredAgent, setHoveredAgent] = useState(null)

  // Sync agents from team data
  useEffect(() => {
    const currentAgents = agentsRef.current
    const seenIds = new Set()

    let memberIndex = 0
    for (const team of teams) {
      for (const member of team.members) {
        seenIds.add(member.agentId)
        const existing = currentAgents.get(member.agentId)

        if (existing) {
          currentAgents.set(
            member.agentId,
            updateAgentFromTeamData(existing, member)
          )
        } else {
          currentAgents.set(
            member.agentId,
            createAgent(member, memberIndex)
          )
        }
        memberIndex++
      }
    }

    // Remove agents no longer in teams
    for (const id of currentAgents.keys()) {
      if (!seenIds.has(id)) {
        currentAgents.delete(id)
      }
    }
  }, [teams])

  // React to room override changes — move all agents to target room
  useEffect(() => {
    const agents = agentsRef.current
    if (agents.size === 0) return

    for (const [id, agent] of agents) {
      // Re-run updateAgentFromTeamData which now uses globalRoomOverride
      const fakeTeamMember = {
        agentId: agent.id,
        name: agent.name,
        agentType: agent.agentType,
        model: agent.model,
        isActive: agent.isActive,
      }
      agents.set(id, updateAgentFromTeamData(agent, fakeTeamMember))
    }
  }, [roomOverride])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTime = performance.now()

    function gameLoop(now) {
      const dt = Math.min((now - lastTime) / 16.67, 3) // cap at 3x speed
      lastTime = now

      // Update agents
      const agents = agentsRef.current
      for (const [id, agent] of agents) {
        agents.set(id, updateAgent(agent, dt))
      }

      // Clear
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      // Draw tilemap
      drawTileMap(ctx, SCALE)

      // Draw agents
      const agentSize = TILE_SIZE * SCALE
      for (const agent of agents.values()) {
        const px = agent.x * TILE_SIZE * SCALE
        const py = agent.y * TILE_SIZE * SCALE

        drawAgent(
          ctx,
          px,
          py,
          agentSize,
          agent.agentType,
          agent.direction,
          agent.frame,
          agent.isActive
        )
        drawAgentLabel(ctx, px, py, agentSize, agent.name, agent.agentType, SCALE)
      }

      // Hover highlight
      if (hoveredAgent) {
        const agent = agents.get(hoveredAgent)
        if (agent) {
          const px = agent.x * TILE_SIZE * SCALE
          const py = agent.y * TILE_SIZE * SCALE
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
          ctx.lineWidth = 2
          ctx.strokeRect(px - 2, py - 2, agentSize + 4, agentSize + 4)
        }
      }

      animFrameRef.current = requestAnimationFrame(gameLoop)
    }

    animFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [hoveredAgent])

  // Mouse interaction
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    const agentSize = TILE_SIZE * SCALE
    let found = null

    for (const agent of agentsRef.current.values()) {
      const px = agent.x * TILE_SIZE * SCALE
      const py = agent.y * TILE_SIZE * SCALE

      if (mx >= px && mx <= px + agentSize && my >= py && my <= py + agentSize) {
        found = agent
        break
      }
    }

    setHoveredAgent(found?.id ?? null)
    onAgentHover?.(found)
    canvas.style.cursor = found ? 'pointer' : 'default'
  }, [onAgentHover])

  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_WIDTH / rect.width
    const scaleY = CANVAS_HEIGHT / rect.height
    const mx = (e.clientX - rect.left) * scaleX
    const my = (e.clientY - rect.top) * scaleY

    const agentSize = TILE_SIZE * SCALE

    for (const agent of agentsRef.current.values()) {
      const px = agent.x * TILE_SIZE * SCALE
      const py = agent.y * TILE_SIZE * SCALE

      if (mx >= px && mx <= px + agentSize && my >= py && my <= py + agentSize) {
        onAgentClick?.(agent)
        return
      }
    }
    onAgentClick?.(null)
  }, [onAgentClick])

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-auto rounded-lg border border-white/10"
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
    </div>
  )
}
