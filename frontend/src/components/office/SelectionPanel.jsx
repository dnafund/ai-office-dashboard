/**
 * SelectionPanel - UI panel showing selected agents with bulk actions
 */

const AGENT_CHARACTERS = {
  'team-lead': 'capybara',
  'general-purpose': 'human',
  'Explore': 'penguin',
  'code-reviewer': 'duck',
  'python-reviewer': 'duck',
  'go-reviewer': 'duck',
  'security-reviewer': 'duck',
  'tdd-guide': 'chicken',
  'e2e-runner': 'chicken',
  'planner': 'capybara',
  'architect': 'capybara',
}

const CHARACTER_EMOJI = {
  capybara: '\uD83E\uDDAB',
  human: '\uD83E\uDDD1\u200D\uD83D\uDCBB',
  penguin: '\uD83D\uDC27',
  duck: '\uD83E\uDD86',
  chicken: '\uD83D\uDC14',
}

function resolveAgentDetails(selectedAgents, teams) {
  return Array.from(selectedAgents)
    .map((agentId) => {
      for (const team of teams) {
        const member = (team.members || []).find(
          (m) =>
            `${team.id}-${m.name}` === agentId ||
            `${team.name}-${m.name}` === agentId
        )
        if (member) {
          return { ...member, teamName: team.name, teamId: team.id }
        }
      }
      return null
    })
    .filter(Boolean)
}

export function SelectionPanel({
  selectedAgents,
  teams,
  onDeselectAll,
  onSelectAll,
}) {
  if (selectedAgents.size === 0) return null

  const agents = resolveAgentDetails(selectedAgents, teams)

  return (
    <div className="glass-panel rounded-lg p-4 max-w-xs page-enter">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm tracking-wider text-glow flex items-center gap-2">
          Selected
          <span className="text-xs text-text-dim font-mono">
            ({selectedAgents.size})
          </span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={onSelectAll}
            className="text-[10px] px-2 py-1 rounded bg-green-600/20 hover:bg-green-600/40 text-green-400 font-mono transition-colors"
          >
            All
          </button>
          <button
            onClick={onDeselectAll}
            className="text-[10px] px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-text-dim hover:text-white font-mono transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-1.5 max-h-52 overflow-y-auto">
        {agents.map((agent) => {
          const charType = AGENT_CHARACTERS[agent.agentType] || 'human'
          const emoji = CHARACTER_EMOJI[charType] || '\uD83E\uDDD1\u200D\uD83D\uDCBB'

          return (
            <div
              key={`${agent.teamId || agent.teamName}-${agent.name}`}
              className="flex items-center gap-2 px-2 py-1.5 rounded bg-white/5 hover:bg-white/8 transition-colors"
            >
              <span className="text-sm">{emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-white truncate">
                  {agent.name}
                </div>
                <div className="text-[10px] text-text-dim truncate">
                  {agent.teamName} &middot; {agent.agentType}
                </div>
              </div>
              {agent.isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 ml-auto flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
