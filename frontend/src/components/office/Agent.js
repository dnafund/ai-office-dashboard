// Agent entity - manages position, state, and animation

import { ROOMS } from './TileMap.js'

const AGENT_ROOM_MAP = {
  controller: 'War Room',
  Plan: 'War Room',
  'general-purpose': 'Code Lab',
  Explore: 'Library',
  'code-reviewer': 'QA Room',
  'security-reviewer': 'QA Room',
  'go-reviewer': 'QA Room',
  'python-reviewer': 'QA Room',
  tester: 'QA Room',
  'e2e-runner': 'QA Room',
}

const IDLE_ROOM = 'Lounge'
const MOVE_SPEED = 0.03 // tiles per frame

// Global override: set to a room name to make ALL agents go there
let globalRoomOverride = null

export function setGlobalRoomOverride(roomName) {
  globalRoomOverride = roomName
}

export function getGlobalRoomOverride() {
  return globalRoomOverride
}

export function getAgentRoom(member) {
  if (globalRoomOverride) return globalRoomOverride
  return AGENT_ROOM_MAP[member.agentType] ?? IDLE_ROOM
}

export function createAgent(member, index) {
  const roomName = getAgentRoom(member)
  const room = ROOMS[roomName] ?? ROOMS[IDLE_ROOM]

  // Pick a spawn point based on index
  const spawnPoints = room.spawnPoints
  const spawn = spawnPoints[index % spawnPoints.length]

  return {
    id: member.agentId,
    name: member.name,
    agentType: member.agentType,
    model: member.model ?? 'sonnet',
    isActive: member.isActive ?? true,
    room: roomName,

    // Position in tile coordinates
    x: spawn.x + (Math.random() * 0.5 - 0.25),
    y: spawn.y + (Math.random() * 0.5 - 0.25),

    // Target position for movement
    targetX: spawn.x,
    targetY: spawn.y,

    // Animation state
    direction: 0, // 0=down, 1=left, 2=right, 3=up
    frame: 0,
    frameTimer: 0,
    isMoving: false,

    // Idle behavior
    idleTimer: Math.random() * 200 + 100,
    wanderCooldown: 0,
  }
}

export function updateAgent(agent, dt) {
  const dx = agent.targetX - agent.x
  const dy = agent.targetY - agent.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist > 0.05) {
    // Moving toward target
    const speed = MOVE_SPEED * dt
    const nx = dx / dist
    const ny = dy / dist

    const newX = agent.x + nx * Math.min(speed, dist)
    const newY = agent.y + ny * Math.min(speed, dist)

    // Determine direction
    let direction = agent.direction
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 2 : 1 // right or left
    } else {
      direction = dy > 0 ? 0 : 3 // down or up
    }

    // Walk animation
    const frameTimer = agent.frameTimer + dt
    const frame = frameTimer > 10 ? (agent.frame + 1) % 3 : agent.frame
    const newFrameTimer = frameTimer > 10 ? 0 : frameTimer

    return {
      ...agent,
      x: newX,
      y: newY,
      direction,
      frame,
      frameTimer: newFrameTimer,
      isMoving: true,
    }
  }

  // Idle behavior - occasionally wander
  const wanderCooldown = agent.wanderCooldown - 1
  if (wanderCooldown <= 0) {
    const room = ROOMS[agent.room] ?? ROOMS[IDLE_ROOM]
    const bounds = room.bounds

    // Pick a random point within the room
    const newTargetX = bounds.x + 1 + Math.random() * (bounds.w - 2)
    const newTargetY = bounds.y + 1 + Math.random() * (bounds.h - 2)

    return {
      ...agent,
      targetX: newTargetX,
      targetY: newTargetY,
      wanderCooldown: 150 + Math.random() * 300,
      isMoving: false,
      frame: 0,
    }
  }

  return {
    ...agent,
    wanderCooldown,
    isMoving: false,
    frame: 0,
  }
}

export function updateAgentFromTeamData(agent, member) {
  const newRoom = getAgentRoom(member)

  if (newRoom !== agent.room) {
    // Agent changed rooms — walk to new room (set target, don't teleport)
    const room = ROOMS[newRoom] ?? ROOMS[IDLE_ROOM]
    const spawnPoints = room.spawnPoints
    const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)]
    return {
      ...agent,
      agentType: member.agentType,
      model: member.model ?? agent.model,
      isActive: member.isActive ?? true,
      room: newRoom,
      targetX: spawn.x + (Math.random() * 0.8 - 0.4),
      targetY: spawn.y + (Math.random() * 0.8 - 0.4),
      wanderCooldown: 50,
    }
  }

  return {
    ...agent,
    agentType: member.agentType,
    model: member.model ?? agent.model,
    isActive: member.isActive ?? true,
  }
}

export { AGENT_ROOM_MAP, IDLE_ROOM }
