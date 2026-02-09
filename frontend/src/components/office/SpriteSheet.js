// Cute pixel art sprite renderer — 5 character types
// Capybara, Penguin, Duck, Chicken, Human
// Each drawn programmatically on canvas with walk animation

// Character type assigned by agent role
const CHARACTER_MAP = {
  controller: 'capybara',
  Plan: 'capybara',
  'general-purpose': 'human',
  Explore: 'penguin',
  'code-reviewer': 'duck',
  'security-reviewer': 'duck',
  'go-reviewer': 'duck',
  'python-reviewer': 'duck',
  tester: 'chicken',
  'e2e-runner': 'chicken',
  architect: 'capybara',
  'build-error-resolver': 'human',
  'refactor-cleaner': 'human',
  'doc-updater': 'penguin',
}

// Color palettes per character (main, accent, detail, eye)
const PALETTES = {
  capybara: { body: '#A0714F', accent: '#C49A6C', belly: '#D4B896', eye: '#1a1a1a', nose: '#5C3D2E', cheek: '#E8A0A0' },
  penguin:  { body: '#2D3436', accent: '#FFFFFF', belly: '#F0F0F0', eye: '#1a1a1a', beak: '#F39C12', feet: '#F39C12' },
  duck:    { body: '#F1C40F', accent: '#F7DC6F', belly: '#FEF9E7', eye: '#1a1a1a', beak: '#E67E22', feet: '#E67E22' },
  chicken: { body: '#FDEBD0', accent: '#FFFFFF', belly: '#FFF5E6', eye: '#1a1a1a', beak: '#E67E22', comb: '#E74C3C', wattle: '#C0392B' },
  human:   { body: '#6C5CE7', accent: '#A29BFE', skin: '#FDBAA1', eye: '#1a1a1a', hair: '#5D4037', shoes: '#2D3436' },
}

const DEFAULT_CHARACTER = 'human'
const FRAME_COUNT = 3
const DIRECTIONS = 4

function getCharacterType(agentType) {
  return CHARACTER_MAP[agentType] ?? DEFAULT_CHARACTER
}

function getPalette(charType) {
  return PALETTES[charType] ?? PALETTES[DEFAULT_CHARACTER]
}

// Role-based accent colors for name tags
const ROLE_COLORS = {
  controller: { tag: '#8B5CF6', text: '#C4B5FD' },
  'general-purpose': { tag: '#10B981', text: '#6EE7B7' },
  Explore: { tag: '#F59E0B', text: '#FCD34D' },
  Plan: { tag: '#8B5CF6', text: '#C4B5FD' },
  'code-reviewer': { tag: '#3B82F6', text: '#93C5FD' },
  'security-reviewer': { tag: '#EF4444', text: '#FCA5A5' },
  tester: { tag: '#EF4444', text: '#FCA5A5' },
  default: { tag: '#6B7280', text: '#D1D5DB' },
}

function getRoleColor(agentType) {
  return ROLE_COLORS[agentType] ?? ROLE_COLORS.default
}

// ─── Draw helpers ────────────────────────────────────────────

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

function circle(ctx, cx, cy, r) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
}

function ellipse(ctx, cx, cy, rx, ry) {
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}

// ─── CAPYBARA ────────────────────────────────────────────────

