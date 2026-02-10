/**
 * SelectionBox - React overlay for drag-select rectangle
 *
 * Renders an absolute-positioned div with green border during active drag.
 */

export function SelectionBox({ dragBox }) {
  if (!dragBox.active || !dragBox.start || !dragBox.end) {
    return null
  }

  const { start, end } = dragBox

  const left = Math.min(start.x, end.x)
  const top = Math.min(start.y, end.y)
  const width = Math.abs(end.x - start.x)
  const height = Math.abs(end.y - start.y)

  return (
    <div
      className="absolute pointer-events-none border-2 border-green-400/60 bg-green-400/10"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    />
  )
}
