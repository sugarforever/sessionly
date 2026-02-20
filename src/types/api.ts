/**
 * Tauri API bridge - replaces window.electron with Tauri invoke calls
 */
import { invoke } from '@tauri-apps/api/core'
import type { ProjectGroup, Session, HookStatus } from './session-types'

export const api = {
  // App
  getVersion: () => invoke<string>('get_version'),

  // Theme
  getNativeTheme: () => invoke<string>('get_native_theme'),

  // Sessions
  sessionsGetAll: () => invoke<ProjectGroup[]>('get_projects'),
  sessionsGet: (sessionId: string, projectEncoded: string) =>
    invoke<Session>('get_session', { sessionId, projectEncoded }),
  sessionsRefresh: () => Promise.resolve(), // Just re-fetch
  sessionsExportMarkdown: (sessionId: string, projectEncoded: string) =>
    invoke<string>('export_session_markdown', { sessionId, projectEncoded }),

  // Hooks
  hooksGetStatus: () => invoke<HookStatus>('hooks_get_status'),
  hooksInstall: () => invoke<void>('hooks_install'),
  hooksUninstall: () => invoke<void>('hooks_uninstall'),
  hooksIsInstalled: () => invoke<boolean>('hooks_is_installed'),

  // Notifications
  sendNativeNotification: (title: string, body: string) =>
    invoke<void>('send_native_notification', { title, body }),
}
