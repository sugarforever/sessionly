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
import type { PetState, PetStateInfo } from '../../shared/pet-types'
import type { RawJSONLEntry, RawAssistantMessage, RawUserMessage } from '../../shared/session-types'
import { isAssistantMessage, isToolResultBlock } from '../../shared/session-types'

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

interface SessionActivity {
  state: PetState
  project: string | null
  sessionId: string | null
  timestamp: number
}

interface TrackedSession {
  state: PetState
  project: string
  sessionId: string
  lastUpdate: number
  filePath: string
}

export class SessionMonitor extends EventEmitter {
  private projectsDir: string
  private watcher: fs.FSWatcher | null = null
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private activeSessions: Map<string, TrackedSession> = new Map()
  private lastEmittedState: SessionActivity = {
    state: 'idle',
    project: null,
    sessionId: null,
    timestamp: Date.now(),
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
      console.log('Claude projects directory not found, pet will stay idle')
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
        console.error('Session monitor watcher error:', error)
      })

      // Start idle timer
      this.resetIdleTimer()

      // Initial scan to find current state
      this.scanForActivity()

      console.log('Session monitor started')
    } catch (error) {
      console.error('Failed to start session monitor:', error)
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
    }
  }

  /**
   * Get count of active sessions
   */
  getActiveSessionCount(): number {
    this.cleanupStaleSessions()
    return this.activeSessions.size
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
      console.error('Failed to scan for activity:', error)
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

        // Parse last few lines to determine state
        const state = this.determineStateFromLines(lines)

        // Extract project from path
        const pathParts = filePath.split(path.sep)
        const projectsIdx = pathParts.indexOf('projects')
        const project = projectsIdx !== -1 && projectsIdx + 1 < pathParts.length
          ? this.decodeProjectPath(pathParts[projectsIdx + 1])
          : null

        // Extract session ID
        const sessionId = path.basename(filePath, '.jsonl')

        if (project && sessionId) {
          // Update tracked session
          this.activeSessions.set(filePath, {
            state,
            project,
            sessionId,
            lastUpdate: Date.now(),
            filePath,
          })

          // Compute and emit aggregate state
          this.computeAndEmitState()
        }

        this.resetIdleTimer()
      } finally {
        await fd.close()
      }
    } catch (error) {
      // File might be temporarily unavailable
      console.debug('Failed to analyze session file:', error)
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
      this.emitState(selectedSession.state, selectedSession.project, selectedSession.sessionId)
    }
  }

  private determineStateFromLines(lines: string[]): PetState {
    // Look at lines in reverse order to find the most recent relevant entry
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        // Try to parse as JSON - line might be partial from file read
        const entry = JSON.parse(lines[i]) as RawJSONLEntry

        // Check for tool result with error
        if (this.hasToolError(entry)) {
          return 'error'
        }

        // Check assistant messages for stop_reason
        if (isAssistantMessage(entry)) {
          const assistant = entry as RawAssistantMessage
          const stopReason = assistant.message.stop_reason

          if (stopReason === 'end_turn') {
            return 'completed'
          }

          // No stop_reason means still working
          if (!stopReason) {
            return 'working'
          }
        }
      } catch {
        // Skip malformed or partial JSON lines
        continue
      }
    }

    // Default to idle if we can't determine state
    return 'idle'
  }

  private hasToolError(entry: RawJSONLEntry): boolean {
    if (entry.type !== 'user') return false

    const userMessage = entry as RawUserMessage
    const content = userMessage.message?.content
    if (!Array.isArray(content)) return false

    return content.some((block) => isToolResultBlock(block) && block.is_error === true)
  }

  private emitState(state: PetState, project: string | null, sessionId: string | null): void {
    const prevState = this.lastEmittedState.state
    const prevProject = this.lastEmittedState.project
    const prevSessionId = this.lastEmittedState.sessionId

    // Skip if state hasn't changed
    if (state === prevState && project === prevProject && sessionId === prevSessionId) {
      return
    }

    this.lastEmittedState = {
      state,
      project,
      sessionId,
      timestamp: Date.now(),
    }

    const stateInfo: PetStateInfo = {
      state,
      sessionId,
      project,
      lastActivity: this.lastEmittedState.timestamp,
    }

    this.emit('stateChange', stateInfo)

    // Emit specific events for notifications
    if (state !== prevState) {
      if (state === 'completed') {
        this.emit('completed', stateInfo)
      } else if (state === 'error') {
        this.emit('error', stateInfo)
      }
    }
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
    // Simple decode: replace leading dash and internal dashes with slashes
    return encoded.replace(/-/g, '/')
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
