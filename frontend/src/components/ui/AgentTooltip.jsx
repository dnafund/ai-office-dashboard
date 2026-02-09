import { getAgentColor, getCharacterType } from '../office/SpriteSheet.js'

const MODEL_LABELS = {
  sonnet: 'Sonnet 4.5',
  opus: 'Opus 4.6',
  haiku: 'Haiku 4.5',
}

const CHARACTER_EMOJI = {
  capybara: '\uD83E\uDDAB',
  penguin: '\uD83D\uDC27',
  duck: '\uD83E\uDD86',
  chicken: '\uD83D\uDC14',
  human: '\uD83E\uDDD1\u200D\uD83D\uDCBB',
}

export function AgentTooltip({ agent }) {
  if (!agent) return null

  const colors = getAgentColor(agent.agentType)
  const charType = getCharacterType(agent.agentType)
  const emoji = CHARACTER_EMOJI[charType] ?? '\uD83E\uDDD1'
  const isActive = agent.isActive !== false

  return (
    <div className="glass-panel rounded-lg p-3 min-w-[200px] text-xs font-mono page-enter pointer-events-none">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{emoji}</span>
        <span className="font-medium text-sm">{agent.name}</span>
        {isActive && <div className="live-dot ml-auto" />}
      </div>

      {/* Info rows */}
      <div className="space-y-1 text-text-muted">
        <Row label="Character" value={charType} />
        <Row label="Type" value={agent.agentType} />
        <Row
          label="Model"
          value={MODEL_LABELS[agent.model] ?? agent.model}
        />
        <Row label="Room" value={agent.room} />
        <Row
          label="Status"
          value={isActive ? 'Working' : 'Idle'}
          valueClass={isActive ? 'text-profit' : 'text-text-dim'}
        />
      </div>
    </div>
  )
}

function Row({ label, value, valueClass = 'text-text-main' }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  )
}
