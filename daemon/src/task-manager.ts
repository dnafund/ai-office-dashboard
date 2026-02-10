// task-manager.ts — Task CRUD with atomic writes
// Creates, updates, and deletes task JSON files under ~/.claude/tasks/{teamId}/

import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { tmpdir } from 'node:os'
import type { Task } from './types.js'

function generateId(): string {
  return randomBytes(4).toString('hex')
}

function validatePathSegment(value: string, label: string): void {
  if (!value || value.includes('..') || value.includes('/') || value.includes('\\')) {
    throw new Error(`Invalid ${label}`)
  }
}

function validateSubject(subject: string): void {
  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    throw new Error('Task subject is required')
  }
  if (subject.length > 200) {
    throw new Error('Task subject must be 200 characters or fewer')
  }
}

async function atomicWrite(filePath: string, data: string): Promise<void> {
  const tempPath = join(tmpdir(), `task-${generateId()}.tmp`)
  await writeFile(tempPath, data, 'utf-8')
  await writeFile(filePath, data, 'utf-8')
  try {
    await unlink(tempPath)
  } catch {
    // Temp cleanup is best-effort
  }
}

async function ensureDir(dirPath: string): Promise<void> {
  try {
    await mkdir(dirPath, { recursive: true })
  } catch {
    // Directory may already exist
  }
}

export async function createTask(
  tasksDir: string,
  teamId: string,
  subject: string,
  description: string = '',
  owner?: string
): Promise<Task> {
  validatePathSegment(teamId, 'teamId')
  validateSubject(subject)

  const id = generateId()
  const task: Task = {
    id,
    subject: subject.trim(),
    description: description.trim(),
    status: 'pending',
    owner: owner ?? undefined,
    blocks: [],
    blockedBy: [],
    metadata: {
      createdAt: Date.now(),
    },
  }

  const teamDir = join(tasksDir, teamId)
  await ensureDir(teamDir)

  const filePath = join(teamDir, `${id}.json`)
  await atomicWrite(filePath, JSON.stringify(task, null, 2))

  return task
}

export async function updateTaskStatus(
  tasksDir: string,
  teamId: string,
  taskId: string,
  status: Task['status']
): Promise<Task> {
  validatePathSegment(teamId, 'teamId')
  validatePathSegment(taskId, 'taskId')

  const validStatuses = ['pending', 'in_progress', 'completed', 'blocked'] as const
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`)
  }

  const filePath = join(tasksDir, teamId, `${taskId}.json`)

  try {
    const raw = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw) as Task
    const updated: Task = {
      ...parsed,
      status,
      metadata: {
        ...parsed.metadata,
        updatedAt: Date.now(),
        ...(status === 'completed' ? { completedAt: Date.now() } : {}),
      },
    }

    await atomicWrite(filePath, JSON.stringify(updated, null, 2))
    return updated
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to update task ${taskId}: ${message}`)
  }
}

export async function deleteTask(
  tasksDir: string,
  teamId: string,
  taskId: string
): Promise<void> {
  validatePathSegment(teamId, 'teamId')
  validatePathSegment(taskId, 'taskId')

  const filePath = join(tasksDir, teamId, `${taskId}.json`)

  try {
    await unlink(filePath)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    throw new Error(`Failed to delete task ${taskId}: ${message}`)
  }
}
