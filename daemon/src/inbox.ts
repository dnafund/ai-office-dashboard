import { readFile, readdir, access } from 'node:fs/promises'
import { join } from 'node:path'
import type { ActivityMessage } from './types.js'

interface RawInboxMessage {
  readonly from: string
  readonly text: string
  readonly summary?: string
  readonly timestamp: string
  readonly color?: string
  readonly read?: boolean
}

function isActivityMessage(msg: RawInboxMessage): boolean {
  // Skip idle notifications and permission requests
  try {
    const parsed = JSON.parse(msg.text)
    if (parsed.type === 'idle_notification') return false
    if (parsed.type === 'permission_request') return false
    if (parsed.type === 'shutdown_approved') return false
    if (parsed.type === 'shutdown_request') return false
  } catch {
    // Not JSON — it's a real text message, keep it
  }
  return true
}

function extractSummary(msg: RawInboxMessage): string {
  if (msg.summary) return msg.summary

  // Try to extract first meaningful line from text
  const text = msg.text
  const firstLine = text.split('\n').find((l) => l.trim().length > 0) ?? ''
  const cleaned = firstLine.replace(/^#+\s*/, '').trim()
  return cleaned.length > 80 ? cleaned.slice(0, 77) + '...' : cleaned
}

export async function readTeamActivity(
  teamsDir: string,
  teamId: string
): Promise<readonly ActivityMessage[]> {
  const inboxDir = join(teamsDir, teamId, 'inboxes')

  try {
    await access(inboxDir)
  } catch {
    return []
  }

  const messages: ActivityMessage[] = []

  try {
    const files = await readdir(inboxDir)

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      try {
        const raw = await readFile(join(inboxDir, file), 'utf-8')
        const inbox: readonly RawInboxMessage[] = JSON.parse(raw)

        for (const msg of inbox) {
          if (!isActivityMessage(msg)) continue

          messages.push({
            from: msg.from,
            text: extractSummary(msg),
            summary: msg.summary,
            timestamp: msg.timestamp,
            color: msg.color,
            teamId,
          })
        }
      } catch {
        // Skip corrupt inbox files
      }
    }
  } catch {
    // Inbox dir read failed
  }

  // Sort by timestamp desc, take latest 20
  return messages
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20)
}

export async function readAllActivity(
  teamsDir: string,
  teamIds: readonly string[]
): Promise<readonly ActivityMessage[]> {
  const allMessages = await Promise.all(
    teamIds.map((id) => readTeamActivity(teamsDir, id))
  )

  return allMessages
    .flat()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30)
}
