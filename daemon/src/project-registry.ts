// project-registry.ts — Multi-project registry with JSON persistence
// Stores project configs at ~/.claude/office-projects.json

import { randomUUID } from 'node:crypto'
import { readFile, writeFile, access, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { ProjectConfig } from './types.js'

const STORAGE_DIR = join(homedir(), '.claude')
const STORAGE_PATH = join(STORAGE_DIR, 'office-projects.json')

const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

function pickColor(index: number): string {
  return PROJECT_COLORS[index % PROJECT_COLORS.length] ?? '#3b82f6'
}

export function createProjectRegistry() {
  let projects: readonly ProjectConfig[] = []

  async function load(): Promise<void> {
    try {
      const raw = await readFile(STORAGE_PATH, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        projects = parsed
      }
    } catch {
      projects = []
    }
  }

  async function save(): Promise<void> {
    try {
      await mkdir(STORAGE_DIR, { recursive: true })
      await writeFile(STORAGE_PATH, JSON.stringify(projects, null, 2), 'utf-8')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Failed to save projects: ${msg}`)
    }
  }

  async function validatePath(path: string): Promise<boolean> {
    try {
      await access(path)
      return true
    } catch {
      return false
    }
  }

  async function register(name: string, path: string, color?: string): Promise<ProjectConfig> {
    const valid = await validatePath(path)
    if (!valid) {
      throw new Error(`Path does not exist: ${path}`)
    }

    const existing = projects.find((p) => p.path === path)
    if (existing) {
      throw new Error(`Project already registered at: ${path}`)
    }

    const config: ProjectConfig = {
      id: randomUUID(),
      name: name.trim(),
      path,
      color: color ?? pickColor(projects.length),
      createdAt: Date.now(),
    }

    projects = [...projects, config]
    await save()
    return config
  }

  async function unregister(projectId: string): Promise<boolean> {
    const before = projects.length
    projects = projects.filter((p) => p.id !== projectId)
    if (projects.length === before) return false
    await save()
    return true
  }

  function getById(projectId: string): ProjectConfig | null {
    return projects.find((p) => p.id === projectId) ?? null
  }

  function getByPath(path: string): ProjectConfig | null {
    return projects.find((p) => p.path === path) ?? null
  }

  function getAll(): readonly ProjectConfig[] {
    return projects
  }

  async function ensureDefault(defaultPath: string): Promise<ProjectConfig> {
    const existing = getByPath(defaultPath)
    if (existing) return existing

    const name = defaultPath.split('/').pop() ?? 'default'
    return register(name, defaultPath)
  }

  return {
    load,
    save,
    register,
    unregister,
    getById,
    getByPath,
    getAll,
    ensureDefault,
  }
}

export type ProjectRegistry = ReturnType<typeof createProjectRegistry>
