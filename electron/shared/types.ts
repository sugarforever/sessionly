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

import type { PetStateInfo, PetSettings, CustomSprite, HookStatus } from './pet-types'

export type { SessionSummary, Session, ProjectGroup }
export type { PetStateInfo, PetSettings, CustomSprite, HookStatus }

// Terminal types
export interface TerminalSpawnOptions {
  cwd?: string
  sessionId?: string
  resume?: boolean
  fork?: boolean
}

export type NativeTheme = 'dark' | 'light'

// Auto-update types
export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseName?: string
  releaseNotes?: string | Array<{ version: string; note: string }>
}

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface ElectronAPI {
  // App
  getVersion: () => Promise<IpcResponse<string>>

  // Theme
  getNativeTheme: () => Promise<IpcResponse<NativeTheme>>
  onThemeChange: (callback: (theme: NativeTheme) => void) => () => void

  // Notifications
  showNotification: (options: NotificationOptions) => Promise<IpcResponse<void>>

  // Shell
  openExternal: (url: string) => Promise<IpcResponse<void>>

  // Sessions - Claude Code session history
  sessionsGetAll: () => Promise<IpcResponse<ProjectGroup[]>>
  sessionsGet: (sessionId: string, projectEncoded: string) => Promise<IpcResponse<Session>>
  sessionsRefresh: () => Promise<IpcResponse<void>>
  sessionsExportMarkdown: (sessionId: string, projectEncoded: string) => Promise<IpcResponse<string>>

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

  // Auto-update
  checkForUpdates: () => Promise<IpcResponse<UpdateInfo | null>>
  downloadUpdate: () => Promise<IpcResponse<void>>
  installUpdate: () => void
  onUpdateChecking: (callback: () => void) => () => void
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
  onUpdateNotAvailable: (callback: () => void) => () => void
  onUpdateProgress: (callback: (progress: UpdateProgress) => void) => () => void
  onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void
  onUpdateError: (callback: (error: string) => void) => () => void

  // Pet - Floating session monitor cat
  petMouseEnter: () => void
  petMouseLeave: () => void
  petStartDrag: () => void
  petEndDrag: () => void
  petDragMove: (delta: { deltaX: number; deltaY: number }) => void
  petGetSettings: () => Promise<IpcResponse<PetSettings>>
  petSetSettings: (settings: Partial<PetSettings>) => Promise<IpcResponse<void>>
  petGetState: () => Promise<IpcResponse<PetStateInfo>>
  onPetStateChange: (callback: (state: PetStateInfo) => void) => () => void
  onPetSettingsChange: (callback: (settings: PetSettings) => void) => () => void
  petGetPanelSide: () => Promise<IpcResponse<'left' | 'right'>>
  onPetPanelSideChange: (callback: (side: 'left' | 'right') => void) => () => void

  // Custom Sprites - Pet sprite sheet management
  spritesGetAll: () => Promise<IpcResponse<CustomSprite[]>>
  spritesGet: (id: string) => Promise<IpcResponse<CustomSprite | null>>
  spritesImport: (
    name: string,
    config?: Partial<Omit<CustomSprite, 'id' | 'name' | 'imagePath'>>
  ) => Promise<IpcResponse<CustomSprite>>
  spritesUpdate: (
    id: string,
    updates: Partial<Omit<CustomSprite, 'id' | 'imagePath'>>
  ) => Promise<IpcResponse<CustomSprite | null>>
  spritesDelete: (id: string) => Promise<IpcResponse<boolean>>

  // Hooks - Claude Code hooks integration
  hooksGetStatus: () => Promise<IpcResponse<HookStatus>>
  hooksInstall: () => Promise<IpcResponse<void>>
  hooksUninstall: () => Promise<IpcResponse<void>>
  hooksIsInstalled: () => Promise<IpcResponse<boolean>>
}

export type IpcChannels =
  | 'app:getVersion'
  | 'theme:getNative'
  | 'theme:changed'
  | 'notification:show'
  | 'shell:openExternal'
  | 'sessions:getAll'
  | 'sessions:get'
  | 'sessions:refresh'
  | 'sessions:exportMarkdown'
  | 'terminal:spawn'
  | 'terminal:write'
  | 'terminal:resize'
  | 'terminal:kill'
  | 'terminal:data'
  | 'terminal:exit'
  | 'main-process-message'
  | 'navigate-to'
  | 'update:check'
  | 'update:download'
  | 'update:install'
  | 'update:checking'
  | 'update:available'
  | 'update:not-available'
  | 'update:progress'
  | 'update:downloaded'
  | 'update:error'
  | 'pet:startDrag'
  | 'pet:endDrag'
  | 'pet:dragMove'
  | 'pet:getSettings'
  | 'pet:setSettings'
  | 'pet:getState'
  | 'pet:stateChange'
  | 'pet:settingsChange'
  | 'sprites:getAll'
  | 'sprites:get'
  | 'sprites:import'
  | 'sprites:update'
  | 'sprites:delete'
  | 'hooks:getStatus'
  | 'hooks:install'
  | 'hooks:uninstall'
  | 'hooks:isInstalled'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
