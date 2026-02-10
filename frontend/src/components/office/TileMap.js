// 32x32 pixel tile-based office map — enhanced art
// Tile IDs:
//   0 = void (black)
//   1 = floor
//   2 = wall
//   3 = desk
//   4 = monitor
//   5 = chair
//   6 = plant
//   7 = coffee machine
//   8 = door/corridor
//   9 = rug/carpet
//  10 = bookshelf
//  11 = whiteboard
//  12 = sofa

const TILE_SIZE = 32

// Room labels with pixel positions
const ROOM_LABELS = [
  { text: 'WAR ROOM', x: 2, y: 1, icon: '\u2694' },
  { text: 'CODE LAB', x: 10, y: 1, icon: '\uD83D\uDCBB' },
  { text: 'LIBRARY', x: 18, y: 1, icon: '\uD83D\uDCDA' },
  { text: 'QA ROOM', x: 2, y: 9, icon: '\uD83E\uDDEA' },
  { text: 'LOUNGE', x: 10, y: 9, icon: '\u2615' },
]

// 24 x 16 tile map
const MAP_WIDTH = 24
const MAP_HEIGHT = 16

// prettier-ignore
const MAP_DATA = [
  // Row 0: top wall
  2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
  // Row 1: War Room | Code Lab | Library
  2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,
  // Row 2
  2,1,3,4,1,11,1,1,2,1,3,4,3,4,1,1,2,1,10,1,10,1,1,2,
  // Row 3
  2,1,5,1,1,1,6,1,2,1,5,1,5,1,1,1,2,1,10,1,10,1,1,2,
  // Row 4
  2,1,3,4,1,1,1,1,2,1,3,4,3,4,1,1,2,1,1,1,1,1,6,2,
  // Row 5
  2,1,5,1,1,1,1,1,2,1,5,1,5,1,1,6,2,1,3,4,3,4,1,2,
  // Row 6
  2,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,8,1,5,1,5,1,1,2,
  // Row 7: corridor
  2,2,2,2,8,2,2,2,2,2,2,2,8,2,2,2,2,2,2,2,8,2,2,2,
  // Row 8: QA Room | Lounge | Pantry/Garden
  2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,
  // Row 9
  2,1,3,4,1,11,1,1,2,1,9,9,9,9,1,1,2,1,1,7,1,1,1,2,
  // Row 10
  2,1,5,1,1,1,1,1,2,1,9,12,12,9,1,1,2,1,1,1,1,1,1,2,
  // Row 11
  2,1,3,4,1,1,6,1,2,1,9,9,9,9,1,6,2,1,6,1,1,6,1,2,
  // Row 12
  2,1,5,1,1,1,1,1,2,1,1,12,12,1,1,1,2,1,1,1,1,1,1,2,
  // Row 13
  2,1,1,1,1,1,1,1,8,1,1,1,1,1,1,1,8,1,1,6,1,6,1,2,
  // Row 14
  2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,1,2,1,1,1,1,1,1,2,
  // Row 15: bottom wall
  2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,
]

// Room definitions for agent placement
const ROOMS = {
  'War Room': {
    bounds: { x: 1, y: 1, w: 7, h: 6 },
    desks: [
      { x: 2, y: 2 }, { x: 2, y: 4 },
    ],
    spawnPoints: [
      { x: 4, y: 3 }, { x: 5, y: 5 }, { x: 6, y: 3 },
    ],
  },
  'Code Lab': {
    bounds: { x: 9, y: 1, w: 7, h: 6 },
    desks: [
      { x: 10, y: 2 }, { x: 12, y: 2 },
      { x: 10, y: 4 }, { x: 12, y: 4 },
    ],
    spawnPoints: [
      { x: 14, y: 3 }, { x: 14, y: 5 },
    ],
  },
  Library: {
    bounds: { x: 17, y: 1, w: 6, h: 6 },
    desks: [
      { x: 18, y: 5 }, { x: 20, y: 5 },
    ],
    spawnPoints: [
      { x: 19, y: 3 }, { x: 21, y: 3 }, { x: 19, y: 5 },
    ],
  },
  'QA Room': {
    bounds: { x: 1, y: 8, w: 7, h: 7 },
    desks: [
      { x: 2, y: 9 }, { x: 2, y: 11 },
    ],
    spawnPoints: [
      { x: 4, y: 10 }, { x: 5, y: 12 }, { x: 6, y: 10 },
    ],
  },
  Lounge: {
    bounds: { x: 9, y: 8, w: 7, h: 7 },
    desks: [],
    spawnPoints: [
      { x: 11, y: 10 }, { x: 13, y: 10 },
      { x: 11, y: 12 }, { x: 13, y: 12 },
    ],
  },
}

