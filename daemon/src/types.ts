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

export interface Task {
  readonly id: string
  readonly subject: string
  readonly description: string
  readonly status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  readonly owner?: string
  readonly blocks: readonly string[]
  readonly blockedBy: readonly string[]
  readonly metadata?: Record<string, unknown>
}

export interface TaskState {
  readonly teamId: string
  readonly tasks: readonly Task[]
}

export interface DashboardState {
  readonly teams: readonly TeamState[]
  readonly activity: readonly ActivityMessage[]
  readonly tasks: readonly TaskState[]
  readonly sessions: readonly SessionInfo[]
  readonly projects: readonly ProjectConfig[]
  readonly timestamp: number
}

// ─── Project types ─────────────────────────────────────────

export interface ProjectConfig {
  readonly id: string
  readonly name: string
  readonly path: string
  readonly color: string
  readonly createdAt: number
}

// ─── Session types ──────────────────────────────────────────

export type SessionState = 'starting' | 'idle' | 'busy' | 'stopping' | 'dead'

export interface SessionInfo {
  readonly sessionId: string
  readonly pid?: number
  readonly state: SessionState
  readonly createdAt: number
  readonly lastActiveAt: number
  readonly currentTaskKey?: string
  readonly totalTasksCompleted: number
  readonly projectDir: string
}

export interface DispatchResult {
  readonly sessionId: string
  readonly taskKey: string
  readonly dispatched: boolean
  readonly reason?: string
}

export interface DispatchRequest {
  readonly teamId: string
  readonly taskId: string
  readonly agentName: string
  readonly prompt: string
  readonly preferNewSession?: boolean
  readonly projectId?: string
}

// ─── Execution types ────────────────────────────────────────

export type ExecutionStatus = 'running' | 'completed' | 'failed' | 'cancelled'

export interface ExecutionInfo {
  readonly taskId: string
  readonly teamId: string
  readonly agentName: string
  readonly status: ExecutionStatus
  readonly startedAt: number
  readonly pid?: number
}

export interface ExecutionOutputMessage {
  readonly type: 'execution_start'
  readonly teamId: string
  readonly taskId: string
  readonly agentName: string
}

export interface ExecutionDataMessage {
  readonly type: 'execution_output'
  readonly teamId: string
  readonly taskId: string
  readonly data: string
  readonly stream: 'stdout' | 'stderr'
}

export interface ExecutionEndMessage {
  readonly type: 'execution_end'
  readonly teamId: string
  readonly taskId: string
  readonly exitCode: number | null
  readonly signal: string | null
}

export interface SessionStateMessage {
  readonly type: 'session_state'
  readonly sessions: readonly SessionInfo[]
}

export interface DispatchResultMessage {
  readonly type: 'dispatch_result'
  readonly result: DispatchResult
}

export interface WsMessage {
  readonly type: 'update' | 'refresh'
  readonly teams?: readonly TeamState[]
  readonly activity?: readonly ActivityMessage[]
  readonly tasks?: readonly TaskState[]
  readonly sessions?: readonly SessionInfo[]
  readonly projects?: readonly ProjectConfig[]
  readonly timestamp?: number
}

export type WsBroadcastMessage =
  | WsMessage
  | ExecutionOutputMessage
  | ExecutionDataMessage
  | ExecutionEndMessage
  | SessionStateMessage
  | DispatchResultMessage
