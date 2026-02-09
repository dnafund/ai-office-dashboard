import { cn } from '../../utils/cn.js'

export function StatusBar({ teams, connected }) {
  const totalAgents = teams.reduce((sum, t) => sum + t.members.length, 0)
  const activeAgents = teams.reduce(
    (sum, t) => sum + t.members.filter((m) => m.isActive !== false).length,
    0
  )

  return (
    <div className="glass-panel rounded-lg px-4 py-2 flex items-center gap-6 text-xs font-mono">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-profit' : 'bg-loss'
          )}
        />
        <span className="text-text-muted">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Teams */}
      <div className="flex items-center gap-2">
        <span className="text-text-dim">Teams</span>
        <span className="text-text-main">{teams.length}</span>
      </div>

      <div className="w-px h-4 bg-white/10" />

      {/* Agents */}
      <div className="flex items-center gap-2">
        <span className="text-text-dim">Agents</span>
        <span className="text-text-main">
          {activeAgents}/{totalAgents}
        </span>
      </div>

      {/* Team names */}
      <div className="ml-auto flex items-center gap-3 text-text-dim">
        {teams.map((team) => (
          <span key={team.id} className="text-text-muted">
            {team.name}
          </span>
        ))}
      </div>
    </div>
  )
}