function drawCapybara(ctx, x, y, s, dir, frame, isActive) {
  const p = PALETTES.capybara
  const walkY = frame === 1 ? -1 : frame === 2 ? 1 : 0

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ellipse(ctx, x + s * 0.5, y + s * 0.92, s * 0.28, s * 0.06)

  // Ears (round, on top of head)
  ctx.fillStyle = p.body
  circle(ctx, x + s * 0.32, y + s * 0.18 + walkY, s * 0.08)
  circle(ctx, x + s * 0.68, y + s * 0.18 + walkY, s * 0.08)
  // Inner ear
  ctx.fillStyle = p.cheek
  circle(ctx, x + s * 0.32, y + s * 0.18 + walkY, s * 0.04)
  circle(ctx, x + s * 0.68, y + s * 0.18 + walkY, s * 0.04)

  // Body (chunky, round)
  ctx.fillStyle = p.body
  roundedRect(ctx, x + s * 0.2, y + s * 0.45 + walkY, s * 0.6, s * 0.38, s * 0.12)

  // Belly
  ctx.fillStyle = p.belly
  roundedRect(ctx, x + s * 0.28, y + s * 0.52 + walkY, s * 0.44, s * 0.26, s * 0.08)

  // Head (big round capybara face)
  ctx.fillStyle = p.body
  circle(ctx, x + s * 0.5, y + s * 0.32 + walkY, s * 0.2)

  // Snout
  ctx.fillStyle = p.accent
  ellipse(ctx, x + s * 0.5, y + s * 0.38 + walkY, s * 0.12, s * 0.07)

  // Nose
  ctx.fillStyle = p.nose
  ellipse(ctx, x + s * 0.5, y + s * 0.34 + walkY, s * 0.04, s * 0.03)

  // Eyes
  ctx.fillStyle = p.eye
  if (dir === 0) { // down
    circle(ctx, x + s * 0.4, y + s * 0.28 + walkY, s * 0.035)
    circle(ctx, x + s * 0.6, y + s * 0.28 + walkY, s * 0.035)
    // Eye shine
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.41, y + s * 0.27 + walkY, s * 0.015)
    circle(ctx, x + s * 0.61, y + s * 0.27 + walkY, s * 0.015)
  } else if (dir === 1) { // left
    ctx.fillStyle = p.eye
    circle(ctx, x + s * 0.38, y + s * 0.28 + walkY, s * 0.035)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.37, y + s * 0.27 + walkY, s * 0.015)
  } else if (dir === 2) { // right
    ctx.fillStyle = p.eye
    circle(ctx, x + s * 0.62, y + s * 0.28 + walkY, s * 0.035)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.63, y + s * 0.27 + walkY, s * 0.015)
  }
  // up = no eyes

  // Cheek blush
  if (dir !== 3) {
    ctx.fillStyle = 'rgba(232, 160, 160, 0.4)'
    circle(ctx, x + s * 0.34, y + s * 0.34 + walkY, s * 0.035)
    circle(ctx, x + s * 0.66, y + s * 0.34 + walkY, s * 0.035)
  }

  // Legs
  ctx.fillStyle = p.body
  const legY = y + s * 0.8
  if (frame === 1) {
    roundedRect(ctx, x + s * 0.26, legY - 1, s * 0.14, s * 0.1, s * 0.03)
    roundedRect(ctx, x + s * 0.6, legY + 1, s * 0.14, s * 0.1, s * 0.03)
  } else if (frame === 2) {
    roundedRect(ctx, x + s * 0.26, legY + 1, s * 0.14, s * 0.1, s * 0.03)
    roundedRect(ctx, x + s * 0.6, legY - 1, s * 0.14, s * 0.1, s * 0.03)
  } else {
    roundedRect(ctx, x + s * 0.26, legY, s * 0.14, s * 0.1, s * 0.03)
    roundedRect(ctx, x + s * 0.6, legY, s * 0.14, s * 0.1, s * 0.03)
  }
}

// ─── PENGUIN ─────────────────────────────────────────────────

