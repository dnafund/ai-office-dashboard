import { watch, type FSWatcher } from 'node:fs'
import { readdir, stat, access } from 'node:fs/promises'
import { join } from 'node:path'
import { parseAllTeams } from './parser.js'
import type { TeamState } from './types.js'

type OnChangeCallback = (teams: readonly TeamState[]) => void

export class TeamWatcher {
  private readonly teamsDir: string
  private watcher: FSWatcher | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private onChange: OnChangeCallback | null = null
  private currentTeams: readonly TeamState[] = []

  constructor(teamsDir: string) {
    this.teamsDir = teamsDir
  }

  async start(callback: OnChangeCallback): Promise<void> {
    this.onChange = callback

    await this.ensureDir()
    await this.scan()

    try {
      this.watcher = watch(this.teamsDir, { recursive: true }, () => {
        this.debouncedScan()
      })
    } catch {
      // Fallback: poll every 3 seconds if watch fails
      setInterval(() => this.scan(), 3000)
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }

  getTeams(): readonly TeamState[] {
    return this.currentTeams
  }

  async rescan(): Promise<void> {
    await this.scan()
  }

  private debouncedScan(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => this.scan(), 500)
  }

  private async scan(): Promise<void> {
    try {
      const entries = await readdir(this.teamsDir)
      const teamIds: string[] = []

      for (const entry of entries) {
        const entryPath = join(this.teamsDir, entry)
        const entryStat = await stat(entryPath).catch(() => null)
        if (entryStat?.isDirectory()) {
          teamIds.push(entry)
        }
      }

      this.currentTeams = await parseAllTeams(this.teamsDir, teamIds)
      this.onChange?.(this.currentTeams)
    } catch {
      this.currentTeams = []
      this.onChange?.([])
    }
  }

  private async ensureDir(): Promise<void> {
    try {
      await access(this.teamsDir)
    } catch {
      // Directory doesn't exist yet — that's fine, teams haven't been created
    }
  }
}
