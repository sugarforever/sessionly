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

// Database types - imported from Drizzle schema
// Types are auto-generated from schema.ts for type safety
import type { User as DrizzleUser } from '../main/schema'

export type User = DrizzleUser

// Chat feature types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface ChatStreamChunk {
  type: 'content' | 'done' | 'error'
  content?: string
  error?: string
}

export interface ElectronAPI {
  // App
  getVersion: () => Promise<IpcResponse<string>>

  // Notifications
  showNotification: (options: NotificationOptions) => Promise<IpcResponse<void>>

  // Shell
  openExternal: (url: string) => Promise<IpcResponse<void>>

  // Database - User operations
  dbUsersGetAll: () => Promise<IpcResponse<User[]>>
  dbUsersGetById: (id: number) => Promise<IpcResponse<User>>
  dbUsersCreate: (data: { email: string; name: string | null }) => Promise<IpcResponse<User>>
  dbUsersUpdate: (id: number, data: { email?: string; name?: string | null }) => Promise<IpcResponse<User>>
  dbUsersDelete: (id: number) => Promise<IpcResponse<boolean>>

  // Chat (can be removed if chat feature is not needed)
  chatSendMessage: (messages: ChatMessage[]) => Promise<IpcResponse<{ streamId: string }>>
  chatGetApiKey: () => Promise<IpcResponse<string | null>>
  chatSetApiKey: (apiKey: string) => Promise<IpcResponse<void>>
  onChatStream: (callback: (chunk: ChatStreamChunk) => void) => () => void

  // Event listeners
  onMainMessage: (callback: (message: string) => void) => () => void
  onNavigateTo: (callback: (path: string) => void) => () => void
}

export type IpcChannels =
  | 'app:getVersion'
  | 'notification:show'
  | 'shell:openExternal'
  | 'db:users:getAll'
  | 'db:users:getById'
  | 'db:users:create'
  | 'db:users:update'
  | 'db:users:delete'
  | 'chat:sendMessage'
  | 'chat:getApiKey'
  | 'chat:setApiKey'
  | 'chat:stream'
  | 'main-process-message'
  | 'navigate-to'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
