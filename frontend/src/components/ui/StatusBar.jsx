import { cn } from '../../utils/cn.js'

function SessionIndicator({ sessions }) {
  const idle = sessions.filter((s) => s.state === 'idle').length
  const busy = sessions.filter((s) => s.state === 'busy').length
  const total = sessions.length

  if (total === 0) return null

  return (
    <>
      <div className="w-px h-4 bg-white/10" />
      <div className="flex items-center gap-2">
        <span className="text-text-dim">Sessions</span>
        <div className="flex items-center gap-1.5">
          {idle > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 text-[10px]">
              {idle} idle
            </span>
          )}
          {busy > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] animate-pulse">
              {busy} busy
            </span>
          )}
          {total > 0 && idle === 0 && busy === 0 && (
            <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 text-[10px]">
              {total} starting
            </span>
          )}
        </div>
      </div>
    </>
  )
}

function ProjectIndicator({ projects }) {
  if (projects.length === 0) return null

  return (
    <>
      <div className="w-px h-4 bg-white/10" />
      <div className="flex items-center gap-2">
        <span className="text-text-dim">Projects</span>
        <div className="flex items-center gap-1.5">
          {projects.map((p) => (
            <span
              key={p.id}
              className="flex items-center gap-1 text-[10px] text-text-muted"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}

export function StatusBar({ teams, connected, sessions = [], projects = [] }) {
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

      {/* Session pool status */}
      <SessionIndicator sessions={sessions} />

      {/* Project indicators */}
      <ProjectIndicator projects={projects} />

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