// ─── Tile rendering ──────────────────────────────────────────

function drawFloor(ctx, px, py, s) {
  // Warm dark floor with subtle checker pattern
  ctx.fillStyle = '#1E1B2E'
  ctx.fillRect(px, py, s, s)

  // Subtle checker
  ctx.fillStyle = 'rgba(255, 255, 255, 0.015)'
  ctx.fillRect(px, py, s * 0.5, s * 0.5)
  ctx.fillRect(px + s * 0.5, py + s * 0.5, s * 0.5, s * 0.5)
}

function drawWall(ctx, px, py, s) {
  // Dark wall with subtle brick pattern
  ctx.fillStyle = '#2A2545'
  ctx.fillRect(px, py, s, s)

  // Brick lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.lineWidth = 0.5

  // Horizontal line
  ctx.beginPath()
  ctx.moveTo(px, py + s * 0.5)
  ctx.lineTo(px + s, py + s * 0.5)
  ctx.stroke()

  // Vertical offset lines
  ctx.beginPath()
  ctx.moveTo(px + s * 0.5, py)
  ctx.lineTo(px + s * 0.5, py + s * 0.5)
  ctx.stroke()

  // Top highlight
  ctx.fillStyle = 'rgba(139, 92, 246, 0.08)'
  ctx.fillRect(px, py, s, s * 0.1)
}

function drawDesk(ctx, px, py, s) {
  // Floor first
  drawFloor(ctx, px, py, s)

  const inset = s * 0.08

  // Desk surface (warm wood)
  ctx.fillStyle = '#5C3D2E'
  roundedRect(ctx, px + inset, py + inset * 2, s - inset * 2, s - inset * 3, s * 0.06)

  // Wood grain
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(px + inset * 2, py + s * 0.35)
  ctx.lineTo(px + s - inset * 2, py + s * 0.35)
  ctx.moveTo(px + inset * 3, py + s * 0.55)
  ctx.lineTo(px + s - inset * 3, py + s * 0.55)
  ctx.stroke()

  // Desk edge highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
  ctx.fillRect(px + inset, py + inset * 2, s - inset * 2, s * 0.04)
}

function drawMonitor(ctx, px, py, s) {
  // Floor first
  drawFloor(ctx, px, py, s)

  const inset = s * 0.1

  // Monitor stand
  ctx.fillStyle = '#3A3A4E'
  ctx.fillRect(px + s * 0.42, py + s * 0.65, s * 0.16, s * 0.15)
  ctx.fillRect(px + s * 0.3, py + s * 0.78, s * 0.4, s * 0.06)

  // Monitor frame
  ctx.fillStyle = '#2D2D3D'
  roundedRect(ctx, px + inset * 1.5, py + inset, s - inset * 3, s * 0.58, s * 0.04)

  // Screen (blue glow)
  const grad = ctx.createLinearGradient(px, py + inset * 2, px, py + s * 0.6)
  grad.addColorStop(0, '#1A3A6B')
  grad.addColorStop(1, '#0D2440')
  ctx.fillStyle = grad
  ctx.fillRect(px + inset * 2.5, py + inset * 2, s - inset * 5, s * 0.48)

  // Screen code lines (fixed widths to avoid per-frame flicker)
  ctx.fillStyle = 'rgba(100, 200, 255, 0.25)'
  const lineH = s * 0.03
  const lineWidths = [0.45, 0.32, 0.5, 0.28]
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(px + inset * 3, py + inset * 3 + i * (lineH + s * 0.06), s * lineWidths[i], lineH)
  }

  // Screen glow effect
  ctx.fillStyle = 'rgba(59, 130, 246, 0.08)'
  ctx.fillRect(px, py, s, s)
}

