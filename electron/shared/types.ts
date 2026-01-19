/**
 * Type-safe IPC communication types
 */

export interface IpcResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface NotificationOptions {
  title: string
  body: string
}

// Session types - imported from session-types
import type {
  SessionSummary,
  Session,
  ProjectGroup,
} from './session-types'

export type { SessionSummary, Session, ProjectGroup }

// Terminal types
export interface TerminalSpawnOptions {
  cwd?: string
  sessionId?: string
  resume?: boolean
  fork?: boolean
}

export interface ElectronAPI {
  // App
  getVersion: () => Promise<IpcResponse<string>>

  // Notifications
  showNotification: (options: NotificationOptions) => Promise<IpcResponse<void>>

  // Shell
  openExternal: (url: string) => Promise<IpcResponse<void>>

  // Sessions - Claude Code session history
  sessionsGetAll: () => Promise<IpcResponse<ProjectGroup[]>>
  sessionsGet: (sessionId: string, projectEncoded: string) => Promise<IpcResponse<Session>>
  sessionsRefresh: () => Promise<IpcResponse<void>>

  // Terminal - PTY management
  terminalSpawn: (options?: TerminalSpawnOptions) => Promise<IpcResponse<string>>
  terminalWrite: (id: string, data: string) => void
  terminalResize: (id: string, cols: number, rows: number) => void
  terminalKill: (id: string) => Promise<IpcResponse<void>>
  onTerminalData: (callback: (id: string, data: string) => void) => () => void
  onTerminalExit: (callback: (id: string, exitCode: number, signal?: number) => void) => () => void

  // Event listeners
  onMainMessage: (callback: (message: string) => void) => () => void
  onNavigateTo: (callback: (path: string) => void) => () => void
}

export type IpcChannels =
  | 'app:getVersion'
  | 'notification:show'
  | 'shell:openExternal'
  | 'sessions:getAll'
  | 'sessions:get'
  | 'sessions:refresh'
  | 'terminal:spawn'
  | 'terminal:write'
  | 'terminal:resize'
  | 'terminal:kill'
  | 'terminal:data'
  | 'terminal:exit'
  | 'main-process-message'
  | 'navigate-to'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
