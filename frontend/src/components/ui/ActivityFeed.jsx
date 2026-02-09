import { cn } from '../../utils/cn.js'

const COLOR_MAP = {
  blue: 'text-blue-400',
  green: 'text-emerald-400',
  yellow: 'text-amber-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
}

function timeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

export function ActivityFeed({ activity }) {
  if (!activity || activity.length === 0) {
    return (
      <div className="glass-panel rounded-lg p-4">
        <h3 className="font-display text-xs tracking-wider text-text-dim mb-3">
          Activity Feed
        </h3>
        <p className="text-xs text-text-dim text-center py-4">
          No agent activity yet
        </p>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-lg p-4">
      <h3 className="font-display text-xs tracking-wider text-text-dim mb-3">
        Activity Feed
      </h3>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {activity.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${msg.from}-${i}`}
            className={cn(
              'flex items-start gap-2 text-xs py-1.5 px-2 rounded',
              'bg-white/[0.02] border border-white/5',
              i === 0 && 'border-white/10 bg-white/[0.04]'
            )}
          >
            {/* Agent name */}
            <span
              className={cn(
                'font-mono font-medium flex-shrink-0 w-[90px] truncate',
                COLOR_MAP[msg.color] ?? 'text-text-muted'
              )}
            >
              {msg.from}
            </span>

            {/* Message */}
            <span className="text-text-muted flex-1 truncate">
              {msg.text}
            </span>

            {/* Time */}
            <span className="text-text-dim flex-shrink-0 ml-2">
              {timeAgo(msg.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
