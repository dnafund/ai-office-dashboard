export interface TeamMember {
  readonly agentId: string
  readonly name: string
  readonly agentType: string
  readonly model?: string
  readonly color?: string
  readonly isActive?: boolean
  readonly joinedAt?: number
  readonly cwd?: string
  readonly planModeRequired?: boolean
}

export interface TeamConfig {
  readonly name: string
  readonly createdAt: number
  readonly leadAgentId: string
  readonly leadSessionId?: string
  readonly members: readonly TeamMember[]
}

export interface TeamState {
  readonly id: string
  readonly name: string
  readonly createdAt: number
  readonly leadAgentId: string
  readonly members: readonly TeamMember[]
}

export interface ActivityMessage {
  readonly from: string
  readonly text: string
  readonly summary?: string
  readonly timestamp: string
  readonly color?: string
  readonly teamId: string
}

export interface DashboardState {
  readonly teams: readonly TeamState[]
  readonly activity: readonly ActivityMessage[]
  readonly timestamp: number
}

export interface WsMessage {
  readonly type: 'update' | 'refresh'
  readonly teams?: readonly TeamState[]
  readonly activity?: readonly ActivityMessage[]
  readonly timestamp?: number
}
