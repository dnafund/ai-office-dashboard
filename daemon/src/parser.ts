import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TeamConfig, TeamState } from './types.js'

export async function parseTeamConfig(
  teamDir: string,
  teamId: string
): Promise<TeamState | null> {
  try {
    const configPath = join(teamDir, teamId, 'config.json')
    const raw = await readFile(configPath, 'utf-8')
    const config: TeamConfig = JSON.parse(raw)

    return {
      id: teamId,
      name: config.name,
      createdAt: config.createdAt,
      leadAgentId: config.leadAgentId,
      members: config.members ?? [],
    }
  } catch {
    return null
  }
}

export async function parseAllTeams(
  teamsDir: string,
  teamIds: readonly string[]
): Promise<readonly TeamState[]> {
  const results = await Promise.all(
    teamIds.map((id) => parseTeamConfig(teamsDir, id))
  )
  return results.filter((t): t is TeamState => t !== null)
}
