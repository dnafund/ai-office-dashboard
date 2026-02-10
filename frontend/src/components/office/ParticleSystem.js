// ParticleSystem — Lightweight immutable particle system for 2D canvas
// All functions return new state, no mutation

const MAX_PARTICLES = 200

const TYPING_COLORS = ['#FFD700', '#00FF88', '#3B82F6', '#A78BFA']
const SPAWN_COLOR = '#FFFFFF'

export function createParticleSystem() {
  return { particles: [] }
}

function createParticle(x, y, vx, vy, life, size, color, type) {
  return { x, y, vx, vy, life, maxLife: life, size, color, type, alpha: 1 }
}

export function updateParticles(system, dt) {
  const speed = dt * 0.5
  const alive = []

  for (const p of system.particles) {
    const nextLife = p.life - speed
    if (nextLife <= 0) continue

    alive.push({
      ...p,
      x: p.x + p.vx * speed,
      y: p.y + p.vy * speed,
      vy: p.type === 'thought' ? p.vy : p.vy - 0.01 * speed, // gentle float up
      life: nextLife,
      alpha: Math.min(1, nextLife / (p.maxLife * 0.3)), // fade near end
    })
  }

  return { particles: alive }
}

export function emitTypingParticles(system, agentX, agentY, tileSize) {
  const cx = agentX * tileSize + tileSize * 0.5
  const cy = agentY * tileSize + tileSize * 0.3

  const newParticles = []
  for (let i = 0; i < 2; i++) {
    const color = TYPING_COLORS[Math.floor(Math.random() * TYPING_COLORS.length)]
    newParticles.push(createParticle(
      cx + (Math.random() - 0.5) * tileSize * 0.4,
      cy,
      (Math.random() - 0.5) * 0.3,
      -(Math.random() * 0.5 + 0.3),
      20 + Math.random() * 15,
      1 + Math.random() * 1.5,
      color,
      'sparkle'
    ))
  }

  const combined = [...system.particles, ...newParticles]
  return { particles: combined.length > MAX_PARTICLES ? combined.slice(-MAX_PARTICLES) : combined }
}

export function emitThoughtBubble(system, agentX, agentY, tileSize) {
  const cx = agentX * tileSize + tileSize * 0.5
  const cy = agentY * tileSize - 2

  const bubble = createParticle(
    cx,
    cy,
    0,
    -0.15,
    80,
    4,
    '#FFFFFF',
    'thought'
  )

  const combined = [...system.particles, bubble]
  return { particles: combined.length > MAX_PARTICLES ? combined.slice(-MAX_PARTICLES) : combined }
}

export function emitSpawnPoof(system, agentX, agentY, tileSize) {
  const cx = agentX * tileSize + tileSize * 0.5
  const cy = agentY * tileSize + tileSize * 0.5

  const newParticles = []
  for (let i = 0; i < 15; i++) {
    const angle = (Math.PI * 2 * i) / 15
    const speed = 0.5 + Math.random() * 0.8
    newParticles.push(createParticle(
      cx,
      cy,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      15 + Math.random() * 10,
      1.5 + Math.random() * 2,
      SPAWN_COLOR,
      'poof'
    ))
  }

  const combined = [...system.particles, ...newParticles]
  return { particles: combined.length > MAX_PARTICLES ? combined.slice(-MAX_PARTICLES) : combined }
}

export function emitDespawnFade(system, agentX, agentY, tileSize) {
  const cx = agentX * tileSize + tileSize * 0.5
  const cy = agentY * tileSize + tileSize * 0.5

  const newParticles = []
  for (let i = 0; i < 8; i++) {
    newParticles.push(createParticle(
      cx + (Math.random() - 0.5) * tileSize * 0.6,
      cy + (Math.random() - 0.5) * tileSize * 0.3,
      (Math.random() - 0.5) * 0.2,
      -(Math.random() * 0.4 + 0.2),
      20 + Math.random() * 15,
      1 + Math.random() * 1.5,
      'rgba(255, 255, 255, 0.6)',
      'fade'
    ))
  }

  const combined = [...system.particles, ...newParticles]
  return { particles: combined.length > MAX_PARTICLES ? combined.slice(-MAX_PARTICLES) : combined }
}

export function drawParticles(ctx, system, time) {
  for (const p of system.particles) {
    ctx.save()
    ctx.globalAlpha = p.alpha

    if (p.type === 'thought') {
      // Thought bubble: small ellipse with "..."
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.size * 2.5, p.size * 1.5, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.font = `${p.size * 1.8}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('...', p.x, p.y)
    } else if (p.type === 'sparkle') {
      // 4-point star
      ctx.fillStyle = p.color
      const s = p.size * (p.life / p.maxLife)
      ctx.beginPath()
      ctx.moveTo(p.x, p.y - s * 1.5)
      ctx.lineTo(p.x + s * 0.5, p.y)
      ctx.lineTo(p.x, p.y + s * 1.5)
      ctx.lineTo(p.x - s * 0.5, p.y)
      ctx.closePath()
      ctx.fill()
    } else {
      // Circle particle (poof, fade)
      ctx.fillStyle = p.color
      const radius = p.size * (p.life / p.maxLife)
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(0.5, radius), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }
}
