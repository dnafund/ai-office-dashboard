import { cn } from '../../utils/cn.js'

const ROOM_COMMANDS = [
  { room: null, label: 'Auto', icon: '🤖' },
  { room: 'Lounge', label: 'Lounge', icon: '☕' },
  { room: 'War Room', label: 'War Room', icon: '⚔️' },
  { room: 'Code Lab', label: 'Code Lab', icon: '💻' },
  { room: 'Library', label: 'Library', icon: '📚' },
  { room: 'QA Room', label: 'QA Room', icon: '🧪' },
]

export function Header({ connected, currentRoom, onRoomCommand }) {
  return (
    <header className="glass-panel rounded-lg px-6 py-3 flex items-center gap-4">
      {/* Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-2xl">🏢</span>
        <h1 className="text-lg font-display tracking-wider text-glow">
          AI Office
        </h1>
      </div>

      {/* Room commands */}
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 ml-2">
        {ROOM_COMMANDS.map((cmd) => (
          <button
            key={cmd.label}
            onClick={() => onRoomCommand?.(cmd.room)}
            className={cn(
              'px-2 py-1 rounded text-[10px] font-mono transition-all',
              currentRoom === cmd.room
                ? 'bg-white/15 text-white'
                : 'text-text-dim hover:text-text-muted hover:bg-white/5'
            )}
            title={cmd.room ? `Move all agents to ${cmd.room}` : 'Auto-assign rooms'}
          >
            {cmd.icon}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status */}
      <div className="flex items-center gap-2">
        <div
          className={cn(
            connected ? 'live-dot' : 'live-dot live-dot--danger'
          )}
        />
        <span className="text-xs font-mono text-text-muted">
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>
    </header>
  )
}
