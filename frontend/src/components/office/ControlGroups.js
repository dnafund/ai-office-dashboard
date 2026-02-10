/**
 * ControlGroups - Save/recall selection groups with CTRL+1-9 / 1-9
 *
 * Pure functions. State stored in React component as Map<number, Set<string>>.
 */

export function saveGroup(groups, slot, agentIds) {
  const newGroups = new Map(groups)
  newGroups.set(slot, new Set(agentIds))
  return newGroups
}

export function loadGroup(groups, slot) {
  const group = groups.get(slot)
  return group ? new Set(group) : new Set()
}

export function handleControlGroupKey(event, groups, selectedAgents, onSelectionChange, onGroupsChange, onToast) {
  const key = parseInt(event.key, 10)
  if (isNaN(key) || key < 1 || key > 9) return false

  if (event.ctrlKey || event.metaKey) {
    // CTRL+1-9: Save current selection to group
    const newGroups = saveGroup(groups, key, selectedAgents)
    onGroupsChange(newGroups)
    onToast?.(`Group ${key} saved (${selectedAgents.size})`)
    event.preventDefault()
    return true
  }

  // 1-9 without modifier: Recall group
  const group = loadGroup(groups, key)
  if (group.size > 0) {
    onSelectionChange(group)
    onToast?.(`Group ${key} recalled (${group.size})`)
    event.preventDefault()
    return true
  }

  return false
}
