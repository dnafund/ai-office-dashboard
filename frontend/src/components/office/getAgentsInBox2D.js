// getAgentsInBox2D — Find agents within a screen-space selection box
// Converts screen coordinates to world tile coordinates using the camera

import { screenToWorld } from './Camera.js'

export function getAgentsInBox2D(agents, camera, canvasW, canvasH, boxStart, boxEnd) {
  const topLeft = screenToWorld(
    camera,
    Math.min(boxStart.x, boxEnd.x),
    Math.min(boxStart.y, boxEnd.y),
    canvasW,
    canvasH
  )
  const bottomRight = screenToWorld(
    camera,
    Math.max(boxStart.x, boxEnd.x),
    Math.max(boxStart.y, boxEnd.y),
    canvasW,
    canvasH
  )

  const selected = []
  for (const agent of agents.values()) {
    const agentCX = agent.x + 0.5
    const agentCY = agent.y + 0.5

    if (agentCX >= topLeft.tileX && agentCX <= bottomRight.tileX &&
        agentCY >= topLeft.tileY && agentCY <= bottomRight.tileY) {
      const agentId = agent.id
      selected.push(agentId)
    }
  }

  return selected
}