function drawChair(ctx, px, py, s) {
  // Floor first
  drawFloor(ctx, px, py, s)

  // Chair seat
  ctx.fillStyle = '#3D3560'
  roundedRect(ctx, px + s * 0.2, py + s * 0.3, s * 0.6, s * 0.5, s * 0.1)

  // Chair back
  ctx.fillStyle = '#4A4070'
  roundedRect(ctx, px + s * 0.25, py + s * 0.15, s * 0.5, s * 0.3, s * 0.08)

  // Seat cushion
  ctx.fillStyle = '#5248A0'
  roundedRect(ctx, px + s * 0.25, py + s * 0.45, s * 0.5, s * 0.25, s * 0.06)

  // Chair wheels
  ctx.fillStyle = '#2A2A3E'
  circle(ctx, px + s * 0.28, py + s * 0.82, s * 0.04)
  circle(ctx, px + s * 0.72, py + s * 0.82, s * 0.04)
  circle(ctx, px + s * 0.5, py + s * 0.85, s * 0.04)
}

function drawPlant(ctx, px, py, s) {
  // Floor first
  drawFloor(ctx, px, py, s)

  // Pot
  ctx.fillStyle = '#8B4513'
  roundedRect(ctx, px + s * 0.3, py + s * 0.6, s * 0.4, s * 0.28, s * 0.04)
  // Pot rim
  ctx.fillStyle = '#A0522D'
  ctx.fillRect(px + s * 0.26, py + s * 0.58, s * 0.48, s * 0.06)

  // Soil
  ctx.fillStyle = '#3E2723'
  ellipse(ctx, px + s * 0.5, py + s * 0.62, s * 0.18, s * 0.04)

  // Stem
  ctx.fillStyle = '#2E7D32'
  ctx.fillRect(px + s * 0.47, py + s * 0.35, s * 0.06, s * 0.28)

  // Leaves (layered for depth)
  ctx.fillStyle = '#4CAF50'
  circle(ctx, px + s * 0.5, py + s * 0.3, s * 0.16)
  ctx.fillStyle = '#66BB6A'
  circle(ctx, px + s * 0.38, py + s * 0.35, s * 0.1)
  circle(ctx, px + s * 0.62, py + s * 0.32, s * 0.1)
  ctx.fillStyle = '#81C784'
  circle(ctx, px + s * 0.5, py + s * 0.22, s * 0.1)

  // Leaf highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
  circle(ctx, px + s * 0.45, py + s * 0.25, s * 0.04)
}

function drawCoffeeMachine(ctx, px, py, s) {
  // Floor first
  drawFloor(ctx, px, py, s)

  // Counter/table
  ctx.fillStyle = '#4A3520'
  roundedRect(ctx, px + s * 0.15, py + s * 0.45, s * 0.7, s * 0.4, s * 0.04)

  // Machine body
  ctx.fillStyle = '#2D2D2D'
  roundedRect(ctx, px + s * 0.22, py + s * 0.12, s * 0.56, s * 0.5, s * 0.06)

  // Machine face
  ctx.fillStyle = '#3A3A3A'
  roundedRect(ctx, px + s * 0.28, py + s * 0.2, s * 0.44, s * 0.3, s * 0.04)

  // Power light (red)
  ctx.fillStyle = '#EF4444'
  circle(ctx, px + s * 0.65, py + s * 0.18, s * 0.03)
  // Glow
  ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'
  circle(ctx, px + s * 0.65, py + s * 0.18, s * 0.06)

  // Coffee cup
  ctx.fillStyle = '#F5F5DC'
  roundedRect(ctx, px + s * 0.38, py + s * 0.52, s * 0.24, s * 0.2, s * 0.04)
  // Coffee inside
  ctx.fillStyle = '#5C3317'
  ctx.fillRect(px + s * 0.4, py + s * 0.54, s * 0.2, s * 0.08)

  // Steam
  const now = Date.now()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
  const steamFloat = Math.sin(now / 800) * 2
  circle(ctx, px + s * 0.45, py + s * 0.46 + steamFloat, s * 0.02)
  circle(ctx, px + s * 0.5, py + s * 0.42 + steamFloat, s * 0.025)
  circle(ctx, px + s * 0.55, py + s * 0.44 + steamFloat, s * 0.02)
}