function drawPenguin(ctx, x, y, s, dir, frame, isActive) {
  const p = PALETTES.penguin
  const walkY = frame === 1 ? -1 : frame === 2 ? 1 : 0

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ellipse(ctx, x + s * 0.5, y + s * 0.92, s * 0.24, s * 0.06)

  // Body (oval, tall)
  ctx.fillStyle = p.body
  ellipse(ctx, x + s * 0.5, y + s * 0.55 + walkY, s * 0.24, s * 0.3)

  // White belly
  ctx.fillStyle = p.belly
  ellipse(ctx, x + s * 0.5, y + s * 0.58 + walkY, s * 0.16, s * 0.22)

  // Head
  ctx.fillStyle = p.body
  circle(ctx, x + s * 0.5, y + s * 0.26 + walkY, s * 0.18)

  // White face patch
  ctx.fillStyle = '#fff'
  circle(ctx, x + s * 0.5, y + s * 0.28 + walkY, s * 0.12)

  // Eyes
  ctx.fillStyle = p.eye
  if (dir === 0) {
    circle(ctx, x + s * 0.42, y + s * 0.24 + walkY, s * 0.03)
    circle(ctx, x + s * 0.58, y + s * 0.24 + walkY, s * 0.03)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.43, y + s * 0.235 + walkY, s * 0.012)
    circle(ctx, x + s * 0.59, y + s * 0.235 + walkY, s * 0.012)
  } else if (dir === 1) {
    ctx.fillStyle = p.eye
    circle(ctx, x + s * 0.4, y + s * 0.24 + walkY, s * 0.03)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.39, y + s * 0.235 + walkY, s * 0.012)
  } else if (dir === 2) {
    ctx.fillStyle = p.eye
    circle(ctx, x + s * 0.6, y + s * 0.24 + walkY, s * 0.03)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.61, y + s * 0.235 + walkY, s * 0.012)
  }

  // Beak
  ctx.fillStyle = p.beak
  if (dir === 0) {
    // Triangle beak pointing down
    ctx.beginPath()
    ctx.moveTo(x + s * 0.46, y + s * 0.3 + walkY)
    ctx.lineTo(x + s * 0.54, y + s * 0.3 + walkY)
    ctx.lineTo(x + s * 0.5, y + s * 0.36 + walkY)
    ctx.closePath()
    ctx.fill()
  } else if (dir === 1) {
    ctx.beginPath()
    ctx.moveTo(x + s * 0.4, y + s * 0.28 + walkY)
    ctx.lineTo(x + s * 0.32, y + s * 0.31 + walkY)
    ctx.lineTo(x + s * 0.4, y + s * 0.34 + walkY)
    ctx.closePath()
    ctx.fill()
  } else if (dir === 2) {
    ctx.beginPath()
    ctx.moveTo(x + s * 0.6, y + s * 0.28 + walkY)
    ctx.lineTo(x + s * 0.68, y + s * 0.31 + walkY)
    ctx.lineTo(x + s * 0.6, y + s * 0.34 + walkY)
    ctx.closePath()
    ctx.fill()
  }

  // Wings (flippers)
  ctx.fillStyle = p.body
  const wingFlap = frame === 1 ? -2 : frame === 2 ? 2 : 0
  // Left wing
  ellipse(ctx, x + s * 0.24, y + s * 0.52 + walkY + wingFlap, s * 0.06, s * 0.14)
  // Right wing
  ellipse(ctx, x + s * 0.76, y + s * 0.52 + walkY - wingFlap, s * 0.06, s * 0.14)

  // Feet
  ctx.fillStyle = p.feet
  if (frame === 1) {
    ellipse(ctx, x + s * 0.38, y + s * 0.88, s * 0.07, s * 0.03)
    ellipse(ctx, x + s * 0.65, y + s * 0.86, s * 0.07, s * 0.03)
  } else if (frame === 2) {
    ellipse(ctx, x + s * 0.35, y + s * 0.86, s * 0.07, s * 0.03)
    ellipse(ctx, x + s * 0.62, y + s * 0.88, s * 0.07, s * 0.03)
  } else {
    ellipse(ctx, x + s * 0.38, y + s * 0.87, s * 0.07, s * 0.03)
    ellipse(ctx, x + s * 0.62, y + s * 0.87, s * 0.07, s * 0.03)
  }

  // Rosy cheeks
  if (dir !== 3) {
    ctx.fillStyle = 'rgba(255, 150, 150, 0.35)'
    circle(ctx, x + s * 0.36, y + s * 0.3 + walkY, s * 0.03)
    circle(ctx, x + s * 0.64, y + s * 0.3 + walkY, s * 0.03)
  }
}

// ─── DUCK ────────────────────────────────────────────────────

