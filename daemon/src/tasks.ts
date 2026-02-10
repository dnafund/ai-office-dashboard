import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Task, TaskState } from './types.js'

function validatePathSegment(value: string, label: string): void {
  if (!value || value.includes('..') || value.includes('/') || value.includes('\\')) {
    throw new Error(`Invalid ${label}`)
  }
}

export async function readTeamTasks(tasksDir: string, teamId: string): Promise<readonly Task[]> {
  validatePathSegment(teamId, 'teamId')
  const dir = join(tasksDir, teamId)
  try {
    const files = await readdir(dir)
    const jsonFiles = files.filter((f) => f.endsWith('.json') && !f.startsWith('.'))

    const tasks = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const raw = await readFile(join(dir, file), 'utf-8')
          const parsed = JSON.parse(raw)
          return {
            id: parsed.id ?? file.replace('.json', ''),
            subject: parsed.subject ?? '',
            description: parsed.description ?? '',
            status: parsed.status ?? 'pending',
            owner: parsed.owner,
            blocks: parsed.blocks ?? [],
            blockedBy: parsed.blockedBy ?? [],
            metadata: parsed.metadata,
          } as Task
        } catch {
          return null
        }
      })
    )

    return tasks.filter((t): t is Task => t !== null)
  } catch {
    return []
  }
}

export async function readAllTasks(
  tasksDir: string,
  teamIds: readonly string[]
): Promise<readonly TaskState[]> {
  const results = await Promise.all(
    teamIds.map(async (teamId) => ({
      teamId,
      tasks: await readTeamTasks(tasksDir, teamId),
    }))
  )
  return results.filter((r) => r.tasks.length > 0)
}

export async function assignTask(
  tasksDir: string,
  teamId: string,
  taskId: string,
  owner: string
): Promise<void> {
  validatePathSegment(teamId, 'teamId')
  validatePathSegment(taskId, 'taskId')

  const filePath = join(tasksDir, teamId, `${taskId}.json`)
  try {
    const raw = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    const updated = { ...parsed, owner }
    await writeFile(filePath, JSON.stringify(updated, null, 2), 'utf-8')
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to assign task ${taskId}: ${message}`)
  }
}
