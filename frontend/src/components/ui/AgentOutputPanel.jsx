/**
 * AgentOutputPanel - Real-time streaming output viewer for task executions
 */

import { useRef, useEffect, useCallback, useState } from 'react'

const STREAM_COLORS = {
  stdout: 'text-white',
  stderr: 'text-red-400',
  system: 'text-blue-400',
}

function OutputLine({ entry }) {
  const colorClass = STREAM_COLORS[entry.stream] || STREAM_COLORS.stdout

  // Try to parse stream-json format for readable display
  let displayText = entry.data
  try {
    const parsed = JSON.parse(entry.data)
    if (parsed.type === 'assistant' && parsed.message?.content) {
      const textParts = parsed.message.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text)
      if (textParts.length > 0) {
        displayText = textParts.join('')
      }
    } else if (parsed.type === 'result' && parsed.result) {
      displayText = `[Result] ${parsed.result.slice(0, 200)}`
    }
  } catch {
    // Not JSON, use raw text
  }

  return (
    <div className={`text-[10px] font-mono leading-relaxed ${colorClass} whitespace-pre-wrap break-all`}>
      {displayText}
    </div>
  )
}

function ElapsedTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  return (
    <span className="text-[10px] text-text-dim font-mono">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  )
}

export function AgentOutputPanel({
  teamId,
  taskId,
  outputHistory,
  executions,
  onClose,
  onClear,
}) {
  const scrollRef = useRef(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const key = `${teamId}:${taskId}`
  const lines = outputHistory?.get(key) ?? []
  const execution = executions?.get(key)
  const isRunning = Boolean(execution)

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines.length, autoScroll])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const atBottom = scrollHeight - scrollTop - clientHeight < 40
    setAutoScroll(atBottom)
  }, [])

  const handleClear = useCallback(() => {
    onClear?.(teamId, taskId)
  }, [teamId, taskId, onClear])

  if (!teamId || !taskId) return null

  return (
    <div className="glass-panel rounded-lg p-4 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-xs tracking-wider text-glow flex items-center gap-2">
          Output
          {isRunning && (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}
          {isRunning && execution?.startedAt && (
            <ElapsedTimer startedAt={execution.startedAt} />
          )}
          {!isRunning && lines.length > 0 && (
            <span className="text-[10px] text-text-dim font-mono">
              {lines.length} lines
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {execution?.agentName && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-mono">
              {execution.agentName}
            </span>
          )}
          <button
            onClick={handleClear}
            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 text-text-dim hover:text-white font-mono transition-colors"
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-white text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Output area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="bg-black/40 rounded border border-white/5 p-2 max-h-64 overflow-y-auto"
      >
        {lines.length === 0 ? (
          <div className="text-[10px] text-text-dim font-mono text-center py-8">
            {isRunning ? 'Waiting for output...' : 'No output yet.'}
          </div>
        ) : (
          lines.map((entry, i) => (
            <OutputLine key={i} entry={entry} />
          ))
        )}
      </div>

      {/* Auto-scroll indicator */}
      {!autoScroll && lines.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true)
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }
          }}
          className="mt-1 text-[9px] text-blue-400/60 hover:text-blue-400 font-mono transition-colors"
        >
          ↓ Scroll to bottom
        </button>
      )}
    </div>
  )
}
