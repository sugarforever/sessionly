/**
 * Tauri API bridge - replaces window.electron with Tauri invoke calls
 */
import { invoke } from '@tauri-apps/api/core'
import type { ProjectGroup, Session, HookStatus } from './session-types'
import type { SearchHit, SearchFilters, IndexStatus, BackendConfig, IndexTriggers } from './search'

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
  sessionsExportMarkdown: (sessionId: string, projectEncoded: string, destPath: string) =>
    invoke<void>('export_session_markdown', { sessionId, projectEncoded, destPath }),

  // Hooks
  hooksGetStatus: () => invoke<HookStatus>('hooks_get_status'),
  hooksInstall: () => invoke<void>('hooks_install'),
  hooksUninstall: () => invoke<void>('hooks_uninstall'),
  hooksIsInstalled: () => invoke<boolean>('hooks_is_installed'),

  // Search
  searchQuery: (query: string, filters?: SearchFilters, limit?: number) =>
    invoke<SearchHit[]>('search_query', { query, filters, limit }),
  searchIndexStatus: () => invoke<IndexStatus>('search_index_status'),
  searchReindex: () => invoke<void>('search_reindex'),
  searchGetBackend: () => invoke<BackendConfig>('search_get_backend'),
  searchSetBackend: (config: BackendConfig) => invoke<void>('search_set_backend', { config }),
  searchDeleteApiKey: () => invoke<void>('search_delete_api_key'),
  searchEnable: () => invoke<void>('search_enable'),
  searchCancelBuild: () => invoke<void>('search_cancel_build'),
  searchDeleteModel: () => invoke<void>('search_delete_model'),
  searchGetTriggers: () => invoke<IndexTriggers>('search_get_triggers'),
  searchSetTriggers: (triggers: IndexTriggers) => invoke<void>('search_set_triggers', { triggers }),
}
