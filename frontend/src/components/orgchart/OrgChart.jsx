import { AgentCard } from './AgentCard.jsx'

export function OrgChart({ teams }) {
  if (teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-dim">
        <div className="text-center page-enter">
          <div className="text-4xl mb-4">🏢</div>
          <h3 className="text-lg font-display mb-2">No Active Teams</h3>
          <p className="text-sm font-body max-w-sm">
            Spawn a team using Claude Code to see agents appear here.
          </p>
          <code className="block mt-3 text-xs font-mono text-text-muted bg-white/5 px-3 py-2 rounded">
            TeamCreate {`{team_name: "my-team"}`}
          </code>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 page-enter overflow-auto max-h-[calc(100vh-140px)]">
      {teams.map((team) => {
        const lead = team.members.find(
          (m) => m.agentId === team.leadAgentId
        )
        const workers = team.members.filter(
          (m) => m.agentId !== team.leadAgentId
        )

        return (
          <div key={team.id} className="space-y-4">
            {/* Team header */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-display text-glow">
                {team.name}
              </h2>
              <span className="text-xs font-mono text-text-dim">
                {team.members.length} agent{team.members.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Org tree */}
            <div className="flex flex-col items-center gap-4">
              {/* Lead */}
              {lead && (
                <div className="relative">
                  <AgentCard member={lead} isLead />
                  {workers.length > 0 && (
                    <div className="absolute left-1/2 bottom-0 w-px h-4 bg-white/20 transform translate-y-full" />
                  )}
                </div>
              )}

              {/* Connector line */}
              {workers.length > 0 && (
                <div className="relative w-full flex justify-center">
                  <div
                    className="h-px bg-white/20"
                    style={{
                      width: `${Math.min(workers.length * 200, 800)}px`,
                    }}
                  />
                </div>
              )}

              {/* Workers */}
              {workers.length > 0 && (
                <div className="flex flex-wrap justify-center gap-4">
                  {workers.map((member) => (
                    <div key={member.agentId} className="relative">
                      <div className="absolute left-1/2 top-0 w-px h-4 bg-white/20 transform -translate-y-full" />
                      <AgentCard member={member} isLead={false} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
