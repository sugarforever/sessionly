/**
 * Claude Code Session Types - shared between Tauri backend and React frontend
 * These match the Rust types serialized as JSON from the backend
 */

export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  signature?: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  agentId?: string
}

export type ToolResultContentItem = { type: 'text'; text: string } | { type: 'image'; source: unknown }
export type ToolResultContent = string | ToolResultContentItem[]

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: ToolResultContent
  is_error?: boolean
}

export type ContentBlock = { type: 'text'; text: string } | ThinkingBlock | ToolUseBlock | ToolResultBlock

export interface ProcessedMessage {
  uuid: string
  parentUuid: string | null
  timestamp: string
  role: 'user' | 'assistant'
  textContent: string
  thinkingBlocks: ThinkingBlock[]
  toolUseBlocks: ToolUseBlock[]
  toolResults: Record<string, ToolResultBlock>
  model?: string
}

export interface SubagentSession {
  agentId: string
  parentToolUseId: string
  messages: ProcessedMessage[]
  messageCount: number
}

export interface SessionSummary {
  id: string
  project: string
  projectEncoded: string
  firstMessage: string
  messageCount: number
  startTime: number | null
  endTime: number | null
  gitBranch: string | null
  model: string | null
  filePath: string
}

export interface Session {
  id: string
  project: string
  projectEncoded: string
  gitBranch: string | null
  cwd: string
  version: string
  startTime: number | null
  endTime: number | null
  messages: ProcessedMessage[]
  filePath: string
  subagents: Record<string, SubagentSession>
}

export interface ProjectGroup {
  project: string
  projectEncoded: string
  sessions: SessionSummary[]
}

export interface HookStatus {
  serverRunning: boolean
  port: number
  hooksInstalled: boolean
}
