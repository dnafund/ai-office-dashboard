/**
 * SelectionManager - Pure functions for immutable selection state
 *
 * All functions return NEW Set instances — never mutate.
 */

export function replaceSelection(agentIds) {
  return new Set(agentIds)
}

export function toggleSelection(currentSelection, agentId, ctrlPressed) {
  if (!ctrlPressed) {
    return new Set([agentId])
  }

  const newSet = new Set(currentSelection)
  if (newSet.has(agentId)) {
    newSet.delete(agentId)
  } else {
    newSet.add(agentId)
  }
  return newSet
}

export function addToSelection(currentSelection, agentIds) {
  return new Set([...currentSelection, ...agentIds])
}

export function clearSelection() {
  return new Set()
}

export function isSelected(selection, agentId) {
  return selection.has(agentId)
}