function drawDoor(ctx, px, py, s) {
  // Corridor floor (slightly different shade)
  ctx.fillStyle = '#22203A'
  ctx.fillRect(px, py, s, s)

  // Path markers
  ctx.fillStyle = 'rgba(139, 92, 246, 0.06)'
  ctx.fillRect(px + s * 0.1, py + s * 0.1, s * 0.8, s * 0.8)

  // Subtle direction arrows
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.beginPath()
  ctx.moveTo(px + s * 0.3, py + s * 0.6)
  ctx.lineTo(px + s * 0.5, py + s * 0.4)
  ctx.lineTo(px + s * 0.7, py + s * 0.6)
  ctx.closePath()
  ctx.fill()
}

function drawRug(ctx, px, py, s) {
  // Floor
  drawFloor(ctx, px, py, s)

  // Rug
  ctx.fillStyle = 'rgba(139, 92, 246, 0.12)'
  ctx.fillRect(px + s * 0.05, py + s * 0.05, s * 0.9, s * 0.9)

  // Rug border
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)'
  ctx.lineWidth = 1
  ctx.strokeRect(px + s * 0.1, py + s * 0.1, s * 0.8, s * 0.8)

  // Rug pattern (diamond)
  ctx.fillStyle = 'rgba(167, 139, 250, 0.08)'
  ctx.beginPath()
  ctx.moveTo(px + s * 0.5, py + s * 0.2)
  ctx.lineTo(px + s * 0.8, py + s * 0.5)
  ctx.lineTo(px + s * 0.5, py + s * 0.8)
  ctx.lineTo(px + s * 0.2, py + s * 0.5)
  ctx.closePath()
  ctx.fill()
}

function drawBookshelf(ctx, px, py, s) {
  // Floor first
  drawFloor(ctx, px, py, s)

  // Shelf frame
  ctx.fillStyle = '#4A3020'
  roundedRect(ctx, px + s * 0.1, py + s * 0.05, s * 0.8, s * 0.85, s * 0.04)

  // Shelf interior
  ctx.fillStyle = '#3A2515'
  ctx.fillRect(px + s * 0.15, py + s * 0.1, s * 0.7, s * 0.75)

  // Shelf dividers
  ctx.fillStyle = '#4A3020'
  ctx.fillRect(px + s * 0.12, py + s * 0.33, s * 0.76, s * 0.04)
  ctx.fillRect(px + s * 0.12, py + s * 0.6, s * 0.76, s * 0.04)

  // Books (colorful spines!)
  const bookColors = ['#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C']
  const bookW = s * 0.08

  // Top shelf books (fixed heights to avoid flicker)
  const topBookH = [0.18, 0.16, 0.19, 0.15, 0.17]
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = bookColors[i % bookColors.length]
    const bh = s * topBookH[i]
    ctx.fillRect(px + s * 0.18 + i * (bookW + s * 0.03), py + s * 0.33 - bh, bookW, bh)
  }

  // Middle shelf books
  const midBookH = [0.17, 0.19, 0.16, 0.18]
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = bookColors[(i + 2) % bookColors.length]
    const bh = s * midBookH[i]
    ctx.fillRect(px + s * 0.2 + i * (bookW + s * 0.05), py + s * 0.6 - bh, bookW, bh)
  }

  // Bottom shelf — a globe or ornament
  ctx.fillStyle = '#5DADE2'
  circle(ctx, px + s * 0.35, py + s * 0.73, s * 0.06)
  ctx.fillStyle = '#2E86C1'
  circle(ctx, px + s * 0.33, py + s * 0.72, s * 0.02)
}

function drawWhiteboard(ctx, px, py, s) {
  // Floor first
  drawFloor(ctx, px, py, s)

  // Board frame
  ctx.fillStyle = '#C0C0C0'
  roundedRect(ctx, px + s * 0.08, py + s * 0.05, s * 0.84, s * 0.75, s * 0.03)

  // Board surface (white)
  ctx.fillStyle = '#F0F0F0'
  ctx.fillRect(px + s * 0.12, py + s * 0.1, s * 0.76, s * 0.65)

  // Scribbles (colored lines)
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(px + s * 0.2, py + s * 0.25)
  ctx.lineTo(px + s * 0.7, py + s * 0.25)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)'
  ctx.beginPath()
  ctx.moveTo(px + s * 0.2, py + s * 0.4)
  ctx.lineTo(px + s * 0.55, py + s * 0.4)
  ctx.stroke()

  ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)'
  ctx.beginPath()
  ctx.moveTo(px + s * 0.2, py + s * 0.55)
  ctx.lineTo(px + s * 0.65, py + s * 0.55)
  ctx.stroke()

  // Marker tray
  ctx.fillStyle = '#808080'
  ctx.fillRect(px + s * 0.2, py + s * 0.78, s * 0.6, s * 0.04)

  // Markers
  ctx.fillStyle = '#E74C3C'
  roundedRect(ctx, px + s * 0.25, py + s * 0.76, s * 0.06, s * 0.08, s * 0.01)
  ctx.fillStyle = '#3498DB'
  roundedRect(ctx, px + s * 0.35, py + s * 0.76, s * 0.06, s * 0.08, s * 0.01)
  ctx.fillStyle = '#2ECC71'
  roundedRect(ctx, px + s * 0.45, py + s * 0.76, s * 0.06, s * 0.08, s * 0.01)
}

