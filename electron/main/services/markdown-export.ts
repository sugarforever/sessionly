/**
 * Markdown Export Service
 *
 * Converts Claude Code sessions to Markdown format for export
 */

import { format } from 'date-fns'
import type {
  Session,
  ProcessedMessage,
  SubagentSession,
  ToolUseBlock,
  ToolResultBlock,
  ThinkingBlock,
} from '../../shared/session-types'

/**
 * Format a timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  try {
    return format(new Date(timestamp), 'h:mm a')
  } catch {
    return timestamp
  }
}

/**
 * Format full date for header
 */
function formatFullDate(timestamp: number | null): string {
  if (!timestamp) return 'Unknown date'
  try {
    return format(new Date(timestamp), 'MMMM d, yyyy')
  } catch {
    return 'Unknown date'
  }
}

/**
 * Calculate session duration
 */
function formatDuration(startTime: number | null, endTime: number | null): string | null {
  if (!startTime || !endTime) return null
  const durationMs = endTime - startTime
  const minutes = Math.floor(durationMs / 60000)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  return `${minutes}m`
}

/**
 * Sanitize a string for use in a filename
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Trim hyphens from ends
    .slice(0, 50) // Limit length
}

/**
 * Generate a filename for the export
 * Format: yyyyMMdd_HHmmss_<name>.md
 */
export function generateExportFilename(session: Session): string {
  const timestamp = session.startTime ? new Date(session.startTime) : new Date()
  const dateStr = format(timestamp, 'yyyyMMdd_HHmmss')

  // Use first message as name, or fallback to session id
  const firstUserMessage = session.messages.find((m) => m.role === 'user')
  const name = firstUserMessage
    ? sanitizeFilename(firstUserMessage.textContent.slice(0, 50))
    : session.id.slice(0, 8)

  return `${dateStr}_${name || 'session'}.md`
}

/**
 * Format tool use block for markdown
 */
function formatToolUse(tool: ToolUseBlock, result: ToolResultBlock | undefined): string {
  const lines: string[] = []

  lines.push(`<details>`)
  lines.push(`<summary><strong>Tool:</strong> ${tool.name}</summary>`)
  lines.push('')

  // Tool input
  if (Object.keys(tool.input).length > 0) {
    lines.push('**Input:**')
    lines.push('```json')
    lines.push(JSON.stringify(tool.input, null, 2))
    lines.push('```')
  }

  // Tool result
  if (result) {
    lines.push('')
    lines.push(result.is_error ? '**Error:**' : '**Result:**')
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content)
    // Truncate very long results
    const truncated = content.length > 2000 ? content.slice(0, 2000) + '\n... (truncated)' : content
    lines.push('```')
    lines.push(truncated)
    lines.push('```')
  }

  lines.push('</details>')
  lines.push('')

  return lines.join('\n')
}

/**
 * Format thinking block for markdown
 */
function formatThinking(thinking: ThinkingBlock): string {
  const lines: string[] = []
  lines.push('<details>')
  lines.push('<summary><em>Thinking...</em></summary>')
  lines.push('')
  lines.push(thinking.thinking)
  lines.push('')
  lines.push('</details>')
  lines.push('')
  return lines.join('\n')
}

/**
 * Format a single message for markdown
 */
function formatMessage(message: ProcessedMessage, subagents: Record<string, SubagentSession>): string {
  const lines: string[] = []
  const timestamp = formatTimestamp(message.timestamp)
  const roleLabel = message.role === 'user' ? '**User**' : '**Assistant**'

  lines.push(`### ${roleLabel} (${timestamp})`)
  lines.push('')

  // Thinking blocks (for assistant messages)
  if (message.thinkingBlocks.length > 0) {
    for (const thinking of message.thinkingBlocks) {
      lines.push(formatThinking(thinking))
    }
  }

  // Main text content
  if (message.textContent) {
    lines.push(message.textContent)
    lines.push('')
  }

  // Tool use blocks (for assistant messages)
  if (message.toolUseBlocks.length > 0) {
    for (const tool of message.toolUseBlocks) {
      const result = message.toolResults[tool.id]

      // Check if this is a Task tool with a subagent
      if (tool.name === 'Task' && tool.agentId && subagents[tool.agentId]) {
        lines.push(formatSubagent(subagents[tool.agentId]))
      } else {
        lines.push(formatToolUse(tool, result))
      }
    }
  }

  return lines.join('\n')
}

/**
 * Format a subagent session for markdown
 */
function formatSubagent(subagent: SubagentSession): string {
  const lines: string[] = []

  lines.push('<details>')
  lines.push(`<summary><strong>Subagent</strong> (${subagent.messageCount} messages)</summary>`)
  lines.push('')

  for (const message of subagent.messages) {
    // Format subagent messages with simpler formatting (no nested subagents)
    const timestamp = formatTimestamp(message.timestamp)
    const roleLabel = message.role === 'user' ? '**User**' : '**Assistant**'

    lines.push(`#### ${roleLabel} (${timestamp})`)
    lines.push('')

    if (message.textContent) {
      lines.push(message.textContent)
      lines.push('')
    }

    // Tool uses in subagent
    for (const tool of message.toolUseBlocks) {
      const result = message.toolResults[tool.id]
      lines.push(formatToolUse(tool, result))
    }
  }

  lines.push('</details>')
  lines.push('')

  return lines.join('\n')
}

/**
 * Convert a session to Markdown format
 */
export function sessionToMarkdown(session: Session): string {
  const lines: string[] = []

  // Header
  lines.push(`# Session: ${session.project}`)
  lines.push('')

  // Metadata
  lines.push(`**Date:** ${formatFullDate(session.startTime)}`)

  const duration = formatDuration(session.startTime, session.endTime)
  if (duration) {
    lines.push(`**Duration:** ${duration}`)
  }

  lines.push(`**Messages:** ${session.messages.length}`)

  if (session.gitBranch) {
    lines.push(`**Branch:** ${session.gitBranch}`)
  }

  if (session.version) {
    lines.push(`**Claude Code Version:** ${session.version}`)
  }

  lines.push(`**Session ID:** ${session.id}`)
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Conversation')
  lines.push('')

  // Messages
  for (const message of session.messages) {
    lines.push(formatMessage(message, session.subagents))
  }

  // Footer
  lines.push('---')
  lines.push('')
  lines.push(`*Exported from Sessionly on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}*`)

  return lines.join('\n')
}
