import { cn } from '../../utils/cn.js'
import { getAgentColor } from '../office/SpriteSheet.js'

const MODEL_LABELS = {
  sonnet: 'Sonnet',
  opus: 'Opus',
  haiku: 'Haiku',
}

export function AgentCard({ member, isLead }) {
  const colors = getAgentColor(member.agentType)
  const isActive = member.isActive !== false

  return (
    <div
      className={cn(
        'glass-card rounded-lg p-4 min-w-[180px] card-stagger',
        isLead && 'border-purple-500/30',
        !isActive && 'opacity-50'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.body }}
        />
        <span className="font-mono text-sm font-medium truncate">
          {member.name}
        </span>
        {isActive ? (
          <div className="live-dot ml-auto" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-gray-600 ml-auto" />
        )}
      </div>

      {/* Details */}
      <div className="space-y-1 text-xs text-text-muted">
        <div className="flex justify-between">
          <span>Type</span>
          <span className="font-mono text-text-main">
            {member.agentType}
          </span>
        </div>
        {member.model && (
          <div className="flex justify-between">
            <span>Model</span>
            <span className="font-mono text-text-main">
              {MODEL_LABELS[member.model] ?? member.model}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Status</span>
          <span
            className={cn(
              'font-mono',
              isActive ? 'text-profit' : 'text-text-dim'
            )}
          >
            {isActive ? 'Active' : 'Idle'}
          </span>
        </div>
      </div>

      {/* Lead badge */}
      {isLead && (
        <div className="mt-2 text-[10px] font-mono uppercase tracking-widest text-purple-400 text-center">
          Team Lead
        </div>
      )}
    </div>
  )
}
