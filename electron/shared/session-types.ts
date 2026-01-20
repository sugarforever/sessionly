/**
 * Claude Code Session Types
 *
 * TypeScript interfaces for parsing and displaying Claude Code CLI session history
 * stored as JSONL files in ~/.claude/projects/
 */

// ============================================================================
// Raw JSONL Message Types (as stored in .jsonl files)
// ============================================================================

/**
 * Text content block in a message
 */
export interface TextBlock {
  type: 'text'
  text: string
}

/**
 * Thinking content block (extended thinking)
 */
export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  signature?: string
}

/**
 * Tool use content block (assistant invoking a tool)
 */
export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
  agentId?: string // Link to subagent if this is a Task tool
}

/**
 * Tool result content types
 */
export type ToolResultContentItem = { type: 'text'; text: string } | { type: 'image'; source: unknown }
export type ToolResultContent = string | ToolResultContentItem[]

/**
 * Tool result content block (result from tool execution)
 */
export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: ToolResultContent
  is_error?: boolean
}

/**
 * Union of all content block types
 */
export type ContentBlock = TextBlock | ThinkingBlock | ToolUseBlock | ToolResultBlock

/**
 * Message structure within JSONL (role-based)
 */
export interface RawMessageContent {
  role: 'user' | 'assistant'
  content: string | ContentBlock[]
  model?: string
  id?: string
  type?: 'message'
  stop_reason?: string | null
  stop_sequence?: string | null
  usage?: {
    input_tokens: number
    output_tokens: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

/**
 * Todo item in session
 */
export interface SessionTodo {
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  activeForm: string
}

/**
 * File history snapshot (tracked file state)
 */
export interface FileHistorySnapshot {
  type: 'file-history-snapshot'
  messageId: string
  snapshot: {
    messageId: string
    trackedFileBackups: Record<string, unknown>
    timestamp: string
  }
  isSnapshotUpdate: boolean
}

/**
 * User message entry in JSONL
 */
export interface RawUserMessage {
  type: 'user'
  uuid: string
  parentUuid: string | null
  timestamp: string
  sessionId: string
  cwd: string
  version: string
  gitBranch?: string
  isSidechain: boolean
  userType: 'external' | 'internal'
  message: RawMessageContent
  thinkingMetadata?: {
    level: string
    disabled: boolean
    triggers: string[]
  }
  todos?: SessionTodo[]
}

/**
 * Assistant message entry in JSONL
 */
export interface RawAssistantMessage {
  type: 'assistant'
  uuid: string
  parentUuid: string
  timestamp: string
  sessionId: string
  cwd: string
  version: string
  gitBranch?: string
  isSidechain: boolean
  userType: 'external' | 'internal'
  message: RawMessageContent
  requestId?: string
}

/**
 * Progress message type (for parsing subagent links)
 */
export interface ProgressMessage {
  type: 'progress'
  data: {
    agentId: string
    type: string
  }
  parentToolUseID: string
}

/**
 * Union of all JSONL entry types
 */
export type RawJSONLEntry =
  | FileHistorySnapshot
  | RawUserMessage
  | RawAssistantMessage
  | ProgressMessage

// ============================================================================
// Processed Types (for UI rendering)
// ============================================================================

/**
 * Processed message for UI display
 */
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
  isStreaming?: boolean
}

/**
 * Subagent session for inline display within Task tool calls
 */
export interface SubagentSession {
  agentId: string
  parentToolUseId: string
  messages: ProcessedMessage[]
  messageCount: number
}

/**
 * Session summary for list view
 */
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

/**
 * Full session with all messages
 */
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
  subagents: Record<string, SubagentSession> // keyed by agentId
}

/**
 * Project with sessions grouped together
 */
export interface ProjectGroup {
  project: string
  projectEncoded: string
  sessions: SessionSummary[]
}

// ============================================================================
// Helper type guards
// ============================================================================

export function isFileHistorySnapshot(entry: RawJSONLEntry): entry is FileHistorySnapshot {
  return entry.type === 'file-history-snapshot'
}

export function isProgressMessage(entry: RawJSONLEntry): entry is ProgressMessage {
  return (
    entry.type === 'progress' &&
    'data' in entry &&
    typeof (entry as ProgressMessage).data?.agentId === 'string'
  )
}

export function isUserMessage(entry: RawJSONLEntry): entry is RawUserMessage {
  return entry.type === 'user'
}

export function isAssistantMessage(entry: RawJSONLEntry): entry is RawAssistantMessage {
  return entry.type === 'assistant'
}

export function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === 'text'
}

export function isThinkingBlock(block: ContentBlock): block is ThinkingBlock {
  return block.type === 'thinking'
}

export function isToolUseBlock(block: ContentBlock): block is ToolUseBlock {
  return block.type === 'tool_use'
}

export function isToolResultBlock(block: ContentBlock): block is ToolResultBlock {
  return block.type === 'tool_result'
}
