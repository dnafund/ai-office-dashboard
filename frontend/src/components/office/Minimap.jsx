import { useRef, useEffect, useCallback } from 'react'
import { ROOMS, MAP_WIDTH, MAP_HEIGHT } from './TileMap.js'

const MINIMAP_W = 200
const MINIMAP_H = Math.round(MINIMAP_W * (MAP_HEIGHT / MAP_WIDTH))

// Room colors matching TileMap floor tones
const ROOM_COLORS = {
  'War Room': '#2a1a3e',
  'Code Lab': '#1a2e1a',
  'Library': '#2e1a1a',
  'QA Room': '#1a1a3e',
  'Lounge': '#2e2e1a',
}

function tileToMinimap(tileX, tileY) {
  return {
    x: (tileX / MAP_WIDTH) * MINIMAP_W,
    y: (tileY / MAP_HEIGHT) * MINIMAP_H,
  }
}

export function Minimap({ agents = [], selectedAgents, cameraState, onMinimapClick }) {
  const canvasRef = useRef(null)

  // Render minimap
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.fillStyle = '#0a0a10'
    ctx.fillRect(0, 0, MINIMAP_W, MINIMAP_H)

    // Draw rooms
    for (const [name, room] of Object.entries(ROOMS)) {
      const { bounds } = room
      const topLeft = tileToMinimap(bounds.x, bounds.y)
      const size = tileToMinimap(bounds.x + bounds.w, bounds.y + bounds.h)

      ctx.fillStyle = ROOM_COLORS[name] || '#1a1a2e'
      ctx.fillRect(topLeft.x, topLeft.y, size.x - topLeft.x, size.y - topLeft.y)

      // Room border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(topLeft.x, topLeft.y, size.x - topLeft.x, size.y - topLeft.y)
    }

    // Draw agent dots
    for (const agent of agents) {
      const pos = tileToMinimap(agent.x + 0.5, agent.y + 0.5)
      const isSelected = selectedAgents?.has(agent.id)

      // Dot
      ctx.fillStyle = isSelected ? '#00FF88' : (agent.color || '#FFD700')
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, isSelected ? 3 : 2, 0, Math.PI * 2)
      ctx.fill()

      // Selection ring
      if (isSelected) {
        ctx.strokeStyle = '#00FF88'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // Camera viewport rectangle
    if (cameraState) {
      const { minTileX, minTileY, maxTileX, maxTileY } = cameraState
      const tl = tileToMinimap(Math.max(0, minTileX), Math.max(0, minTileY))
      const br = tileToMinimap(Math.min(MAP_WIDTH, maxTileX), Math.min(MAP_HEIGHT, maxTileY))

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y)
    }
  }, [agents, selectedAgents, cameraState])

  // Click to pan camera
  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (MINIMAP_W / rect.width)
    const my = (e.clientY - rect.top) * (MINIMAP_H / rect.height)

    const tileX = (mx / MINIMAP_W) * MAP_WIDTH
    const tileY = (my / MINIMAP_H) * MAP_HEIGHT

    onMinimapClick?.({ tileX, tileY })
  }, [onMinimapClick])

  return (
    <canvas
      ref={canvasRef}
      width={MINIMAP_W}
      height={MINIMAP_H}
      className="rounded-lg border border-white/20 cursor-crosshair"
      style={{ background: '#0a0a10' }}
      onClick={handleClick}
    />
  )
}
