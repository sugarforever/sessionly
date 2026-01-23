import { app, BrowserWindow, Tray, session } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WindowStateManager } from './window-state-manager'
import { setupIPC } from './ipc-handlers'
import { createSystemTray } from './system-tray'
import { initAutoUpdater, setupAutoUpdaterIPC } from './auto-updater'

// Enable remote debugging in development for DevTools profiling
if (process.env.VITE_DEV_SERVER_URL) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

export const VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let windowStateManager: WindowStateManager | null = null

function createWindow() {
  // Initialize window state manager
  windowStateManager = new WindowStateManager()
  const windowState = windowStateManager.getState()

  mainWindow = new BrowserWindow({
    ...windowState,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Sessionly',
    backgroundColor: '#ffffff',
  })

  // Track window state changes
  windowStateManager.track(mainWindow)

  // Test actively push message to the Electron-Renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Load the app
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  // Handle window close - minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!(app as { isQuitting?: boolean }).isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

// App lifecycle
app.whenReady().then(() => {
  // Setup Content Security Policy (production only)
  // In development, Vite uses inline scripts for HMR which would be blocked
  if (!VITE_DEV_SERVER_URL) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline'; " +
              "font-src 'self' data:; " +
              "img-src 'self' data: blob:; " +
              "connect-src 'self'",
          ],
        },
      })
    })
  }

  // Setup IPC handlers
  setupIPC()
  setupAutoUpdaterIPC()

  // Create window
  createWindow()

  // Create system tray
  tray = createSystemTray(mainWindow)

  // Initialize auto-updater (production only)
  if (!VITE_DEV_SERVER_URL && mainWindow) {
    initAutoUpdater(mainWindow)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  ;(app as { isQuitting?: boolean }).isQuitting = true
  windowStateManager?.saveState(mainWindow!)
})

// Cleanup
app.on('will-quit', () => {
  tray?.destroy()
})
