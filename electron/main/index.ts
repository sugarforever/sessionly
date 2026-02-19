import { app, BrowserWindow, Notification, Tray, session } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Store from 'electron-store'
import { WindowStateManager } from './window-state-manager'
import { setupIPC } from './ipc-handlers'
import { createSystemTray, updateTrayTooltip } from './system-tray'
import { initAutoUpdater, setupAutoUpdaterIPC } from './auto-updater'
import { getSessionMonitor } from './services/session-monitor'
import { HookServer } from './services/hook-server'
import { installHooks, isHooksInstalled } from './services/hook-installer'
import type { HookEventPayload, PetStateInfo } from '../shared/hook-types'

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
let hookServer: HookServer | null = null

// Simple settings store for notifications
const settingsStore = new Store<{ notificationsEnabled: boolean }>({
  defaults: { notificationsEnabled: true },
})

/**
 * Get whether notifications are enabled.
 */
export function getNotificationsEnabled(): boolean {
  return settingsStore.get('notificationsEnabled')
}

/**
 * Set whether notifications are enabled.
 */
export function setNotificationsEnabled(enabled: boolean): void {
  settingsStore.set('notificationsEnabled', enabled)
}

/**
 * Get the hook server instance (used by IPC handlers).
 */
export function getHookServer(): HookServer | null {
  return hookServer
}

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

/**
 * Show a native notification if enabled.
 */
function showNotification(title: string, body: string): void {
  if (getNotificationsEnabled() && Notification.isSupported()) {
    new Notification({ title, body, silent: false }).show()
  }
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

  // Start session monitor
  const sessionMonitor = getSessionMonitor()

  // Listen for session events and show notifications
  sessionMonitor.on('completed', (state: PetStateInfo) => {
    showNotification(
      'Ready for Input',
      `${state.project || 'Session'} is waiting for you`
    )
  })

  sessionMonitor.on('error', (state: PetStateInfo) => {
    const errorMsg = state.errorMessage ? `: ${state.errorMessage}` : ''
    showNotification(
      'Error Occurred',
      `${state.project || 'Session'} hit an error${errorMsg}`
    )
  })

  sessionMonitor.on('stateChange', (state: PetStateInfo) => {
    updateTrayTooltip(state)
  })

  // Start hook server (preferred over file watcher)
  hookServer = new HookServer()
  hookServer.start().then((started) => {
    if (started) {
      // Connect hook events to session monitor
      hookServer!.on('hookEvent', (payload: HookEventPayload) => {
        sessionMonitor.handleHookEvent(payload)
      })

      // Auto-install hooks if not already installed
      if (!isHooksInstalled()) {
        installHooks()
      }
    } else {
      // Hook server failed to start (port in use, etc.) - fall back to file watcher
      console.warn('Hook server failed, falling back to file watcher')
      sessionMonitor.start()
    }
  })

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
  if (mainWindow && !mainWindow.isDestroyed()) {
    windowStateManager?.saveState(mainWindow)
  }
})

// Cleanup
app.on('will-quit', () => {
  tray?.destroy()
  getSessionMonitor().stop()
  if (hookServer) {
    hookServer.stop()
    hookServer = null
  }
})
