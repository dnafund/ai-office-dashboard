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

export function assignTask(teamId, taskId, owner) {
  return request(`/tasks/${teamId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ taskId, owner }),
  })
}

export function createTaskApi(teamId, subject, description, owner) {
  return request(`/tasks/${teamId}/create`, {
    method: 'POST',
    body: JSON.stringify({ subject, description, owner }),
  })
}

export function executeTask(teamId, taskId, agentName, prompt, projectId) {
  return request(`/tasks/${teamId}/${taskId}/execute`, {
    method: 'POST',
    body: JSON.stringify({ agentName, prompt, projectId }),
  })
}

export function cancelTask(teamId, taskId) {
  return request(`/tasks/${teamId}/${taskId}/cancel`, {
    method: 'POST',
  })
}

export function deleteTaskApi(teamId, taskId) {
  return request(`/tasks/${teamId}/${taskId}`, {
    method: 'DELETE',
  })
}

export function updateTaskStatus(teamId, taskId, status) {
  return request(`/tasks/${teamId}/${taskId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  })
}

// ─── Project API ────────────────────────────────────────────

export function listProjects() {
  return request('/projects', { method: 'GET' })
}

export function registerProject(name, path, color) {
  return request('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, path, color }),
  })
}

export function unregisterProject(projectId) {
  return request(`/projects/${projectId}`, {
    method: 'DELETE',
  })
}
