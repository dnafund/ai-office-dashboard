/**
 * ProjectPanel — Add/remove projects, show registered projects with color dots
 */

import { useState, useCallback } from 'react'
import { registerProject, unregisterProject } from '../../api/teams.js'

function ProjectDot({ color }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  )
}

function AddProjectForm({ onAdded }) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!name.trim() || !path.trim()) return

    setAdding(true)
    setError(null)
    try {
      await registerProject(name.trim(), path.trim())
      setName('')
      setPath('')
      onAdded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }, [name, path, onAdded])

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5 mb-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Project name (e.g. trading-bot)"
        className="w-full text-[11px] px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white placeholder:text-text-dim font-mono focus:outline-none focus:border-white/30"
      />
      <input
        type="text"
        value={path}
        onChange={(e) => setPath(e.target.value)}
        placeholder="Absolute path (e.g. /Users/you/projects/bot)"
        className="w-full text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-white placeholder:text-text-dim font-mono focus:outline-none focus:border-white/30"
      />
      {error && (
        <div className="text-[10px] text-red-400 font-mono">{error}</div>
      )}
      <button
        type="submit"
        disabled={adding || !name.trim() || !path.trim()}
        className="text-[10px] px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 font-mono transition-colors disabled:opacity-40"
      >
        {adding ? 'Adding...' : '+ Add Project'}
      </button>
    </form>
  )
}

function ProjectRow({ project, onRemoved }) {
  const [removing, setRemoving] = useState(false)

  const handleRemove = useCallback(async () => {
    setRemoving(true)
    try {
      await unregisterProject(project.id)
      onRemoved?.()
    } catch {
      // Remove failed
    } finally {
      setRemoving(false)
    }
  }, [project.id, onRemoved])

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5 hover:bg-white/8 transition-colors">
      <ProjectDot color={project.color} />
      <span className="text-xs font-mono text-white truncate flex-1">
        {project.name}
      </span>
      <span className="text-[9px] text-text-dim font-mono truncate max-w-[200px]">
        {project.path}
      </span>
      <button
        onClick={handleRemove}
        disabled={removing}
        className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-red-500/20 text-text-dim hover:text-red-400 font-mono transition-colors disabled:opacity-40 flex-shrink-0"
      >
        {removing ? '...' : '✕'}
      </button>
    </div>
  )
}

export function ProjectPanel({ projects = [] }) {
  const [expanded, setExpanded] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="glass-panel rounded-lg p-4 page-enter">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between mb-2"
      >
        <h3 className="font-display text-xs tracking-wider text-glow flex items-center gap-2">
          Projects
          <span className="text-[10px] text-text-dim font-mono">({projects.length})</span>
        </h3>
        <span className="text-text-dim text-xs">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="space-y-1.5">
          <button
            onClick={() => setShowAdd((prev) => !prev)}
            className="text-[10px] px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-mono transition-colors"
          >
            {showAdd ? 'Cancel' : '+ Add Project'}
          </button>

          {showAdd && (
            <AddProjectForm onAdded={() => setShowAdd(false)} />
          )}

          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}

          {projects.length === 0 && (
            <div className="text-[10px] text-text-dim font-mono text-center py-3">
              No projects registered yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
