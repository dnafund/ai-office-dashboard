import { useEffect } from 'react'

export function Toast({ message, duration = 1500, onDismiss }) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => onDismiss?.(), duration)
    return () => clearTimeout(timer)
  }, [message, duration, onDismiss])

  if (!message) return null

  return (
    <div className="glass-panel rounded-lg px-4 py-2 toast-enter">
      <span className="text-xs font-mono text-green-400">{message}</span>
    </div>
  )
}
