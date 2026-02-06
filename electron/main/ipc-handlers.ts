import { ipcMain, Notification, shell, BrowserWindow, nativeTheme, dialog } from 'electron'
import { writeFile } from 'fs/promises'
import type { IpcResponse, ProjectGroup, Session, TerminalSpawnOptions, HookStatus } from '../shared/types'
import type { CustomSprite } from '../shared/pet-types'

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
  // Note: Cache is NOT cleared - mtime check automatically detects changed files
  // Call clearSessionCache() only for force-refresh scenarios
  ipcMain.handle('sessions:refresh', async (): Promise<IpcResponse<void>> => {
    return { success: true, data: undefined }
  })

  // Export session as Markdown
  ipcMain.handle(
    'sessions:exportMarkdown',
    async (
      event,
      params: { sessionId: string; projectEncoded: string }
    ): Promise<IpcResponse<string>> => {
      try {
        const { getSession } = await import('./services/session-store')
        const { sessionToMarkdown, generateExportFilename } = await import(
          './services/markdown-export'
        )

        // Get the session
        const session = await getSession(params.sessionId, params.projectEncoded)
        if (!session) {
          return { success: false, error: 'Session not found' }
        }

        // Generate markdown content
        const markdown = sessionToMarkdown(session)

        // Generate default filename
        const defaultFilename = generateExportFilename(session)

        // Show save dialog
        const window = BrowserWindow.fromWebContents(event.sender)
        const result = await dialog.showSaveDialog(window!, {
          title: 'Export Session as Markdown',
          defaultPath: defaultFilename,
          filters: [
            { name: 'Markdown', extensions: ['md'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        })

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Export cancelled' }
        }

        // Write the file
        await writeFile(result.filePath, markdown, 'utf-8')

        return { success: true, data: result.filePath }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to export session',
        }
      }
    }
  )

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

  // ============================================================================
  // Custom Sprites - Pet sprite sheet management
  // ============================================================================

  // Get all custom sprites
  ipcMain.handle('sprites:getAll', async (): Promise<IpcResponse<CustomSprite[]>> => {
    try {
      const { getAllCustomSprites } = await import('./services/custom-sprite-manager')
      const sprites = await getAllCustomSprites()
      return { success: true, data: sprites }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get custom sprites',
      }
    }
  })

  // Get a single custom sprite by ID
  ipcMain.handle(
    'sprites:get',
    async (_event, id: string): Promise<IpcResponse<CustomSprite | null>> => {
      try {
        const { getCustomSprite } = await import('./services/custom-sprite-manager')
        const sprite = await getCustomSprite(id)
        return { success: true, data: sprite }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get custom sprite',
        }
      }
    }
  )

  // Import a new custom sprite (opens file dialog)
  ipcMain.handle(
    'sprites:import',
    async (
      event,
      params: { name: string; config?: Partial<Omit<CustomSprite, 'id' | 'name' | 'imagePath'>> }
    ): Promise<IpcResponse<CustomSprite>> => {
      try {
        const { importSprite, getSpritesDirectory } = await import(
          './services/custom-sprite-manager'
        )

        // Show file dialog to select sprite sheet image
        const window = BrowserWindow.fromWebContents(event.sender)
        const result = await dialog.showOpenDialog(window!, {
          title: 'Select Sprite Sheet Image',
          defaultPath: getSpritesDirectory(),
          filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
            { name: 'All Files', extensions: ['*'] },
          ],
          properties: ['openFile'],
        })

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: 'Import cancelled' }
        }

        const sprite = await importSprite(result.filePaths[0], params.name, params.config)
        return { success: true, data: sprite }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to import sprite',
        }
      }
    }
  )

  // Update a custom sprite's configuration
  ipcMain.handle(
    'sprites:update',
    async (
      _event,
      params: { id: string; updates: Partial<Omit<CustomSprite, 'id' | 'imagePath'>> }
    ): Promise<IpcResponse<CustomSprite | null>> => {
      try {
        const { updateSprite } = await import('./services/custom-sprite-manager')
        const sprite = await updateSprite(params.id, params.updates)
        return { success: true, data: sprite }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update sprite',
        }
      }
    }
  )

  // Delete a custom sprite
  ipcMain.handle('sprites:delete', async (_event, id: string): Promise<IpcResponse<boolean>> => {
    try {
      const { deleteSprite } = await import('./services/custom-sprite-manager')
      const deleted = await deleteSprite(id)
      return { success: true, data: deleted }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete sprite',
      }
    }
  })

  // ============================================================================
  // Hooks - Claude Code hooks integration
  // ============================================================================

  ipcMain.handle('hooks:getStatus', async (): Promise<IpcResponse<HookStatus>> => {
    try {
      const { getHookServer } = await import('./index')
      const { isHooksInstalled } = await import('./services/hook-installer')
      const hookServer = getHookServer()
      const status = hookServer
        ? hookServer.getStatus(isHooksInstalled())
        : { serverRunning: false, port: 19823, hooksInstalled: isHooksInstalled() }
      return { success: true, data: status }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get hooks status',
      }
    }
  })

  ipcMain.handle('hooks:install', async (): Promise<IpcResponse<void>> => {
    try {
      const { installHooks } = await import('./services/hook-installer')
      installHooks()
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to install hooks',
      }
    }
  })

  ipcMain.handle('hooks:uninstall', async (): Promise<IpcResponse<void>> => {
    try {
      const { uninstallHooks } = await import('./services/hook-installer')
      uninstallHooks()
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to uninstall hooks',
      }
    }
  })

  ipcMain.handle('hooks:isInstalled', async (): Promise<IpcResponse<boolean>> => {
    try {
      const { isHooksInstalled } = await import('./services/hook-installer')
      return { success: true, data: isHooksInstalled() }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check hooks installation',
      }
    }
  })
}
