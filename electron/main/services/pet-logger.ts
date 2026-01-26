/**
 * Pet Logger - Structured logging for session monitoring
 *
 * Provides clear, formatted output for debugging the pet state machine.
 * All logs go to the main process console (visible in dev server terminal).
 */

import type { PetState } from '../../shared/pet-types'

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  // State colors
  idle: '\x1b[90m',      // gray
  working: '\x1b[34m',   // blue
  completed: '\x1b[32m', // green
  error: '\x1b[31m',     // red
  // Log level colors
  info: '\x1b[36m',      // cyan
  warn: '\x1b[33m',      // yellow
  debug: '\x1b[35m',     // magenta
}

const stateEmoji: Record<PetState, string> = {
  idle: '💤',
  working: '⚡',
  completed: '✅',
  error: '❌',
}

// Enable/disable verbose logging
let verboseMode = process.env.NODE_ENV === 'development'

/**
 * Format timestamp for log output
 */
function formatTime(): string {
  const now = new Date()
  return now.toTimeString().slice(0, 8) // HH:MM:SS
}

/**
 * Format project name (extract last component)
 */
function formatProject(project: string | null): string {
  if (!project) return 'unknown'
  const parts = project.split('/').filter(Boolean)
  return parts[parts.length - 1] || project
}

/**
 * Structured log entry for JSONL parsing
 */
export interface EntryLog {
  sessionId: string
  project: string | null
  entryType: 'user' | 'assistant' | 'file-history-snapshot' | 'unknown'
  contentTypes: string[]
  requestId?: string
  toolName?: string
  isError?: boolean
  timestamp: string
}

/**
 * Structured log entry for state changes
 */
export interface StateChangeLog {
  sessionId: string
  project: string | null
  previousState: PetState
  newState: PetState
  reason: string
  toolName?: string | null
  errorMessage?: string | null
  activeSessionCount: number
}

/**
 * Pet Logger singleton
 */
class PetLogger {
  private enabled = true
  private entryCount = 0

  /**
   * Enable or disable logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Enable or disable verbose mode
   */
  setVerbose(verbose: boolean): void {
    verboseMode = verbose
  }

