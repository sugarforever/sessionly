import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, UpdateInfo, UpdateProgress } from '../shared/types'

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // App
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Theme
  getNativeTheme: () => ipcRenderer.invoke('theme:getNative'),
  onThemeChange: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, theme: 'dark' | 'light') =>
      callback(theme)
    ipcRenderer.on('theme:changed', subscription)
    return () => {
      ipcRenderer.removeListener('theme:changed', subscription)
    }
  },

  // Notifications
  showNotification: (options) => ipcRenderer.invoke('notification:show', options),

  // Shell
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),

  // Sessions - Claude Code session history
  sessionsGetAll: () => ipcRenderer.invoke('sessions:getAll'),
  sessionsGet: (sessionId, projectEncoded) =>
    ipcRenderer.invoke('sessions:get', { sessionId, projectEncoded }),
  sessionsRefresh: () => ipcRenderer.invoke('sessions:refresh'),
  sessionsExportMarkdown: (sessionId, projectEncoded) =>
    ipcRenderer.invoke('sessions:exportMarkdown', { sessionId, projectEncoded }),

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

  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  onUpdateChecking: (callback) => {
    const subscription = () => callback()
    ipcRenderer.on('update:checking', subscription)
    return () => {
      ipcRenderer.removeListener('update:checking', subscription)
    }
  },
  onUpdateAvailable: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info)
    ipcRenderer.on('update:available', subscription)
    return () => {
      ipcRenderer.removeListener('update:available', subscription)
    }
  },
  onUpdateNotAvailable: (callback) => {
    const subscription = () => callback()
    ipcRenderer.on('update:not-available', subscription)
    return () => {
      ipcRenderer.removeListener('update:not-available', subscription)
    }
  },
  onUpdateProgress: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, progress: UpdateProgress) =>
      callback(progress)
    ipcRenderer.on('update:progress', subscription)
    return () => {
      ipcRenderer.removeListener('update:progress', subscription)
    }
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, info: UpdateInfo) => callback(info)
    ipcRenderer.on('update:downloaded', subscription)
    return () => {
      ipcRenderer.removeListener('update:downloaded', subscription)
    }
  },
  onUpdateError: (callback) => {
    const subscription = (_event: Electron.IpcRendererEvent, error: string) => callback(error)
    ipcRenderer.on('update:error', subscription)
    return () => {
      ipcRenderer.removeListener('update:error', subscription)
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
