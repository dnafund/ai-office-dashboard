/**
 * TaskPanel - Task management with create, assign, execute, cancel, delete
 */

import { useState, useCallback } from 'react'
import {
  assignTask,
  createTaskApi,
  executeTask,
  cancelTask,
  deleteTaskApi,
} from '../../api/teams.js'

const STATUS_STYLES = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Pending' },
  in_progress: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'In Progress' },
  completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Done' },
  blocked: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Blocked' },
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  )
}

function CreateTaskForm({ teamId, onCreated }) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault()
    if (!subject.trim()) return

    setCreating(true)
    try {
      await createTaskApi(teamId, subject.trim(), description.trim())
      setSubject('')
      setDescription('')
      onCreated?.()
    } catch {
      // Creation failed
    } finally {
      setCreating(false)
    }
  }, [teamId, subject, description, onCreated])

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5 mb-3">
      <input
        type="text"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Task subject..."
        className="w-full text-[11px] px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white placeholder:text-text-dim font-mono focus:outline-none focus:border-white/30"
      />
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-white placeholder:text-text-dim font-mono focus:outline-none focus:border-white/30"
      />
      <button
        type="submit"
        disabled={creating || !subject.trim()}
        className="text-[10px] px-2 py-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 font-mono transition-colors disabled:opacity-40"
      >
        {creating ? 'Creating...' : '+ Create Task'}
      </button>
    </form>
  )
}

function ExecuteDialog({ task, teamId, members, onClose }) {
  const [prompt, setPrompt] = useState(
    `You are agent "${task.owner || 'default'}". Execute this task:\n\nSubject: ${task.subject}\nDescription: ${task.description || 'N/A'}\n\nWork in the project directory. Report progress clearly.`
  )
  const [executing, setExecuting] = useState(false)

  const handleExecute = useCallback(async () => {
    const agentName = task.owner || 'default'
    setExecuting(true)
    try {
      await executeTask(teamId, task.id, agentName, prompt)
      onClose?.()
    } catch {
      // Execution request failed
    } finally {
      setExecuting(false)
    }
  }, [teamId, task.id, task.owner, prompt, onClose])

  return (
    <div className="mt-2 p-2 rounded bg-white/5 border border-white/10 space-y-2">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        className="w-full text-[10px] px-2 py-1.5 rounded bg-white/5 border border-white/10 text-white font-mono focus:outline-none focus:border-white/30 resize-none"
      />
      <div className="flex gap-1.5">
        <button
          onClick={handleExecute}
          disabled={executing || !prompt.trim()}
          className="text-[10px] px-2 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-mono transition-colors disabled:opacity-40"
        >
          {executing ? 'Starting...' : 'Run'}
        </button>
        <button
          onClick={onClose}
          className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-text-dim font-mono transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function TaskRow({ task, teamId, members, isExecuting, lastOutput, onViewOutput }) {
  const [assigning, setAssigning] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showExecute, setShowExecute] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleAssign = useCallback(async (agentName) => {
    setAssigning(true)
    try {
      await assignTask(teamId, task.id, agentName)
    } catch {
      // Assignment failed
    } finally {
      setAssigning(false)
      setShowDropdown(false)
    }
  }, [teamId, task.id])

  const handleCancel = useCallback(async () => {
    try {
      await cancelTask(teamId, task.id)
    } catch {
      // Cancel failed
    }
  }, [teamId, task.id])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      await deleteTaskApi(teamId, task.id)
    } catch {
      // Delete failed
    } finally {
      setDeleting(false)
    }
  }, [teamId, task.id])

  return (
    <div className="px-2 py-2 rounded bg-white/5 hover:bg-white/8 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <StatusBadge status={task.status} />
        {isExecuting && (
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        )}
        <span className="text-xs font-mono text-white truncate flex-1">
          {task.subject}
        </span>
        {task.owner && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">
            {task.owner}
          </span>
        )}
      </div>

      {task.description && (
        <div className="text-[10px] text-text-dim truncate mb-1.5 pl-1">
          {task.description.slice(0, 80)}
          {task.description.length > 80 ? '...' : ''}
        </div>
      )}

      {/* Last output preview */}
      {lastOutput && (
        <button
          onClick={() => onViewOutput?.(teamId, task.id)}
          className="w-full text-left text-[9px] text-blue-400/60 font-mono truncate mb-1.5 pl-1 hover:text-blue-400 transition-colors"
        >
          {lastOutput}
        </button>
      )}

      <div className="flex items-center gap-1.5">
        {/* Assign button */}
        {!task.owner && task.status !== 'completed' && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown((prev) => !prev)}
              disabled={assigning}
              className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-text-dim hover:text-white font-mono transition-colors disabled:opacity-50"
            >
              {assigning ? '...' : 'Assign'}
            </button>
            {showDropdown && (
              <div className="absolute left-0 top-full mt-1 z-50 glass-panel rounded p-1 min-w-[120px]">
                {members.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => handleAssign(m.name)}
                    className="block w-full text-left text-[10px] px-2 py-1 rounded hover:bg-white/10 text-text-dim hover:text-white font-mono transition-colors"
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Execute button — for assigned pending/blocked tasks */}
        {task.owner && (task.status === 'pending' || task.status === 'blocked') && !isExecuting && (
          <button
            onClick={() => setShowExecute((prev) => !prev)}
            className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-mono transition-colors"
          >
            ▶ Execute
          </button>
        )}

        {/* Cancel button — for executing tasks */}
        {isExecuting && (
          <button
            onClick={handleCancel}
            className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 font-mono transition-colors"
          >
            ⏹ Cancel
          </button>
        )}

        {/* View output button */}
        {lastOutput && (
          <button
            onClick={() => onViewOutput?.(teamId, task.id)}
            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-text-dim hover:text-white font-mono transition-colors"
          >
            Output
          </button>
        )}

        {/* Delete button */}
        {!isExecuting && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-red-500/20 text-text-dim hover:text-red-400 font-mono transition-colors disabled:opacity-40 ml-auto"
          >
            {deleting ? '...' : '✕'}
          </button>
        )}

        {task.blockedBy.length > 0 && (
          <span className="text-[10px] text-red-400/60 font-mono">
            blocked by #{task.blockedBy.join(', #')}
          </span>
        )}
      </div>

      {showExecute && (
        <ExecuteDialog
          task={task}
          teamId={teamId}
          members={members}
          onClose={() => setShowExecute(false)}
        />
      )}
    </div>
  )
}