function drawSofa(ctx, px, py, s) {
  // Floor first
  drawFloor(ctx, px, py, s)

  // Sofa base
  ctx.fillStyle = '#4A3070'
  roundedRect(ctx, px + s * 0.1, py + s * 0.25, s * 0.8, s * 0.55, s * 0.1)

  // Sofa back
  ctx.fillStyle = '#5A3D80'
  roundedRect(ctx, px + s * 0.1, py + s * 0.15, s * 0.8, s * 0.35, s * 0.1)

  // Seat cushions
  ctx.fillStyle = '#6B4DA0'
  roundedRect(ctx, px + s * 0.15, py + s * 0.4, s * 0.32, s * 0.32, s * 0.06)
  roundedRect(ctx, px + s * 0.53, py + s * 0.4, s * 0.32, s * 0.32, s * 0.06)

  // Cushion highlights
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  roundedRect(ctx, px + s * 0.18, py + s * 0.42, s * 0.12, s * 0.06, s * 0.02)
  roundedRect(ctx, px + s * 0.56, py + s * 0.42, s * 0.12, s * 0.06, s * 0.02)

  // Armrests
  ctx.fillStyle = '#4A3070'
  roundedRect(ctx, px + s * 0.06, py + s * 0.3, s * 0.1, s * 0.45, s * 0.05)
  roundedRect(ctx, px + s * 0.84, py + s * 0.3, s * 0.1, s * 0.45, s * 0.05)
}

// Helper shapes
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

// ─── Tile dispatch ───────────────────────────────────────────

const TILE_DRAW = {
  0: (ctx, px, py, s) => { ctx.fillStyle = '#0A0A14'; ctx.fillRect(px, py, s, s) },
  1: drawFloor,
  2: drawWall,
  3: drawDesk,
  4: drawMonitor,
  5: drawChair,
  6: drawPlant,
  7: drawCoffeeMachine,
  8: drawDoor,
  9: drawRug,
  10: drawBookshelf,
  11: drawWhiteboard,
  12: drawSofa,
}

export function drawTileMap(ctx, scale = 2, bounds = null) {
  const s = TILE_SIZE * scale

  const minX = bounds ? Math.max(0, bounds.minTileX) : 0
  const minY = bounds ? Math.max(0, bounds.minTileY) : 0
  const maxX = bounds ? Math.min(MAP_WIDTH, bounds.maxTileX) : MAP_WIDTH
  const maxY = bounds ? Math.min(MAP_HEIGHT, bounds.maxTileY) : MAP_HEIGHT

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const tileId = MAP_DATA[y * MAP_WIDTH + x]
      const drawFn = TILE_DRAW[tileId] ?? TILE_DRAW[0]
      drawFn(ctx, x * s, y * s, s)

      // Subtle grid overlay
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x * s, y * s, s, s)
    }
  }

  // Draw room labels
  ctx.font = `bold ${8 * scale}px "Orbitron", monospace`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  for (const label of ROOM_LABELS) {
    // Label background
    const lx = label.x * s + 3 * scale
    const ly = label.y * s + 3 * scale
    const textWidth = ctx.measureText(label.text).width

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    roundedRect(ctx, lx - 2 * scale, ly - 1 * scale, textWidth + 6 * scale, 10 * scale, 3 * scale)

    // Label text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.fillText(label.text, lx, ly)
  }
}

export { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, ROOMS, ROOM_LABELS }
