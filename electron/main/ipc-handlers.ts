import { ipcMain, Notification, shell, BrowserWindow, nativeTheme } from 'electron'
import type { IpcResponse, ProjectGroup, Session, TerminalSpawnOptions } from '../shared/types'

export function setupIPC() {
  // ============================================================================
  // Theme - Native theme detection
  // ============================================================================

  // Get current native theme (dark or light)
  ipcMain.handle('theme:getNative', async (): Promise<IpcResponse<'dark' | 'light'>> => {
    try {
      const isDark = nativeTheme.shouldUseDarkColors
      return { success: true, data: isDark ? 'dark' : 'light' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get native theme',
      }
    }
  })

  // Listen for native theme changes and broadcast to all windows
  nativeTheme.on('updated', () => {
    const isDark = nativeTheme.shouldUseDarkColors
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('theme:changed', isDark ? 'dark' : 'light')
    })
  })
  // Get app version
  ipcMain.handle('app:getVersion', async (): Promise<IpcResponse<string>> => {
    try {
      const { app } = await import('electron')
      return { success: true, data: app.getVersion() }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version',
      }
    }
  })

  // Show notification
  ipcMain.handle(
    'notification:show',
    async (
      _event,
      options: { title: string; body: string }
    ): Promise<IpcResponse<void>> => {
      try {
        const notification = new Notification({
          title: options.title,
          body: options.body,
        })
        notification.show()
        return { success: true, data: undefined }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to show notification',
        }
      }
    }
  )

  // Open external URL
  ipcMain.handle('shell:openExternal', async (_event, url: string): Promise<IpcResponse<void>> => {
    try {
      await shell.openExternal(url)
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to open URL',
      }
    }
  })

  // ============================================================================
  // Sessions - Claude Code Session History
  // ============================================================================

  // Get all sessions grouped by project
  ipcMain.handle('sessions:getAll', async (): Promise<IpcResponse<ProjectGroup[]>> => {
    try {
      const { getAllSessions } = await import('./services/session-store')
      const groups = await getAllSessions()
      return { success: true, data: groups }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sessions',
      }
    }
  })

  // Get a single session by ID
  ipcMain.handle(
    'sessions:get',
    async (
      _event,
      params: { sessionId: string; projectEncoded: string }
    ): Promise<IpcResponse<Session>> => {
      try {
        const { getSession } = await import('./services/session-store')
        const session = await getSession(params.sessionId, params.projectEncoded)
        if (!session) {
          return { success: false, error: 'Session not found' }
        }
        return { success: true, data: session }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get session',
        }
      }
    }
  )

  // Refresh sessions (re-scan filesystem)
  ipcMain.handle('sessions:refresh', async (): Promise<IpcResponse<void>> => {
    return { success: true, data: undefined }
  })

  // ============================================================================
  // Terminal - PTY Management
  // ============================================================================

  // Spawn a new terminal
  ipcMain.handle(
    'terminal:spawn',
    async (event, options?: TerminalSpawnOptions): Promise<IpcResponse<string>> => {
      try {
        const terminalManager = await import('./services/terminal-manager')
        const window = BrowserWindow.fromWebContents(event.sender)
        if (!window) {
          return { success: false, error: 'Window not found' }
        }
        const id = terminalManager.spawn(window, options)
        return { success: true, data: id }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to spawn terminal',
        }
      }
    }
  )

  // Write to terminal (no response needed)
  ipcMain.on('terminal:write', async (_event, params: { id: string; data: string }) => {
    try {
      const terminalManager = await import('./services/terminal-manager')
      terminalManager.write(params.id, params.data)
    } catch (error) {
      console.error('Failed to write to terminal:', error)
    }
  })

  // Resize terminal (no response needed)
  ipcMain.on('terminal:resize', async (_event, params: { id: string; cols: number; rows: number }) => {
    try {
      const terminalManager = await import('./services/terminal-manager')
      terminalManager.resize(params.id, params.cols, params.rows)
    } catch (error) {
      console.error('Failed to resize terminal:', error)
    }
  })

  // Kill terminal
  ipcMain.handle('terminal:kill', async (_event, id: string): Promise<IpcResponse<void>> => {
    try {
      const terminalManager = await import('./services/terminal-manager')
      terminalManager.kill(id)
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to kill terminal',
      }
    }
  })
}