function drawDuck(ctx, x, y, s, dir, frame, isActive) {
  const p = PALETTES.duck
  const walkY = frame === 1 ? -1 : frame === 2 ? 1 : 0

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ellipse(ctx, x + s * 0.5, y + s * 0.92, s * 0.26, s * 0.06)

  // Tail feathers
  ctx.fillStyle = p.body
  if (dir === 1) {
    ellipse(ctx, x + s * 0.72, y + s * 0.52 + walkY, s * 0.08, s * 0.06)
  } else if (dir === 2) {
    ellipse(ctx, x + s * 0.28, y + s * 0.52 + walkY, s * 0.08, s * 0.06)
  } else {
    ellipse(ctx, x + s * 0.5, y + s * 0.42 + walkY, s * 0.08, s * 0.06)
  }

  // Body (plump)
  ctx.fillStyle = p.body
  ellipse(ctx, x + s * 0.5, y + s * 0.58 + walkY, s * 0.26, s * 0.24)

  // Belly highlight
  ctx.fillStyle = p.belly
  ellipse(ctx, x + s * 0.5, y + s * 0.62 + walkY, s * 0.18, s * 0.16)

  // Wings
  ctx.fillStyle = p.accent
  const wingBob = frame === 1 ? -1 : frame === 2 ? 1 : 0
  ellipse(ctx, x + s * 0.28, y + s * 0.55 + walkY + wingBob, s * 0.08, s * 0.13)
  ellipse(ctx, x + s * 0.72, y + s * 0.55 + walkY - wingBob, s * 0.08, s * 0.13)

  // Head
  ctx.fillStyle = p.body
  circle(ctx, x + s * 0.5, y + s * 0.3 + walkY, s * 0.16)

  // Eyes
  ctx.fillStyle = p.eye
  if (dir === 0) {
    circle(ctx, x + s * 0.42, y + s * 0.26 + walkY, s * 0.03)
    circle(ctx, x + s * 0.58, y + s * 0.26 + walkY, s * 0.03)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.43, y + s * 0.255 + walkY, s * 0.013)
    circle(ctx, x + s * 0.59, y + s * 0.255 + walkY, s * 0.013)
  } else if (dir === 1) {
    ctx.fillStyle = p.eye
    circle(ctx, x + s * 0.4, y + s * 0.26 + walkY, s * 0.03)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.39, y + s * 0.255 + walkY, s * 0.013)
  } else if (dir === 2) {
    ctx.fillStyle = p.eye
    circle(ctx, x + s * 0.6, y + s * 0.26 + walkY, s * 0.03)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.61, y + s * 0.255 + walkY, s * 0.013)
  }

  // Beak (flat duck bill)
  ctx.fillStyle = p.beak
  if (dir === 0) {
    roundedRect(ctx, x + s * 0.4, y + s * 0.33 + walkY, s * 0.2, s * 0.06, s * 0.02)
  } else if (dir === 1) {
    roundedRect(ctx, x + s * 0.26, y + s * 0.3 + walkY, s * 0.18, s * 0.06, s * 0.02)
  } else if (dir === 2) {
    roundedRect(ctx, x + s * 0.56, y + s * 0.3 + walkY, s * 0.18, s * 0.06, s * 0.02)
  }

  // Feet
  ctx.fillStyle = p.feet
  if (frame === 1) {
    ellipse(ctx, x + s * 0.38, y + s * 0.88, s * 0.07, s * 0.03)
    ellipse(ctx, x + s * 0.65, y + s * 0.86, s * 0.07, s * 0.03)
  } else if (frame === 2) {
    ellipse(ctx, x + s * 0.35, y + s * 0.86, s * 0.07, s * 0.03)
    ellipse(ctx, x + s * 0.62, y + s * 0.88, s * 0.07, s * 0.03)
  } else {
    ellipse(ctx, x + s * 0.38, y + s * 0.87, s * 0.07, s * 0.03)
    ellipse(ctx, x + s * 0.62, y + s * 0.87, s * 0.07, s * 0.03)
  }

  // Cheeks
  if (dir !== 3) {
    ctx.fillStyle = 'rgba(255, 170, 100, 0.3)'
    circle(ctx, x + s * 0.36, y + s * 0.32 + walkY, s * 0.03)
    circle(ctx, x + s * 0.64, y + s * 0.32 + walkY, s * 0.03)
  }
}

// ─── CHICKEN ─────────────────────────────────────────────────

