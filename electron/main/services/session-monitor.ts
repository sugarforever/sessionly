/**
 * Session Monitor Service
 *
 * Watches Claude Code session files for activity and emits state changes
 * for the floating pet window to display.
 */

import { EventEmitter } from 'node:events'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import type { PetState, PetStateInfo, HookEventPayload } from '../../shared/hook-types'
import type { RawJSONLEntry, RawAssistantMessage, RawUserMessage, ContentBlock, ToolResultBlock } from '../../shared/session-types'
import { isAssistantMessage, isUserMessage, isToolResultBlock, isToolUseBlock } from '../../shared/session-types'

const IDLE_TIMEOUT_MS = 30000 // 30 seconds
const SESSION_STALE_MS = 60000 // 1 minute - consider session stale after this
const DEBOUNCE_MS = 500
const TAIL_BYTES = 8192 // Read last 8KB of file to find recent entries

// Priority order for states (higher = more important)
const STATE_PRIORITY: Record<PetState, number> = {
  idle: 0,
  completed: 1,
  working: 2,
  error: 3,
}

interface SessionContext {
  state: PetState
  toolName?: string | null
  errorMessage?: string | null
  gitBranch?: string | null
}

interface SessionActivity {
  state: PetState
  project: string | null
  sessionId: string | null
  timestamp: number
  toolName?: string | null
  errorMessage?: string | null
  gitBranch?: string | null
}

interface TrackedSession {
  state: PetState
  project: string
  sessionId: string
  lastUpdate: number
  filePath: string
  toolName?: string | null
  errorMessage?: string | null
  gitBranch?: string | null
}

// Follow-up check delay to detect working → completed/idle transitions
const FOLLOW_UP_CHECK_MS = 5000
// Maximum follow-up checks before considering a session stale (5s * 6 = 30s max wait)
const MAX_FOLLOW_UP_CHECKS = 6
export class SessionMonitor extends EventEmitter {
  private projectsDir: string
  private watcher: fs.FSWatcher | null = null
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private followUpTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private followUpCounts: Map<string, number> = new Map() // Track follow-up attempts per file
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private activeSessions: Map<string, TrackedSession> = new Map()
  // Track previous state per session to detect actual transitions (not display switches)
  private sessionPreviousStates: Map<string, PetState> = new Map()
  private lastEmittedState: SessionActivity = {
    state: 'idle',
    project: null,
    sessionId: null,
    timestamp: Date.now(),
    toolName: null,
    errorMessage: null,
    gitBranch: null,
  }
  private isRunning = false

  constructor() {
    super()
    this.projectsDir = path.join(os.homedir(), '.claude', 'projects')
  }

  /**
   * Start monitoring session files
   */
  start(): void {
    if (this.isRunning) {
      return
    }

    // Check if projects directory exists
    if (!fs.existsSync(this.projectsDir)) {
      console.warn('Claude projects directory not found, session monitor will stay idle')
      this.emitState('idle', null, null)
      return
    }

    this.isRunning = true

    try {
      // Watch the projects directory recursively
      this.watcher = fs.watch(
        this.projectsDir,
        { recursive: true },
        this.handleFileChange.bind(this)
      )

      this.watcher.on('error', (error) => {
        console.error('Session monitor watcher error', error)
      })

      // Start idle timer
      this.resetIdleTimer()

      // Initial scan to find current state
      this.scanForActivity()

      console.log(`Session monitor started, watching: ${this.projectsDir}`)
    } catch (error) {
      console.error('Failed to start session monitor', error)
    }
  }

  /**
   * Stop monitoring session files
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false

    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    // Clear all follow-up timers and counts
    for (const timer of this.followUpTimers.values()) {
      clearTimeout(timer)
    }
    this.followUpTimers.clear()
    this.followUpCounts.clear()

    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }

    this.activeSessions.clear()

    console.log('Session monitor stopped')
  }

  /**
   * Get current state info (returns highest priority state from all active sessions)
   */
  getState(): PetStateInfo {
    return {
      state: this.lastEmittedState.state,
      sessionId: this.lastEmittedState.sessionId,
      project: this.lastEmittedState.project,
      lastActivity: this.lastEmittedState.timestamp,
      gitBranch: this.lastEmittedState.gitBranch,
      toolName: this.lastEmittedState.toolName,
      errorMessage: this.lastEmittedState.errorMessage,
      activeSessionCount: this.activeSessions.size,
    }
  }