export function TaskPanel({ tasks = [], teams = [], executions, outputHistory, onViewOutput }) {
  const [expanded, setExpanded] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createTeamId, setCreateTeamId] = useState(null)

  const totalTasks = tasks.reduce((sum, ts) => sum + ts.tasks.length, 0)
  const teamMap = new Map(teams.map((t) => [t.id, t]))

  return (
    <div className="glass-panel rounded-lg p-4 page-enter">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between mb-2"
      >
        <h3 className="font-display text-xs tracking-wider text-glow flex items-center gap-2">
          Tasks
          <span className="text-[10px] text-text-dim font-mono">({totalTasks})</span>
          {executions && executions.size > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono animate-pulse">
              {executions.size} running
            </span>
          )}
        </h3>
        <span className="text-text-dim text-xs">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {/* Create task buttons per team */}
          {teams.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => {
                    setCreateTeamId((prev) => prev === team.id ? null : team.id)
                    setShowCreate((prev) => createTeamId === team.id ? !prev : true)
                  }}
                  className="text-[10px] px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-400 font-mono transition-colors"
                >
                  + {team.name}
                </button>
              ))}
            </div>
          )}

          {/* Create task form */}
          {showCreate && createTeamId && (
            <CreateTaskForm
              teamId={createTeamId}
              onCreated={() => setShowCreate(false)}
            />
          )}

          {/* Task list */}
          {tasks.map((taskState) => {
            const team = teamMap.get(taskState.teamId)
            const members = team?.members || []

            return (
              <div key={taskState.teamId}>
                <div className="text-[10px] text-text-dim font-mono mb-1.5 uppercase tracking-wider">
                  {team?.name || taskState.teamId}
                </div>
                <div className="space-y-1.5">
                  {taskState.tasks.map((task) => {
                    const execKey = `${taskState.teamId}:${task.id}`
                    const isExec = executions?.has(execKey) ?? false
                    const output = outputHistory?.get(execKey)
                    const lastLine = output && output.length > 0
                      ? output[output.length - 1]?.data
                      : null

                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        teamId={taskState.teamId}
                        members={members}
                        isExecuting={isExec}
                        lastOutput={lastLine}
                        onViewOutput={onViewOutput}
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}

          {totalTasks === 0 && teams.length > 0 && (
            <div className="text-[10px] text-text-dim font-mono text-center py-4">
              No tasks yet. Create one above.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