function drawChicken(ctx, x, y, s, dir, frame, isActive) {
  const p = PALETTES.chicken
  const walkY = frame === 1 ? -1 : frame === 2 ? 1 : 0

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ellipse(ctx, x + s * 0.5, y + s * 0.92, s * 0.24, s * 0.06)

  // Tail feathers
  ctx.fillStyle = '#E8D5B7'
  if (dir !== 3) {
    ellipse(ctx, x + s * 0.5, y + s * 0.4 + walkY, s * 0.06, s * 0.08)
    ctx.fillStyle = p.comb
    ellipse(ctx, x + s * 0.5, y + s * 0.36 + walkY, s * 0.04, s * 0.05)
  }

  // Body (round, fluffy)
  ctx.fillStyle = p.body
  ellipse(ctx, x + s * 0.5, y + s * 0.58 + walkY, s * 0.24, s * 0.22)

  // Belly
  ctx.fillStyle = p.belly
  ellipse(ctx, x + s * 0.5, y + s * 0.62 + walkY, s * 0.16, s * 0.14)

  // Wings
  ctx.fillStyle = '#E8D5B7'
  const wingBob = frame === 1 ? -1.5 : frame === 2 ? 1.5 : 0
  ellipse(ctx, x + s * 0.26, y + s * 0.56 + walkY + wingBob, s * 0.07, s * 0.11)
  ellipse(ctx, x + s * 0.74, y + s * 0.56 + walkY - wingBob, s * 0.07, s * 0.11)

  // Head
  ctx.fillStyle = p.body
  circle(ctx, x + s * 0.5, y + s * 0.3 + walkY, s * 0.15)

  // Comb (red thing on top)
  ctx.fillStyle = p.comb
  circle(ctx, x + s * 0.5, y + s * 0.16 + walkY, s * 0.05)
  circle(ctx, x + s * 0.46, y + s * 0.18 + walkY, s * 0.04)
  circle(ctx, x + s * 0.54, y + s * 0.18 + walkY, s * 0.04)

  // Wattle (red thing under beak)
  if (dir === 0) {
    ctx.fillStyle = p.wattle
    ellipse(ctx, x + s * 0.5, y + s * 0.4 + walkY, s * 0.03, s * 0.04)
  }

  // Eyes
  ctx.fillStyle = p.eye
  if (dir === 0) {
    circle(ctx, x + s * 0.42, y + s * 0.27 + walkY, s * 0.025)
    circle(ctx, x + s * 0.58, y + s * 0.27 + walkY, s * 0.025)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.425, y + s * 0.265 + walkY, s * 0.01)
    circle(ctx, x + s * 0.585, y + s * 0.265 + walkY, s * 0.01)
  } else if (dir === 1) {
    ctx.fillStyle = p.eye
    circle(ctx, x + s * 0.4, y + s * 0.27 + walkY, s * 0.025)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.395, y + s * 0.265 + walkY, s * 0.01)
  } else if (dir === 2) {
    ctx.fillStyle = p.eye
    circle(ctx, x + s * 0.6, y + s * 0.27 + walkY, s * 0.025)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.605, y + s * 0.265 + walkY, s * 0.01)
  }

  // Beak
  ctx.fillStyle = p.beak
  if (dir === 0) {
    ctx.beginPath()
    ctx.moveTo(x + s * 0.46, y + s * 0.33 + walkY)
    ctx.lineTo(x + s * 0.54, y + s * 0.33 + walkY)
    ctx.lineTo(x + s * 0.5, y + s * 0.38 + walkY)
    ctx.closePath()
    ctx.fill()
  } else if (dir === 1) {
    ctx.beginPath()
    ctx.moveTo(x + s * 0.38, y + s * 0.3 + walkY)
    ctx.lineTo(x + s * 0.28, y + s * 0.33 + walkY)
    ctx.lineTo(x + s * 0.38, y + s * 0.36 + walkY)
    ctx.closePath()
    ctx.fill()
  } else if (dir === 2) {
    ctx.beginPath()
    ctx.moveTo(x + s * 0.62, y + s * 0.3 + walkY)
    ctx.lineTo(x + s * 0.72, y + s * 0.33 + walkY)
    ctx.lineTo(x + s * 0.62, y + s * 0.36 + walkY)
    ctx.closePath()
    ctx.fill()
  }

  // Feet
  ctx.fillStyle = p.beak
  if (frame === 1) {
    ellipse(ctx, x + s * 0.38, y + s * 0.87, s * 0.06, s * 0.03)
    ellipse(ctx, x + s * 0.62, y + s * 0.89, s * 0.06, s * 0.03)
  } else if (frame === 2) {
    ellipse(ctx, x + s * 0.38, y + s * 0.89, s * 0.06, s * 0.03)
    ellipse(ctx, x + s * 0.62, y + s * 0.87, s * 0.06, s * 0.03)
  } else {
    ellipse(ctx, x + s * 0.38, y + s * 0.88, s * 0.06, s * 0.03)
    ellipse(ctx, x + s * 0.62, y + s * 0.88, s * 0.06, s * 0.03)
  }

  // Blush
  if (dir !== 3) {
    ctx.fillStyle = 'rgba(255, 150, 150, 0.3)'
    circle(ctx, x + s * 0.36, y + s * 0.32 + walkY, s * 0.025)
    circle(ctx, x + s * 0.64, y + s * 0.32 + walkY, s * 0.025)
  }
}