  /**
   * Get count of active sessions
   */
  getActiveSessionCount(): number {
    this.cleanupStaleSessions()
    return this.activeSessions.size
  }

  /**
   * Handle an incoming hook event from the HookServer.
   * Maps hook events to pet states for precise, real-time transitions.
   */
  handleHookEvent(payload: HookEventPayload): void {
    const { session_id, hook_event_name, tool_name, cwd } = payload
    const hookKey = `hook:${session_id}`

    // Map hook event to pet state
    let state: PetState
    let toolName: string | null = null
    let errorMessage: string | null = null

    switch (hook_event_name) {
      case 'PreToolUse':
        state = 'working'
        toolName = tool_name ? this.formatToolName(tool_name) : null
        break
      case 'PostToolUse':
        state = 'working'
        toolName = tool_name ? this.formatToolName(tool_name) : null
        break
      case 'PostToolUseFailure':
        state = 'error'
        toolName = tool_name ? this.formatToolName(tool_name) : null
        errorMessage = `Tool failed: ${tool_name || 'unknown'}`
        break
      case 'Stop':
        state = 'completed'
        break
      case 'Notification':
        state = 'completed'
        toolName = 'Waiting for your input'
        break
      default:
        return
    }

    // Extract project from cwd if available
    const project = cwd ? cwd.split('/').filter(Boolean).pop() || cwd : null

    // Get previous state for this hook session
    const prevState = this.sessionPreviousStates.get(hookKey)

    // Update tracked session
    this.activeSessions.set(hookKey, {
      state,
      project: project || 'unknown',
      sessionId: session_id,
      lastUpdate: Date.now(),
      filePath: hookKey, // Use hookKey as filePath for consistency
      toolName,
      errorMessage,
      gitBranch: null,
    })

    // Update previous state tracking
    this.sessionPreviousStates.set(hookKey, state)

    // Emit session-specific events for notifications
    if (prevState && prevState !== state) {
      const sessionInfo: PetStateInfo = {
        state,
        sessionId: session_id,
        project,
        lastActivity: Date.now(),
        toolName,
        errorMessage,
        gitBranch: null,
        activeSessionCount: this.activeSessions.size,
        hookDriven: true,
      }

      console.log(`[${project}] ${prevState} → ${state} (Hook event: ${hook_event_name})`)

      if (state === 'completed' && prevState === 'working') {
        this.emit('completed', sessionInfo)
      } else if (state === 'error') {
        this.emit('error', sessionInfo)
      }
    }

    // Cancel follow-up timers for hook-driven sessions
    // (hooks give us precise state, no need for polling)
    this.clearFollowUpCheck(hookKey)

    // Compute and emit aggregate state
    this.computeAndEmitState()
    this.resetIdleTimer()
  }

