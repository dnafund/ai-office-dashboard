// REST API client for agent management

const API_BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  return res.json()
}

export function createTeam(name) {
  return request('/teams', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function deleteTeam(teamId) {
  return request(`/teams/${teamId}`, {
    method: 'DELETE',
  })
}

export function addAgent(teamId, name, agentType) {
  return request(`/teams/${teamId}/agents`, {
    method: 'POST',
    body: JSON.stringify({ name, agentType }),
  })
}

export function removeAgent(teamId, agentId) {
  return request(`/teams/${teamId}/agents/${agentId}`, {
    method: 'DELETE',
  })
}

export function updateAgent(teamId, agentId, updates) {
  return request(`/teams/${teamId}/agents/${agentId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}
