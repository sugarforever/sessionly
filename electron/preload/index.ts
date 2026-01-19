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

  // Sessions - Claude Code session history
  sessionsGetAll: () => ipcRenderer.invoke('sessions:getAll'),
  sessionsGet: (sessionId, projectEncoded) =>
    ipcRenderer.invoke('sessions:get', { sessionId, projectEncoded }),
  sessionsRefresh: () => ipcRenderer.invoke('sessions:refresh'),

  // Terminal - PTY management
  terminalSpawn: (options) => ipcRenderer.invoke('terminal:spawn', options),
  terminalWrite: (id, data) => ipcRenderer.send('terminal:write', { id, data }),
  terminalResize: (id, cols, rows) => ipcRenderer.send('terminal:resize', { id, cols, rows }),
  terminalKill: (id) => ipcRenderer.invoke('terminal:kill', id),
  onTerminalData: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, { id, data }: { id: string; data: string }) =>
      callback(id, data)
    ipcRenderer.on('terminal:data', subscription)
    return () => {
      ipcRenderer.removeListener('terminal:data', subscription)
    }
  },
  onTerminalExit: (callback) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      { id, exitCode, signal }: { id: string; exitCode: number; signal?: number }
    ) => callback(id, exitCode, signal)
    ipcRenderer.on('terminal:exit', subscription)
    return () => {
      ipcRenderer.removeListener('terminal:exit', subscription)
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
