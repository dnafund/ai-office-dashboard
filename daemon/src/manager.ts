// Agent manager — create/delete teams and agents by writing to ~/.claude/teams/
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { TeamConfig, TeamMember } from './types.js'

// ─── Team operations ─────────────────────────────────────────

export async function createTeam(
  teamsDir: string,
  teamName: string
): Promise<{ id: string }> {
  const id = teamName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  const teamDir = join(teamsDir, id)

  await mkdir(teamDir, { recursive: true })
  await mkdir(join(teamDir, 'inboxes'), { recursive: true })

  const config: TeamConfig = {
    name: teamName,
    createdAt: Date.now(),
    leadAgentId: 'dashboard',
    members: [],
  }

  await writeFile(
    join(teamDir, 'config.json'),
    JSON.stringify(config, null, 2)
  )

  return { id }
}

export async function deleteTeam(
  teamsDir: string,
  teamId: string
): Promise<void> {
  const teamDir = join(teamsDir, teamId)
  await rm(teamDir, { recursive: true, force: true })
}

// ─── Agent operations ────────────────────────────────────────

async function readConfig(
  teamsDir: string,
  teamId: string
): Promise<TeamConfig> {
  const configPath = join(teamsDir, teamId, 'config.json')
  const raw = await readFile(configPath, 'utf-8')
  return JSON.parse(raw) as TeamConfig
}

async function writeConfig(
  teamsDir: string,
  teamId: string,
  config: TeamConfig
): Promise<void> {
  const configPath = join(teamsDir, teamId, 'config.json')
  await writeFile(configPath, JSON.stringify(config, null, 2))
}

export async function addAgent(
  teamsDir: string,
  teamId: string,
  name: string,
  agentType: string
): Promise<TeamMember> {
  const config = await readConfig(teamsDir, teamId)

  const member: TeamMember = {
    agentId: randomUUID().slice(0, 8),
    name,
    agentType,
    isActive: true,
    joinedAt: Date.now(),
  }

  const updatedConfig: TeamConfig = {
    ...config,
    members: [...config.members, member],
  }

  await writeConfig(teamsDir, teamId, updatedConfig)
  return member
}

export async function removeAgent(
  teamsDir: string,
  teamId: string,
  agentId: string
): Promise<void> {
  const config = await readConfig(teamsDir, teamId)

  const updatedConfig: TeamConfig = {
    ...config,
    members: config.members.filter((m) => m.agentId !== agentId),
  }

  await writeConfig(teamsDir, teamId, updatedConfig)
}

export async function updateAgent(
  teamsDir: string,
  teamId: string,
  agentId: string,
  updates: { name?: string; agentType?: string; isActive?: boolean }
): Promise<void> {
  const config = await readConfig(teamsDir, teamId)

  const updatedConfig: TeamConfig = {
    ...config,
    members: config.members.map((m) =>
      m.agentId === agentId ? { ...m, ...updates } : m
    ),
  }

  await writeConfig(teamsDir, teamId, updatedConfig)
}
