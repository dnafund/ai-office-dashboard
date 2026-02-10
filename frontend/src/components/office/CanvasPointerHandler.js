// CanvasPointerHandler — Mouse state machine for 2D canvas selection
// States: IDLE → MAYBE_DRAG → DRAGGING (box select) or CLICKING (single click)

const DRAG_THRESHOLD = 5

export function createCanvasPointerHandler(options) {
  const {
    getAgentAtPoint,
    onDragStart,
    onDragMove,
    onDragEnd,
    onAgentClick,
    onEmptyClick,
    onHover,
  } = options

  let state = 'IDLE'
  let startScreen = null

  function handleMouseDown(e, screenX, screenY, worldX, worldY) {
    if (e.button !== 0) return // Left button only

    startScreen = { x: screenX, y: screenY }
    state = 'MAYBE_DRAG'
  }

  function handleMouseMove(e, screenX, screenY, worldX, worldY) {
    if (state === 'MAYBE_DRAG' && startScreen) {
      const dx = screenX - startScreen.x
      const dy = screenY - startScreen.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist > DRAG_THRESHOLD) {
        state = 'DRAGGING'
        onDragStart?.(startScreen)
      }
    }

    if (state === 'DRAGGING') {
      onDragMove?.(startScreen, { x: screenX, y: screenY })
      return
    }

    // Hover detection
    const agent = getAgentAtPoint(worldX, worldY)
    onHover?.(agent)
  }

  function handleMouseUp(e, screenX, screenY, worldX, worldY, ctrlKey) {
    if (e.button !== 0) return

    if (state === 'DRAGGING') {
      onDragEnd?.(startScreen, { x: screenX, y: screenY }, ctrlKey)
    } else if (state === 'MAYBE_DRAG') {
      // It was a click, not a drag
      const agent = getAgentAtPoint(worldX, worldY)
      if (agent) {
        onAgentClick?.(agent, ctrlKey)
      } else {
        onEmptyClick?.()
      }
    }

    state = 'IDLE'
    startScreen = null
  }

  function reset() {
    state = 'IDLE'
    startScreen = null
  }

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    reset,
    getState: () => state,
  }
}