  /**
   * Log a separator line
   */
  separator(): void {
    if (!this.enabled) return
    console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`)
  }

  /**
   * Log session monitor startup
   */
  startup(projectsDir: string): void {
    if (!this.enabled) return
    console.log('')
    this.separator()
    console.log(`${colors.bold}${colors.info}🐱 Pet Session Monitor Started${colors.reset}`)
    console.log(`${colors.dim}   Watching: ${projectsDir}${colors.reset}`)
    this.separator()
    console.log('')
  }

  /**
   * Log session monitor shutdown
   */
  shutdown(): void {
    if (!this.enabled) return
    console.log('')
    console.log(`${colors.dim}🐱 Pet Session Monitor Stopped${colors.reset}`)
    console.log('')
  }

  /**
   * Log a detected JSONL entry (verbose mode only)
   */
  entry(log: EntryLog): void {
    if (!this.enabled || !verboseMode) return

    this.entryCount++
    const time = formatTime()
    const proj = formatProject(log.project)
    const types = log.contentTypes.join(', ') || 'empty'

    let entryInfo = `${log.entryType}`
    if (log.toolName) {
      entryInfo += ` → ${log.toolName}`
    }
    if (log.isError) {
      entryInfo += ` ${colors.error}[ERROR]${colors.reset}`
    }

    console.log(
      `${colors.dim}[${time}]${colors.reset} ` +
      `${colors.dim}[${proj}]${colors.reset} ` +
      `${colors.debug}ENTRY${colors.reset} ` +
      `${entryInfo} (${types})`
    )
  }

  /**
   * Log a state transition
   */
  stateChange(log: StateChangeLog): void {
    if (!this.enabled) return

    const time = formatTime()
    const proj = formatProject(log.project)
    const prevColor = colors[log.previousState]
    const newColor = colors[log.newState]
    const emoji = stateEmoji[log.newState]

    // Main state change line
    console.log('')
    console.log(
      `${colors.bold}[${time}]${colors.reset} ` +
      `[${proj}] ` +
      `${prevColor}${log.previousState}${colors.reset} → ` +
      `${newColor}${colors.bold}${log.newState}${colors.reset} ` +
      `${emoji}`
    )

    // Reason
    console.log(`${colors.dim}   Reason: ${log.reason}${colors.reset}`)

    // Tool name if present
    if (log.toolName) {
      console.log(`${colors.dim}   Tool: ${log.toolName}${colors.reset}`)
    }

    // Error message if present
    if (log.errorMessage) {
      console.log(`${colors.error}   Error: ${log.errorMessage}${colors.reset}`)
    }

    // Active sessions
    if (log.activeSessionCount > 1) {
      console.log(`${colors.dim}   Active sessions: ${log.activeSessionCount}${colors.reset}`)
    }

    console.log('')
  }

  /**
   * Log state detection details (verbose mode)
   */
  detection(details: {
    filePath: string
    isRecentlyModified: boolean
    lastEntryType: string
    contentTypes: string[]
    determinedState: PetState
    reason: string
  }): void {
    if (!this.enabled || !verboseMode) return

    const time = formatTime()
    const file = details.filePath.split('/').pop() || details.filePath
    const stateColor = colors[details.determinedState]

    console.log(
      `${colors.dim}[${time}]${colors.reset} ` +
      `${colors.debug}DETECT${colors.reset} ` +
      `${file.slice(0, 8)}... → ` +
      `${stateColor}${details.determinedState}${colors.reset}`
    )
    console.log(
      `${colors.dim}         ` +
      `recent=${details.isRecentlyModified}, ` +
      `type=${details.lastEntryType}, ` +
      `content=[${details.contentTypes.join(',')}]${colors.reset}`
    )
    console.log(`${colors.dim}         ${details.reason}${colors.reset}`)
  }

  /**
   * Log an error
   */
  error(message: string, error?: Error): void {
    if (!this.enabled) return

    const time = formatTime()
    console.log(`${colors.error}[${time}] ERROR: ${message}${colors.reset}`)
    if (error && verboseMode) {
      console.log(`${colors.dim}${error.stack}${colors.reset}`)
    }
  }

  /**
   * Log a warning
   */
  warn(message: string): void {
    if (!this.enabled) return

    const time = formatTime()
    console.log(`${colors.warn}[${time}] WARN: ${message}${colors.reset}`)
  }

  /**
   * Log info message
   */
  info(message: string): void {
    if (!this.enabled) return

    const time = formatTime()
    console.log(`${colors.info}[${time}] ${message}${colors.reset}`)
  }

  /**
   * Log debug message (verbose mode only)
   */
  debug(message: string): void {
    if (!this.enabled || !verboseMode) return

    const time = formatTime()
    console.log(`${colors.dim}[${time}] ${message}${colors.reset}`)
  }

  /**
   * Log session activity summary
   */
  sessionSummary(sessions: Map<string, { state: PetState; project: string }>): void {
    if (!this.enabled || !verboseMode) return

    const time = formatTime()
    console.log(`${colors.dim}[${time}] Active sessions: ${sessions.size}${colors.reset}`)

    for (const [_id, session] of sessions) {
      const stateColor = colors[session.state]
      const proj = formatProject(session.project)
      console.log(`${colors.dim}   - ${proj}: ${stateColor}${session.state}${colors.reset}`)
    }
  }

  /**
   * Log request grouping info (verbose mode)
   */
  requestGroup(requestId: string, entryCount: number, finalContentType: string): void {
    if (!this.enabled || !verboseMode) return

    console.log(
      `${colors.dim}   RequestId ${requestId.slice(-8)}: ` +
      `${entryCount} entries, final=${finalContentType}${colors.reset}`
    )
  }
}

// Export singleton instance
export const petLogger = new PetLogger()
