// AmbientEffects — Subtle visual atmosphere for the 2D office
// Floating dust motes, light rays, and desk lamp glow

const DUST_COUNT = 35
const RAY_COUNT = 3

export function createAmbientState() {
  // Generate dust motes with random positions and drift speeds
  const dust = []
  for (let i = 0; i < DUST_COUNT; i++) {
    dust.push({
      x: Math.random(),
      y: Math.random(),
      size: 0.3 + Math.random() * 0.8,
      speed: 0.0001 + Math.random() * 0.0003,
      drift: (Math.random() - 0.5) * 0.0002,
      alpha: 0.03 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
    })
  }

  // Light rays from top-right
  const rays = []
  for (let i = 0; i < RAY_COUNT; i++) {
    rays.push({
      x: 0.6 + i * 0.15,
      width: 0.03 + Math.random() * 0.04,
      alpha: 0.015 + Math.random() * 0.01,
      phase: Math.random() * Math.PI * 2,
    })
  }

  return { dust, rays }
}

export function updateAmbient(state, dt) {
  const speed = dt * 0.5
  const newDust = state.dust.map((d) => {
    let y = d.y - d.speed * speed
    let x = d.x + d.drift * speed + Math.sin(d.phase + y * 10) * 0.00005
    if (y < -0.02) { y = 1.02; x = Math.random() }
    if (x < -0.02) x = 1.02
    if (x > 1.02) x = -0.02
    return { ...d, x, y }
  })

  return { ...state, dust: newDust }
}

export function drawAmbientEffects(ctx, state, canvasW, canvasH, time) {
  ctx.save()

  // Floating dust motes
  for (const d of state.dust) {
    const screenX = d.x * canvasW
    const screenY = d.y * canvasH
    const flicker = 1 + Math.sin(time * 0.001 + d.phase) * 0.3

    ctx.globalAlpha = d.alpha * flicker
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(screenX, screenY, d.size, 0, Math.PI * 2)
    ctx.fill()
  }

  // Light rays from top-right
  for (const ray of state.rays) {
    const brightness = ray.alpha * (0.7 + Math.sin(time * 0.0005 + ray.phase) * 0.3)
    ctx.globalAlpha = brightness

    const gradient = ctx.createLinearGradient(
      canvasW * ray.x, 0,
      canvasW * (ray.x - 0.3), canvasH
    )
    gradient.addColorStop(0, 'rgba(255, 255, 220, 0.8)')
    gradient.addColorStop(0.5, 'rgba(255, 255, 220, 0.3)')
    gradient.addColorStop(1, 'rgba(255, 255, 220, 0)')

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.moveTo(canvasW * ray.x, 0)
    ctx.lineTo(canvasW * (ray.x + ray.width), 0)
    ctx.lineTo(canvasW * (ray.x - 0.3 + ray.width), canvasH)
    ctx.lineTo(canvasW * (ray.x - 0.3), canvasH)
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}
