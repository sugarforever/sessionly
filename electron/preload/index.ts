import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared/types'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // App
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Notifications
  showNotification: (options) => ipcRenderer.invoke('notification:show', options),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Database - User operations
  dbUsersGetAll: () => ipcRenderer.invoke('db:users:getAll'),
  dbUsersGetById: (id) => ipcRenderer.invoke('db:users:getById', id),
  dbUsersCreate: (data) => ipcRenderer.invoke('db:users:create', data),
  dbUsersUpdate: (id, data) => ipcRenderer.invoke('db:users:update', { id, data }),
  dbUsersDelete: (id) => ipcRenderer.invoke('db:users:delete', id),

  // Chat (can be removed if chat feature is not needed)
  chatSendMessage: (messages) => ipcRenderer.invoke('chat:sendMessage', messages),
  chatGetApiKey: () => ipcRenderer.invoke('chat:getApiKey'),
  chatSetApiKey: (apiKey) => ipcRenderer.invoke('chat:setApiKey', apiKey),
  onChatStream: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, chunk: import('../shared/types').ChatStreamChunk) => callback(chunk)
    ipcRenderer.on('chat:stream', subscription)
    return () => {
      ipcRenderer.removeListener('chat:stream', subscription)
    }
  },

  // Event listeners
  onMainMessage: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, value: string) => callback(value)
    ipcRenderer.on('main-process-message', subscription)
    return () => {
      ipcRenderer.removeListener('main-process-message', subscription)
    }
  },

  onNavigateTo: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, path: string) => callback(path)
    ipcRenderer.on('navigate-to', subscription)
    return () => {
      ipcRenderer.removeListener('navigate-to', subscription)
    }
  },
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
  } catch (error) {
    console.error('Failed to expose electron API:', error)
  }
} else {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).electron = electronAPI
}
