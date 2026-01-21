import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'

// Configure logging
autoUpdater.logger = log
log.transports.file.level = 'info'

// Disable auto-download - let user decide
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

let mainWindow: BrowserWindow | null = null

export function initAutoUpdater(window: BrowserWindow) {
  mainWindow = window

  // Check for updates on startup (after a short delay)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Failed to check for updates:', err)
    })
  }, 3000)
}

// Event handlers
autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...')
  sendToRenderer('update:checking')
})

autoUpdater.on('update-available', (info: UpdateInfo) => {
  log.info('Update available:', info.version)
  sendToRenderer('update:available', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseName: info.releaseName,
    releaseNotes: info.releaseNotes,
  })
})

autoUpdater.on('update-not-available', () => {
  log.info('Update not available')
  sendToRenderer('update:not-available')
})

autoUpdater.on('download-progress', (progress) => {
  log.info(`Download progress: ${progress.percent.toFixed(1)}%`)
  sendToRenderer('update:progress', {
    percent: progress.percent,
    bytesPerSecond: progress.bytesPerSecond,
    transferred: progress.transferred,
    total: progress.total,
  })
})

autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
  log.info('Update downloaded:', info.version)
  sendToRenderer('update:downloaded', {
    version: info.version,
    releaseDate: info.releaseDate,
    releaseName: info.releaseName,
    releaseNotes: info.releaseNotes,
  })
})

autoUpdater.on('error', (error) => {
  log.error('Update error:', error)
  sendToRenderer('update:error', error.message)
})

function sendToRenderer(channel: string, data?: unknown) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

// IPC handlers
export function setupAutoUpdaterIPC() {
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      if (result?.updateInfo) {
        return {
          success: true,
          data: {
            version: result.updateInfo.version,
            releaseDate: result.updateInfo.releaseDate,
            releaseName: result.updateInfo.releaseName,
            releaseNotes: result.updateInfo.releaseNotes,
          },
        }
      }
      return { success: true, data: null }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })
}
