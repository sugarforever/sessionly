/**
 * Hook integration types for Claude Code session monitoring
 */

export type PetState = 'idle' | 'working' | 'completed' | 'error'

export interface PetStateInfo {
  state: PetState
  sessionId: string | null
  project: string | null
  lastActivity: number
  message?: string
  // Enhanced context for tooltip
  gitBranch?: string | null
  toolName?: string | null
  errorMessage?: string | null
  activeSessionCount?: number
  hookDriven?: boolean
}

// ============================================================================
// Claude Code Hooks Integration
// ============================================================================

export const HOOK_SERVER_PORT = 19823
export const HOOK_SERVER_PATH = '/sessionly'
export const HOOK_IDENTIFIER = 'localhost:19823/sessionly'

export type HookEventName =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'Stop'
  | 'Notification'

export interface HookEventPayload {
  session_id: string
  hook_event_name: HookEventName
  tool_name?: string
  cwd?: string
  transcript_path?: string
  // Additional fields from Claude Code hook stdin
  [key: string]: unknown
}

export interface HookStatus {
  serverRunning: boolean
  port: number
  hooksInstalled: boolean
}
