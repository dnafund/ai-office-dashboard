import { useState, useCallback } from 'react'
import { cn } from '../../utils/cn.js'
import { createTeam, deleteTeam, addAgent, removeAgent } from '../../api/teams.js'
import { getCharacterType } from '../office/SpriteSheet.js'

// Agent types grouped by character
const AGENT_PRESETS = [
  { type: 'controller', char: 'capybara', emoji: '🦫', label: 'Controller' },
  { type: 'architect', char: 'capybara', emoji: '🦫', label: 'Architect' },
  { type: 'general-purpose', char: 'human', emoji: '🧑‍💻', label: 'Coder' },
  { type: 'Explore', char: 'penguin', emoji: '🐧', label: 'Explorer' },
  { type: 'code-reviewer', char: 'duck', emoji: '🦆', label: 'Reviewer' },
  { type: 'tester', char: 'chicken', emoji: '🐔', label: 'Tester' },
]

export function AgentPanel({ teams, connected }) {
  const [showPanel, setShowPanel] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [addingTo, setAddingTo] = useState(null) // teamId
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentType, setNewAgentType] = useState('general-purpose')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const clearError = useCallback(() => setError(null), [])

  const handleCreateTeam = useCallback(async () => {
    if (!newTeamName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createTeam(newTeamName.trim())
      setNewTeamName('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [newTeamName])

  const handleDeleteTeam = useCallback(async (teamId) => {
    setLoading(true)
    setError(null)
    try {
      await deleteTeam(teamId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAddAgent = useCallback(async (teamId) => {
    if (!newAgentName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await addAgent(teamId, newAgentName.trim(), newAgentType)
      setNewAgentName('')
      setAddingTo(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [newAgentName, newAgentType])

  const handleRemoveAgent = useCallback(async (teamId, agentId) => {
    setLoading(true)
    setError(null)
    try {
      await removeAgent(teamId, agentId)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const selectedPreset = AGENT_PRESETS.find((p) => p.type === newAgentType)

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        className="glass-panel rounded-lg px-4 py-2 text-xs font-mono text-text-muted hover:text-white transition-colors flex items-center gap-2"
      >
        <span>⚙️</span>
        <span>Manage Agents</span>
      </button>
    )
  }

  return (
    <div className="glass-panel rounded-lg p-4 page-enter space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-wider text-glow flex items-center gap-2">
          ⚙️ Agent Manager
        </h3>
        <button
          onClick={() => setShowPanel(false)}
          className="text-text-dim hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="text-xs text-red-400 bg-red-400/10 rounded px-3 py-2 flex items-center justify-between cursor-pointer"
          onClick={clearError}
        >
          <span>{error}</span>
          <span className="text-red-400/50">✕</span>
        </div>
      )}

      {/* Create Team */}
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-wider text-text-dim">
          New Team
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateTeam()}
            placeholder="team name..."
            className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-white placeholder:text-text-dim focus:outline-none focus:border-purple-500/50"
            disabled={loading}
          />
          <button
            onClick={handleCreateTeam}
            disabled={loading || !newTeamName.trim()}
            className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded text-xs font-mono transition-colors disabled:opacity-40"
          >
            + Create
          </button>
        </div>
      </div>

      {/* Teams list */}
      <div className="space-y-3">
        {teams.length === 0 && (
          <p className="text-xs text-text-dim text-center py-4">
            No teams yet. Create one above!
          </p>
        )}

        {teams.map((team) => (
          <div key={team.id} className="bg-white/3 rounded-lg p-3 space-y-2">
            {/* Team header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs">👥</span>
                <span className="text-xs font-mono font-medium text-white">
                  {team.name ?? team.id}
                </span>
                <span className="text-[10px] text-text-dim">
                  ({team.members?.length ?? 0})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setAddingTo(addingTo === team.id ? null : team.id)
                  }
                  className="text-[10px] px-2 py-0.5 rounded bg-green-600/20 hover:bg-green-600/40 text-green-400 font-mono transition-colors"
                >
                  + Agent
                </button>
                <button
                  onClick={() => handleDeleteTeam(team.id)}
                  disabled={loading}
                  className="text-[10px] px-2 py-0.5 rounded bg-red-600/20 hover:bg-red-600/40 text-red-400 font-mono transition-colors disabled:opacity-40"
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Add agent form */}
            {addingTo === team.id && (
              <div className="bg-white/5 rounded p-2 space-y-2 page-enter">
                {/* Name input */}
                <input
                  type="text"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && handleAddAgent(team.id)
                  }
                  placeholder="agent name..."
                  className="w-full bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-white placeholder:text-text-dim focus:outline-none focus:border-purple-500/50"
                  disabled={loading}
                  autoFocus
                />

                {/* Character picker */}
                <div className="flex flex-wrap gap-1">
                  {AGENT_PRESETS.map((preset) => (
                    <button
                      key={preset.type}
                      onClick={() => setNewAgentType(preset.type)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-all',
                        newAgentType === preset.type
                          ? 'bg-purple-600/40 text-white border border-purple-500/50'
                          : 'bg-white/5 text-text-dim hover:text-white hover:bg-white/10 border border-transparent'
                      )}
                    >
                      <span>{preset.emoji}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>

                {/* Selected info + submit */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-dim">
                    {selectedPreset?.emoji} {selectedPreset?.char} →{' '}
                    {selectedPreset?.label}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setAddingTo(null)}
                      className="text-[10px] px-2 py-1 rounded bg-white/5 text-text-dim hover:text-white font-mono transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleAddAgent(team.id)}
                      disabled={loading || !newAgentName.trim()}
                      className="text-[10px] px-3 py-1 rounded bg-green-600/30 hover:bg-green-600/50 text-green-300 font-mono transition-colors disabled:opacity-40"
                    >
                      Add {selectedPreset?.emoji}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Agent list */}
            {team.members?.length > 0 && (
              <div className="space-y-1">
                {team.members.map((member) => {
                  const charType = getCharacterType(member.agentType)
                  const preset = AGENT_PRESETS.find(
                    (p) => p.type === member.agentType
                  )
                  const emoji = preset?.emoji ?? '🧑‍💻'

                  return (
                    <div
                      key={member.agentId}
                      className="flex items-center justify-between px-2 py-1 rounded bg-white/3 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{emoji}</span>
                        <span className="text-xs font-mono text-text-muted">
                          {member.name}
                        </span>
                        <span className="text-[9px] text-text-dim">
                          {charType}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleRemoveAgent(team.id, member.agentId)
                        }
                        disabled={loading}
                        className="text-[10px] px-1.5 py-0.5 rounded text-red-400/50 hover:text-red-400 hover:bg-red-600/20 opacity-0 group-hover:opacity-100 transition-all font-mono disabled:opacity-40"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
