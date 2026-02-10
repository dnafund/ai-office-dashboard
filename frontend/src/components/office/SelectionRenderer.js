// SelectionRenderer — Canvas-based selection effects for 2D office view
// Draws selection rings, hover highlights, and task status dots

import { TILE_SIZE } from './TileMap.js'

const TASK_STATUS_COLORS = {
  pending: '#EAB308',
  in_progress: '#3B82F6',
  completed: '#10B981',
  blocked: '#EF4444',
}

export function drawSelectionRing(ctx, agent, time) {
  const px = agent.x * TILE_SIZE + TILE_SIZE / 2
  const py = agent.y * TILE_SIZE + TILE_SIZE / 2
  const radius = TILE_SIZE * 0.55

  ctx.save()
  ctx.strokeStyle = '#00FF88'
  ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.7 + Math.sin(time * 0.005) * 0.3

  // Animated dashed ring
  ctx.setLineDash([4, 3])
  ctx.lineDashOffset = -time * 0.02

  ctx.beginPath()
  ctx.arc(px, py, radius, 0, Math.PI * 2)
  ctx.stroke()

  ctx.setLineDash([])
  ctx.restore()
}

export function drawHoverHighlight(ctx, agent) {
  const px = agent.x * TILE_SIZE
  const py = agent.y * TILE_SIZE

  ctx.save()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
  ctx.lineWidth = 1

  // Soft glow box
  ctx.shadowColor = 'rgba(255, 255, 255, 0.3)'
  ctx.shadowBlur = 6
  ctx.strokeRect(px - 1, py - 1, TILE_SIZE + 2, TILE_SIZE + 2)

  ctx.restore()
}

export function drawTaskDot(ctx, agent, taskStatus, time) {
  if (!taskStatus) return

  const color = TASK_STATUS_COLORS[taskStatus] || TASK_STATUS_COLORS.pending
  const cx = agent.x * TILE_SIZE + TILE_SIZE / 2
  const cy = agent.y * TILE_SIZE - 4
  const pulse = 2.5 + Math.sin(time * 0.004) * 0.8

  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha = 0.8 + Math.sin(time * 0.006) * 0.2

  ctx.beginPath()
  ctx.arc(cx, cy, pulse, 0, Math.PI * 2)
  ctx.fill()

  // Bright center
  ctx.fillStyle = '#FFFFFF'
  ctx.globalAlpha = 0.6
  ctx.beginPath()
  ctx.arc(cx, cy, pulse * 0.4, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

export { TASK_STATUS_COLORS }