// ─── HUMAN ───────────────────────────────────────────────────

function drawHuman(ctx, x, y, s, dir, frame, isActive) {
  const p = PALETTES.human
  const walkY = frame === 1 ? -1 : frame === 2 ? 1 : 0

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ellipse(ctx, x + s * 0.5, y + s * 0.92, s * 0.22, s * 0.06)

  // Body (hoodie/shirt)
  ctx.fillStyle = p.body
  roundedRect(ctx, x + s * 0.28, y + s * 0.44 + walkY, s * 0.44, s * 0.34, s * 0.08)

  // Hood/collar detail
  ctx.fillStyle = p.accent
  roundedRect(ctx, x + s * 0.32, y + s * 0.44 + walkY, s * 0.36, s * 0.08, s * 0.04)

  // Head (skin color)
  ctx.fillStyle = p.skin
  circle(ctx, x + s * 0.5, y + s * 0.3 + walkY, s * 0.16)

  // Hair
  ctx.fillStyle = p.hair
  ctx.beginPath()
  ctx.arc(x + s * 0.5, y + s * 0.26 + walkY, s * 0.17, Math.PI, Math.PI * 2)
  ctx.fill()
  // Side hair
  roundedRect(ctx, x + s * 0.33, y + s * 0.2 + walkY, s * 0.06, s * 0.12, s * 0.02)
  roundedRect(ctx, x + s * 0.61, y + s * 0.2 + walkY, s * 0.06, s * 0.12, s * 0.02)

  // Eyes
  ctx.fillStyle = p.eye
  if (dir === 0) {
    circle(ctx, x + s * 0.42, y + s * 0.29 + walkY, s * 0.025)
    circle(ctx, x + s * 0.58, y + s * 0.29 + walkY, s * 0.025)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.425, y + s * 0.285 + walkY, s * 0.01)
    circle(ctx, x + s * 0.585, y + s * 0.285 + walkY, s * 0.01)
  } else if (dir === 1) {
    ctx.fillStyle = p.eye
    circle(ctx, x + s * 0.4, y + s * 0.29 + walkY, s * 0.025)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.395, y + s * 0.285 + walkY, s * 0.01)
  } else if (dir === 2) {
    ctx.fillStyle = p.eye
    circle(ctx, x + s * 0.6, y + s * 0.29 + walkY, s * 0.025)
    ctx.fillStyle = '#fff'
    circle(ctx, x + s * 0.605, y + s * 0.285 + walkY, s * 0.01)
  }

  // Mouth (tiny smile)
  if (dir === 0) {
    ctx.strokeStyle = '#C0877B'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(x + s * 0.5, y + s * 0.35 + walkY, s * 0.04, 0.1, Math.PI - 0.1)
    ctx.stroke()
  }

  // Legs
  ctx.fillStyle = '#4A4A6A'
  const legY = y + s * 0.76
  if (frame === 1) {
    roundedRect(ctx, x + s * 0.32, legY - 1, s * 0.12, s * 0.12, s * 0.03)
    roundedRect(ctx, x + s * 0.56, legY + 1, s * 0.12, s * 0.12, s * 0.03)
  } else if (frame === 2) {
    roundedRect(ctx, x + s * 0.32, legY + 1, s * 0.12, s * 0.12, s * 0.03)
    roundedRect(ctx, x + s * 0.56, legY - 1, s * 0.12, s * 0.12, s * 0.03)
  } else {
    roundedRect(ctx, x + s * 0.32, legY, s * 0.12, s * 0.12, s * 0.03)
    roundedRect(ctx, x + s * 0.56, legY, s * 0.12, s * 0.12, s * 0.03)
  }

  // Shoes
  ctx.fillStyle = p.shoes
  const shoeY = y + s * 0.85
  if (frame === 1) {
    roundedRect(ctx, x + s * 0.3, shoeY - 1, s * 0.15, s * 0.05, s * 0.02)
    roundedRect(ctx, x + s * 0.55, shoeY + 1, s * 0.15, s * 0.05, s * 0.02)
  } else if (frame === 2) {
    roundedRect(ctx, x + s * 0.3, shoeY + 1, s * 0.15, s * 0.05, s * 0.02)
    roundedRect(ctx, x + s * 0.55, shoeY - 1, s * 0.15, s * 0.05, s * 0.02)
  } else {
    roundedRect(ctx, x + s * 0.3, shoeY, s * 0.15, s * 0.05, s * 0.02)
    roundedRect(ctx, x + s * 0.55, shoeY, s * 0.15, s * 0.05, s * 0.02)
  }

  // Blush
  if (dir !== 3) {
    ctx.fillStyle = 'rgba(255, 150, 150, 0.25)'
    circle(ctx, x + s * 0.37, y + s * 0.34 + walkY, s * 0.025)
    circle(ctx, x + s * 0.63, y + s * 0.34 + walkY, s * 0.025)
  }
}