  private handleFileChange(_eventType: string, filename: string | null): void {
    if (!filename) return

    // Only care about .jsonl files
    if (!filename.endsWith('.jsonl')) return

    // Skip agent files - we only monitor main session files
    if (path.basename(filename).startsWith('agent-')) return

    // Per-file debouncing to handle multiple projects independently
    const existingTimer = this.debounceTimers.get(filename)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(filename)
      this.checkFileForState(filename)
    }, DEBOUNCE_MS)

    this.debounceTimers.set(filename, timer)
  }

  private async scanForActivity(): Promise<void> {
    try {
      const projects = await fs.promises.readdir(this.projectsDir, { withFileTypes: true })
      const now = Date.now()
      const recentFiles: Array<{ filePath: string; mtime: number }> = []

      for (const project of projects) {
        if (!project.isDirectory()) continue

        const projectPath = path.join(this.projectsDir, project.name)
        let files: string[]
        try {
          files = await fs.promises.readdir(projectPath)
        } catch {
          continue
        }

        for (const file of files) {
          if (!file.endsWith('.jsonl') || file.startsWith('agent-')) continue

          const filePath = path.join(projectPath, file)
          try {
            const stats = await fs.promises.stat(filePath)
            // Check if recent activity (within stale timeout)
            if (now - stats.mtimeMs < SESSION_STALE_MS) {
              recentFiles.push({ filePath, mtime: stats.mtimeMs })
            }
          } catch {
            // Skip files we can't stat
          }
        }
      }

      // Analyze all recent files to populate active sessions
      if (recentFiles.length > 0) {
        await Promise.all(recentFiles.map(({ filePath }) => this.analyzeSessionFile(filePath)))
      } else {
        this.emitState('idle', null, null)
      }
    } catch (error) {
      console.error('Failed to scan for activity', error)
    }
  }

  private async checkFileForState(relativePath: string): Promise<void> {
    const fullPath = path.join(this.projectsDir, relativePath)
    await this.analyzeSessionFile(fullPath)
  }

  private async analyzeSessionFile(filePath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(filePath)

      // Read last portion of file
      const fd = await fs.promises.open(filePath, 'r')
      try {
        const fileSize = stats.size
        const readSize = Math.min(TAIL_BYTES, fileSize)
        const position = Math.max(0, fileSize - readSize)

        const buffer = Buffer.alloc(readSize)
        await fd.read(buffer, 0, readSize, position)

        const content = buffer.toString('utf-8')
        const lines = content.split('\n').filter((line) => line.trim())

        // Check if file was recently modified (within last 3 seconds)
        const isRecentlyModified = Date.now() - stats.mtimeMs < 3000

        // Reset follow-up count if there's actual new file activity
        // This prevents the stale timeout from triggering when the session is genuinely active
        if (isRecentlyModified) {
          this.followUpCounts.delete(filePath)
        }

        // Parse last few lines to determine state and extract context
        const context = this.determineStateFromLines(lines, isRecentlyModified, filePath)

        // Extract git branch from the most recent message with gitBranch
        const gitBranch = this.extractGitBranch(lines)

        // Extract project from path
        const pathParts = filePath.split(path.sep)
        const projectsIdx = pathParts.indexOf('projects')
        const project = projectsIdx !== -1 && projectsIdx + 1 < pathParts.length
          ? this.decodeProjectPath(pathParts[projectsIdx + 1])
          : null

        // Extract session ID
        const sessionId = path.basename(filePath, '.jsonl')

        if (project && sessionId) {
          // Get previous state for this specific session
          const prevSessionState = this.sessionPreviousStates.get(filePath)

          // Update tracked session
          this.activeSessions.set(filePath, {
            state: context.state,
            project,
            sessionId,
            lastUpdate: Date.now(),
            filePath,
            toolName: context.toolName,
            errorMessage: context.errorMessage,
            gitBranch: gitBranch || context.gitBranch,
          })

          // Update previous state tracking
          this.sessionPreviousStates.set(filePath, context.state)

          // Emit session-specific events for notifications
          // Only notify when THIS SESSION transitions to completed/error
          if (prevSessionState && prevSessionState !== context.state) {
            const sessionInfo: PetStateInfo = {
              state: context.state,
              sessionId,
              project,
              lastActivity: Date.now(),
              toolName: context.toolName,
              errorMessage: context.errorMessage,
              gitBranch: gitBranch || context.gitBranch,
              activeSessionCount: this.activeSessions.size,
            }

            console.log(`[${project}] ${prevSessionState} → ${context.state} (file analysis)`)

            if (context.state === 'completed' && prevSessionState === 'working') {
              this.emit('completed', sessionInfo)
            } else if (context.state === 'error') {
              this.emit('error', sessionInfo)
            }
          }

          // Compute and emit aggregate state for display
          this.computeAndEmitState()

          // If state is "working", schedule a follow-up check to detect completion
          if (context.state === 'working') {
            this.scheduleFollowUpCheck(filePath)
          } else {
            // Clear any pending follow-up for this file
            this.clearFollowUpCheck(filePath)
          }
        }

        this.resetIdleTimer()
      } finally {
        await fd.close()
      }
    } catch (_error) {
      // File might be temporarily unavailable
    }
  }

  /**
   * Remove sessions that haven't been updated recently
   */
  private cleanupStaleSessions(): void {
    const now = Date.now()
    for (const [key, session] of this.activeSessions) {
      if (now - session.lastUpdate > SESSION_STALE_MS) {
        this.activeSessions.delete(key)
      }
    }
  }

  /**
   * Compute aggregate state from all active sessions and emit if changed
   */
  private computeAndEmitState(): void {
    this.cleanupStaleSessions()

    if (this.activeSessions.size === 0) {
      this.emitState('idle', null, null)
      return
    }

    // Find highest priority state among active sessions
    let highestPriority = -1
    let selectedSession: TrackedSession | null = null

    for (const session of this.activeSessions.values()) {
      const priority = STATE_PRIORITY[session.state]
      // Prefer higher priority, or more recent if same priority
      if (
        priority > highestPriority ||
        (priority === highestPriority && selectedSession && session.lastUpdate > selectedSession.lastUpdate)
      ) {
        highestPriority = priority
        selectedSession = session
      }
    }

    if (selectedSession) {
      // Check if the selected session is hook-driven
      const isHook = selectedSession.filePath.startsWith('hook:')
      this.emitState(
        selectedSession.state,
        selectedSession.project,
        selectedSession.sessionId,
        selectedSession.toolName,
        selectedSession.errorMessage,
        selectedSession.gitBranch,
        isHook
      )
    }
  }

  private determineStateFromLines(lines: string[], isRecentlyModified: boolean = true, _filePath?: string): SessionContext {
    // Claude Code NEVER writes stop_reason: "end_turn" to JSONL files
    // All entries have stop_reason: null
    // We need to detect state based on:
    // 1. Entry type (assistant vs user)
    // 2. Content type (text vs tool_use vs tool_result)
    // 3. File modification recency

    // Helper to return result
    const logAndReturn = (state: PetState, _reason: string, _contentTypes: string[], _lastEntryType: string, context: Omit<SessionContext, 'state'> = {}): SessionContext => {
      return { state, ...context }
    }

    // Look at lines in reverse order to find the most recent relevant entry
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]) as RawJSONLEntry

        // Check for tool result with error
        const errorInfo = this.getToolError(entry)
        if (errorInfo) {
          return logAndReturn('error', `Tool error: ${errorInfo.message}`, ['tool_result'], 'user', {
            errorMessage: errorInfo.message,
            toolName: errorInfo.toolName,
          })
        }

        // Check assistant messages
        if (isAssistantMessage(entry)) {
          const assistant = entry as RawAssistantMessage
          const content = assistant.message.content

          // Extract content types for logging
          const contentTypes = Array.isArray(content)
            ? content.map(b => b.type)
            : ['string']

          // Determine what type of content the assistant message has
          const hasToolUse = Array.isArray(content) && content.some(block => isToolUseBlock(block))
          const hasTextOnly = Array.isArray(content) && content.length > 0 &&
            content.every(block => block.type === 'text' || block.type === 'thinking')
          const toolName = this.extractCurrentTool(content)
          const rawToolName = this.getRawToolName(content)

          // Check if the tool is one that waits for USER input (not system execution)
          const userInputTools = ['AskUserQuestion', 'AskUser']
          const isWaitingForUserInput = hasToolUse && rawToolName &&
            userInputTools.includes(rawToolName)

          // If Claude is asking for user input, that's "completed" (needs user response)
          if (isWaitingForUserInput) {
            return logAndReturn('completed', `Waiting for user input (${rawToolName})`, contentTypes, 'assistant', {
              toolName,
              gitBranch: assistant.gitBranch,
            })
          }

          // If assistant message has tool_use, Claude is working (waiting for tool result)
          if (hasToolUse) {
            return logAndReturn('working', `Tool in progress: ${rawToolName}`, contentTypes, 'assistant', {
              toolName,
              gitBranch: assistant.gitBranch,
            })
          }

          // If assistant message has only text/thinking (no tool_use)
          if (hasTextOnly) {
            if (isRecentlyModified) {
              // Still being written - working
              return logAndReturn('working', 'Text response being written (file recently modified)', contentTypes, 'assistant', {
                toolName: null,
                gitBranch: assistant.gitBranch,
              })
            } else {
              // Text message, not recently modified - Claude finished talking
              return logAndReturn('completed', 'Text response complete (file stale)', contentTypes, 'assistant', {
                gitBranch: assistant.gitBranch,
              })
            }
          }

          // Fallback: if recent file activity, assume working
          if (isRecentlyModified) {
            return logAndReturn('working', 'Fallback: file recently modified', contentTypes, 'assistant', {
              toolName,
              gitBranch: assistant.gitBranch,
            })
          }
        }

        // User message (usually tool_result) - check recency
        if (isUserMessage(entry)) {
          const userMsg = entry as RawUserMessage
          const contentTypes = Array.isArray(userMsg.message?.content)
            ? userMsg.message.content.map(b => b.type)
            : ['text']

          const hasToolResult = contentTypes.includes('tool_result')

          if (isRecentlyModified) {
            // Tool result just sent, Claude will respond - working
            return logAndReturn('working', 'Tool result sent, awaiting Claude response', contentTypes, 'user')
          } else if (hasToolResult) {
            // Tool result sent, file is stale - but might be waiting for permission on another tool
            // When Claude sends multiple tool_use blocks in parallel, some may complete while
            // others are waiting for permission. Show "completed" to prompt user to check.
            return logAndReturn('completed', 'Tool completed, may need input for other tools', contentTypes, 'user', {
              toolName: 'May need your input',
            })
          } else {
            // User typed a message but Claude hasn't responded and file is stale - idle
            return logAndReturn('idle', 'User message but file stale', contentTypes, 'user')
          }
        }
      } catch {
        // Skip malformed or partial JSON lines
        continue
      }
    }

    // Default to idle if we can't determine state
    return logAndReturn('idle', 'No relevant entries found', [], 'none')
  }

  /**
   * Schedule a follow-up check for a working session
   * This detects when a session transitions from working to completed/idle
   * Limited to MAX_FOLLOW_UP_CHECKS to prevent infinite loops
   */
  private scheduleFollowUpCheck(filePath: string): void {
    // Check if we've exceeded the maximum follow-up attempts
    const currentCount = this.followUpCounts.get(filePath) || 0
    if (currentCount >= MAX_FOLLOW_UP_CHECKS) {
      // Max follow-ups reached
      // Mark session as stale/idle since it's been waiting too long
      this.handleStaleWorkingSession(filePath)
      return
    }

    // Clear any existing follow-up timer (but preserve count)
    const existingTimer = this.followUpTimers.get(filePath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Increment follow-up count
    this.followUpCounts.set(filePath, currentCount + 1)

    const timer = setTimeout(() => {
      this.followUpTimers.delete(filePath)
      // Follow-up check
      // Re-analyze the file to detect state change
      this.analyzeSessionFile(filePath)
    }, FOLLOW_UP_CHECK_MS)

    this.followUpTimers.set(filePath, timer)
  }

  /**
   * Handle a working session that has exceeded max follow-up checks
   *
   * If the session has an unresolved tool_use (toolName is set), this likely means
   * the CLI is waiting for user input (e.g., permission prompt). In this case,
   * transition to "completed" (waiting for user) instead of "idle".
   *
   * If there's no tool_use, the session was probably abandoned, so go to "idle".
   */
  private handleStaleWorkingSession(filePath: string): void {
    const session = this.activeSessions.get(filePath)
    if (!session) return

    const prevState = session.state
    const hasUnresolvedTool = !!session.toolName

    // If there's an unresolved tool_use, likely waiting for user input (permission prompt)
    // Transition to "completed" instead of "idle"
    if (hasUnresolvedTool) {
      console.log(`Session waiting for input after ${MAX_FOLLOW_UP_CHECKS} follow-ups: ${session.project}`)

      session.state = 'completed'
      session.toolName = 'Waiting for your input'
      this.activeSessions.set(filePath, session)
      this.sessionPreviousStates.set(filePath, 'completed')

      console.log(`[${session.project}] ${prevState} → completed (waiting for input)`)

      // Emit completed event for notification
      const sessionInfo: PetStateInfo = {
        state: 'completed',
        sessionId: session.sessionId,
        project: session.project,
        lastActivity: Date.now(),
        toolName: 'Waiting for your input',
        errorMessage: null,
        gitBranch: session.gitBranch,
        activeSessionCount: this.activeSessions.size,
      }
      this.emit('completed', sessionInfo)
    } else {
      // No tool_use, session was probably abandoned
      console.warn(`Session stale after ${MAX_FOLLOW_UP_CHECKS} follow-ups: ${session.project}`)

      session.state = 'idle'
      session.toolName = null
      this.activeSessions.set(filePath, session)
      this.sessionPreviousStates.set(filePath, 'idle')
    }

    // Clear follow-up tracking
    this.clearFollowUpCheck(filePath)

    // Recompute aggregate state
    this.computeAndEmitState()
  }

  /**
   * Clear a pending follow-up check and reset count
   */
  private clearFollowUpCheck(filePath: string): void {
    const existingTimer = this.followUpTimers.get(filePath)
    if (existingTimer) {
      clearTimeout(existingTimer)
      this.followUpTimers.delete(filePath)
    }
    // Reset follow-up count when clearing (session got new activity)
    this.followUpCounts.delete(filePath)
  }

  /**
   * Check for tool errors and extract error details
   */
  private getToolError(entry: RawJSONLEntry): { message: string; toolName?: string } | null {
    if (entry.type !== 'user') return null

    const userMessage = entry as RawUserMessage
    const content = userMessage.message?.content
    if (!Array.isArray(content)) return null

    for (const block of content) {
      if (isToolResultBlock(block) && block.is_error === true) {
        const errorMessage = this.extractErrorMessage(block)
        return {
          message: errorMessage,
          toolName: undefined, // Tool name not available in result block
        }
      }
    }

    return null
  }

  /**
   * Extract a concise error message from a tool result block
   */
  private extractErrorMessage(block: ToolResultBlock): string {
    const content = block.content
    if (typeof content === 'string') {
      // Truncate long error messages
      const firstLine = content.split('\n')[0]
      return firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine
    }
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item.type === 'text') {
          const firstLine = item.text.split('\n')[0]
          return firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine
        }
      }
    }
    return 'An error occurred'
  }

  /**
   * Extract the current tool being used from message content
   */
  private extractCurrentTool(content: string | ContentBlock[]): string | null {
    if (typeof content === 'string') return null
    if (!Array.isArray(content)) return null

    // Look for the last tool_use block
    for (let i = content.length - 1; i >= 0; i--) {
      const block = content[i]
      if (isToolUseBlock(block)) {
        return this.formatToolName(block.name)
      }
    }
    return null
  }

  /**
   * Format tool name for display (convert camelCase/snake_case to readable)
   */
  private formatToolName(name: string): string {
    // Map common tool names to friendly names
    const toolNameMap: Record<string, string> = {
      'Read': 'Reading file',
      'Write': 'Writing file',
      'Edit': 'Editing file',
      'Bash': 'Running command',
      'Glob': 'Searching files',
      'Grep': 'Searching code',
      'Task': 'Running agent',
      'WebFetch': 'Fetching URL',
      'WebSearch': 'Searching web',
      'TodoWrite': 'Updating todos',
      'NotebookEdit': 'Editing notebook',
      'AskUserQuestion': 'Waiting for your answer',
      'AskUser': 'Waiting for your answer',
    }
    return toolNameMap[name] || name
  }

  /**
   * Get the raw tool name from content (not formatted)
   */
  private getRawToolName(content: string | ContentBlock[]): string | null {
    if (typeof content === 'string') return null
    if (!Array.isArray(content)) return null

    for (let i = content.length - 1; i >= 0; i--) {
      const block = content[i]
      if (isToolUseBlock(block)) {
        return block.name
      }
    }
    return null
  }

  /**
   * Extract git branch from recent JSONL lines
   */
  private extractGitBranch(lines: string[]): string | null {
    // Look through lines in reverse to find the most recent git branch
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]) as RawJSONLEntry
        if (isUserMessage(entry) && entry.gitBranch) {
          return entry.gitBranch
        }
        if (isAssistantMessage(entry) && entry.gitBranch) {
          return entry.gitBranch
        }
      } catch {
        continue
      }
    }
    return null
  }

  private emitState(
    state: PetState,
    project: string | null,
    sessionId: string | null,
    toolName?: string | null,
    errorMessage?: string | null,
    gitBranch?: string | null,
    hookDriven?: boolean
  ): void {
    const prevState = this.lastEmittedState.state
    const prevProject = this.lastEmittedState.project
    const prevSessionId = this.lastEmittedState.sessionId
    const prevToolName = this.lastEmittedState.toolName
    const prevErrorMessage = this.lastEmittedState.errorMessage
    const prevGitBranch = this.lastEmittedState.gitBranch

    // Skip if nothing has changed
    if (
      state === prevState &&
      project === prevProject &&
      sessionId === prevSessionId &&
      toolName === prevToolName &&
      errorMessage === prevErrorMessage &&
      gitBranch === prevGitBranch
    ) {
      return
    }

    this.lastEmittedState = {
      state,
      project,
      sessionId,
      timestamp: Date.now(),
      toolName,
      errorMessage,
      gitBranch,
    }

    const stateInfo: PetStateInfo = {
      state,
      sessionId,
      project,
      lastActivity: this.lastEmittedState.timestamp,
      toolName,
      errorMessage,
      gitBranch,
      activeSessionCount: this.activeSessions.size,
      hookDriven: hookDriven || false,
    }

    if (prevState !== state || prevProject !== project) {
      console.log(`[${project || 'none'}] ${prevState} → ${state} (aggregate)`)
    }
    this.emit('stateChange', stateInfo)

    // Note: 'completed' and 'error' events are now emitted per-session in analyzeSessionFile
    // to avoid duplicate notifications when switching between sessions for display
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
    }

    this.idleTimer = setTimeout(() => {
      // Recompute state - stale sessions will be cleaned up
      this.computeAndEmitState()
    }, IDLE_TIMEOUT_MS)
  }

  private decodeProjectPath(encoded: string): string {
    if (!encoded.startsWith('-')) {
      return encoded
    }
    // Claude Code encodes paths like /Users/name/github/repo as -Users-name-github-repo
    // We want to extract just the project folder name (last component)
    // Strategy: find common path prefixes and extract the rest as project name

    // Remove leading dash and split
    const parts = encoded.substring(1).split('-')

    // Look for common path patterns: Users/xxx/github/PROJECT or Users/xxx/PROJECT
    // Find index after 'github' or after username (3rd position typically)
    let projectStartIndex = 0

    for (let i = 0; i < parts.length; i++) {
      if (parts[i].toLowerCase() === 'github' ||
          parts[i].toLowerCase() === 'projects' ||
          parts[i].toLowerCase() === 'repos' ||
          parts[i].toLowerCase() === 'code') {
        projectStartIndex = i + 1
        break
      }
    }

    // If no common folder found, try to skip Users/username (first 2 parts)
    if (projectStartIndex === 0 && parts.length > 2) {
      projectStartIndex = 2
    }

    // Join remaining parts with dash (preserving original folder name)
    const projectName = parts.slice(projectStartIndex).join('-')
    return projectName || encoded.substring(1) // Fallback to full name without leading dash
  }
}

// Singleton instance
let monitorInstance: SessionMonitor | null = null

export function getSessionMonitor(): SessionMonitor {
  if (!monitorInstance) {
    monitorInstance = new SessionMonitor()
  }
  return monitorInstance
}