// ─── Character draw dispatcher ──────────────────────────────

const DRAW_FNS = {
  capybara: drawCapybara,
  penguin: drawPenguin,
  duck: drawDuck,
  chicken: drawChicken,
  human: drawHuman,
}

export function drawAgent(ctx, x, y, size, agentType, direction = 0, frame = 0, isActive = true) {
  const charType = getCharacterType(agentType)
  const drawFn = DRAW_FNS[charType] ?? drawHuman
  const alpha = isActive ? 1.0 : 0.5

  ctx.globalAlpha = alpha
  drawFn(ctx, x, y, size, direction, frame, isActive)

  // Activity indicator (sparkles for active agents)
  if (isActive) {
    const now = Date.now()
    const blink = Math.sin(now / 300) > 0
    if (blink) {
      drawActivitySparkle(ctx, x, y, size, now)
    }
  }

  ctx.globalAlpha = 1.0
}

function drawActivitySparkle(ctx, x, y, size, now) {
  const s = size
  ctx.fillStyle = '#FFD700'
  const sparkleSize = s * 0.03

  // Three little stars floating above head
  const offsets = [
    { dx: 0.35, dy: 0.05, phase: 0 },
    { dx: 0.5, dy: 0.02, phase: 1 },
    { dx: 0.65, dy: 0.06, phase: 2 },
  ]

  for (const off of offsets) {
    const float = Math.sin((now + off.phase * 400) / 500) * 2
    const sx = x + s * off.dx
    const sy = y + s * off.dy + float

    // Draw a tiny 4-point star
    ctx.beginPath()
    ctx.moveTo(sx, sy - sparkleSize * 1.5)
    ctx.lineTo(sx + sparkleSize * 0.5, sy)
    ctx.lineTo(sx, sy + sparkleSize * 1.5)
    ctx.lineTo(sx - sparkleSize * 0.5, sy)
    ctx.closePath()
    ctx.fill()
  }
}

export function drawAgentLabel(ctx, x, y, size, name, agentType, scale = 2) {
  const roleColor = getRoleColor(agentType)
  const charType = getCharacterType(agentType)

  // Character type emoji
  const emoji = { capybara: '\u{1F43E}', penguin: '\u{1F427}', duck: '\u{1F986}', chicken: '\u{1F414}', human: '\u{1F9D1}' }

  // Name tag below agent
  ctx.font = `${6 * scale}px "JetBrains Mono", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'

  const text = name.length > 10 ? name.slice(0, 9) + '..' : name
  const metrics = ctx.measureText(text)
  const padding = 3 * scale
  const tagWidth = metrics.width + padding * 2.5
  const tagHeight = 8 * scale
  const tagX = x + size * 0.5 - tagWidth / 2
  const tagY = y + size + 2 * scale

  // Background with rounded corners
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
  roundedRect(ctx, tagX, tagY, tagWidth, tagHeight, 3 * scale)

  // Color accent bar at top
  ctx.fillStyle = roleColor.tag + '80'
  ctx.fillRect(tagX + 1, tagY, tagWidth - 2, 1.5 * scale)

  // Text
  ctx.fillStyle = roleColor.text
  ctx.fillText(text, x + size * 0.5, tagY + 1.5 * scale)
}

// Legacy compat
export function getAgentColor(agentType) {
  const rc = getRoleColor(agentType)
  return { body: rc.tag, accent: rc.text }
}

export { FRAME_COUNT, DIRECTIONS, CHARACTER_MAP, getCharacterType }
