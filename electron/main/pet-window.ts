/**
 * Pet Window Manager
 *
 * Creates and manages the floating pet BrowserWindow with transparent background,
 * always-on-top positioning, and draggable behavior.
 */

import { BrowserWindow, screen, ipcMain, Notification } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Store from 'electron-store'
import type { PetSettings, PetStateInfo } from '../shared/pet-types'
import { DEFAULT_PET_SETTINGS, PET_SIZE_PIXELS, PET_PANEL_WIDTH, PET_PANEL_GAP, PET_PANEL_HEIGHT, PET_WINDOW_PADDING } from '../shared/pet-types'
import { getSessionMonitor } from './services/session-monitor'
import { updateTrayTooltip } from './system-tray'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Store for pet settings
const petStore = new Store<{ petSettings: PetSettings }>({
  name: 'pet-settings',
  defaults: {
    petSettings: DEFAULT_PET_SETTINGS,
  },
})

let petWindow: BrowserWindow | null = null
let isDragging = false
let stateChangeHandler: ((state: PetStateInfo) => void) | null = null
let completedHandler: ((state: PetStateInfo) => void) | null = null
let errorHandler: ((state: PetStateInfo) => void) | null = null

// Flag to suppress main window activation during pet interactions
let suppressMainWindowActivation = false
let suppressTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Check if main window activation should be suppressed (pet is being interacted with)
 */
export function shouldSuppressMainWindowActivation(): boolean {
  return suppressMainWindowActivation
}

/**
 * Set suppression flag with auto-reset timeout
 */
function setSuppressActivation(value: boolean): void {
  if (suppressTimeout) {
    clearTimeout(suppressTimeout)
    suppressTimeout = null
  }
  suppressMainWindowActivation = value
  if (value) {
    // Auto-reset after 500ms in case mouseLeave isn't triggered
    suppressTimeout = setTimeout(() => {
      suppressMainWindowActivation = false
    }, 500)
  }
}

// 'left' means panel appears to the left of pet (pet is on right side of screen)
// 'right' means panel appears to the right of pet (pet is on left side of screen)
type PanelSide = 'left' | 'right'

/**
 * Determine which side the panel should appear based on pet position
 */
function calculatePanelSide(): PanelSide {
  if (!petWindow) return 'left'

  const [x] = petWindow.getPosition()
  const [width] = petWindow.getSize()
  const display = screen.getDisplayNearestPoint({ x, y: 0 })
  const screenMidpoint = display.bounds.x + display.bounds.width / 2

  // If pet is on the right half of screen, show panel on left
  // If pet is on the left half, show panel on right
  const petCenterX = x + width / 2
  return petCenterX > screenMidpoint ? 'left' : 'right'
}

/**
 * Send panel side preference to renderer
 */
function sendPanelSide(): void {
  if (petWindow && !petWindow.isDestroyed()) {
    const side = calculatePanelSide()
    petWindow.webContents.send('pet:panelSide', side)
  }
}

/**
 * Get current pet settings (merged with defaults for forward compatibility)
 */
export function getPetSettings(): PetSettings {
  const stored = petStore.get('petSettings')
  return { ...DEFAULT_PET_SETTINGS, ...stored }
}

/**
 * Update pet settings
 */
export function setPetSettings(settings: Partial<PetSettings>): void {
  const current = getPetSettings()
  const newSettings = { ...current, ...settings }
  petStore.set('petSettings', newSettings)

  // Apply size change if pet window exists
  if (petWindow && settings.size) {
    const petSize = PET_SIZE_PIXELS[settings.size]
    const windowWidth = petSize + PET_PANEL_GAP + PET_PANEL_WIDTH + PET_WINDOW_PADDING
    const windowHeight = Math.max(petSize, PET_PANEL_HEIGHT) + PET_WINDOW_PADDING
    petWindow.setSize(windowWidth, windowHeight)
  }

  // Notify the pet window of settings change
  sendPetSettings(newSettings)
}

/**
 * Send pet settings to the renderer
 */
export function sendPetSettings(settings: PetSettings): void {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet:settingsChange', settings)
  }
}

/**
 * Create the floating pet window
 */
export function createPetWindow(): BrowserWindow | null {
  const settings = getPetSettings()

  if (!settings.enabled) {
    return null
  }

  // Get window size based on settings
  const petSize = PET_SIZE_PIXELS[settings.size]
  // Window fits pet + panel side by side, height accommodates the taller element
  const windowWidth = petSize + PET_PANEL_GAP + PET_PANEL_WIDTH + PET_WINDOW_PADDING
  const windowHeight = Math.max(petSize, PET_PANEL_HEIGHT) + PET_WINDOW_PADDING

  // Validate position is on screen
  const position = validatePosition(settings.position, windowWidth)

  petWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: position.x,
    y: position.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Allow clicks to pass through when not dragging
  petWindow.setIgnoreMouseEvents(true, { forward: true })

  // Load the pet page
  const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL
  const RENDERER_DIST = path.join(process.env.APP_ROOT || '', 'dist')

  if (VITE_DEV_SERVER_URL) {
    petWindow.loadURL(`${VITE_DEV_SERVER_URL}#/pet`)
  } else {
    petWindow.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: '/pet' })
  }

  // Track window position changes
  petWindow.on('move', () => {
    if (petWindow && !isDragging) {
      const [x, y] = petWindow.getPosition()
      setPetSettings({ position: { x, y } })
    }
    // Update panel side when window moves
    sendPanelSide()
  })

  petWindow.on('closed', () => {
    petWindow = null
  })

  // Connect to session monitor (remove old handlers first to prevent leaks)
  const monitor = getSessionMonitor()
  removeMonitorListeners()

  stateChangeHandler = (state: PetStateInfo) => {
    sendPetState(state)
    updateTrayTooltip(state)
  }
  monitor.on('stateChange', stateChangeHandler)

  // Handle notifications
  completedHandler = (state: PetStateInfo) => {
    const settings = getPetSettings()
    if (settings.notificationsEnabled) {
      showPetNotification('Ready for Input', `${state.project || 'Session'} is waiting for you`)
    }
  }
  monitor.on('completed', completedHandler)

  errorHandler = (state: PetStateInfo) => {
    const settings = getPetSettings()
    if (settings.notificationsEnabled) {
      const errorMsg = state.errorMessage ? `: ${state.errorMessage}` : ''
      showPetNotification('Error Occurred', `${state.project || 'Session'} hit an error${errorMsg}`)
    }
  }
  monitor.on('error', errorHandler)

  return petWindow
}

/**
 * Remove session monitor event listeners
 */
function removeMonitorListeners(): void {
  const monitor = getSessionMonitor()
  if (stateChangeHandler) {
    monitor.off('stateChange', stateChangeHandler)
    stateChangeHandler = null
  }
  if (completedHandler) {
    monitor.off('completed', completedHandler)
    completedHandler = null
  }
  if (errorHandler) {
    monitor.off('error', errorHandler)
    errorHandler = null
  }
}

/**
 * Validate position is on a visible display
 */
function validatePosition(position: { x: number; y: number }, size: number): { x: number; y: number } {
  const displays = screen.getAllDisplays()

  // Check if position is within any display
  for (const display of displays) {
    const { x, y, width, height } = display.bounds
    if (
      position.x >= x &&
      position.x + size <= x + width &&
      position.y >= y &&
      position.y + size <= y + height
    ) {
      return position
    }
  }

  // Default to bottom-right of primary display
  const primary = screen.getPrimaryDisplay()
  const { width, height } = primary.workAreaSize
  const { x: offsetX, y: offsetY } = primary.workArea

  return {
    x: offsetX + width - size - 50,
    y: offsetY + height - size - 50,
  }
}

/**
 * Show the pet window
 */
export function showPetWindow(): void {
  if (!petWindow) {
    createPetWindow()
  } else {
    petWindow.show()
  }
  setPetSettings({ enabled: true })
}

/**
 * Hide the pet window
 */
export function hidePetWindow(): void {
  if (petWindow) {
    petWindow.hide()
  }
  setPetSettings({ enabled: false })
}

/**
 * Toggle pet window visibility
 */
export function togglePetWindow(): void {
  if (petWindow?.isVisible()) {
    hidePetWindow()
  } else {
    showPetWindow()
  }
}

/**
 * Check if pet window is visible
 */
export function isPetVisible(): boolean {
  return petWindow?.isVisible() ?? false
}

/**
 * Destroy the pet window
 */
export function destroyPetWindow(): void {
  removeMonitorListeners()
  if (petWindow) {
    petWindow.destroy()
    petWindow = null
  }
}

/**
 * Send pet state to the renderer
 */
export function sendPetState(state: PetStateInfo): void {
  if (petWindow && !petWindow.isDestroyed()) {
    petWindow.webContents.send('pet:stateChange', state)
  }
}

/**
 * Show a native notification from the pet
 */
function showPetNotification(title: string, body: string): void {
  if (!Notification.isSupported()) return

  const notification = new Notification({
    title,
    body,
    silent: false,
  })

  notification.show()
}

/**
 * Setup IPC handlers for pet window
 */
export function setupPetIPC(): void {
  // Mouse entered pet - enable mouse events for interaction
  ipcMain.on('pet:mouseEnter', () => {
    if (petWindow) {
      petWindow.setIgnoreMouseEvents(false)
      setSuppressActivation(true)
    }
  })

  // Mouse left pet - re-enable click-through (unless dragging)
  ipcMain.on('pet:mouseLeave', () => {
    if (petWindow && !isDragging) {
      petWindow.setIgnoreMouseEvents(true, { forward: true })
    }
    setSuppressActivation(false)
  })

  // Start dragging - enable mouse events
  ipcMain.on('pet:startDrag', () => {
    if (petWindow) {
      isDragging = true
      petWindow.setIgnoreMouseEvents(false)
    }
  })

  // End dragging - save position (don't disable mouse events here - let mouseLeave handle that)
  ipcMain.on('pet:endDrag', () => {
    if (petWindow) {
      isDragging = false
      const [x, y] = petWindow.getPosition()
      setPetSettings({ position: { x, y } })
      // Don't re-enable click-through here - the user may still be hovering
      // to interact with the panel. mouseLeave will handle it when they leave.
      // Update panel side after drag ends
      sendPanelSide()
    }
  })

  // Move window during drag
  ipcMain.on('pet:dragMove', (_event, { deltaX, deltaY }: { deltaX: number; deltaY: number }) => {
    if (petWindow && isDragging) {
      const [x, y] = petWindow.getPosition()
      petWindow.setPosition(x + deltaX, y + deltaY)
    }
  })

  // Get settings
  ipcMain.handle('pet:getSettings', () => {
    return { success: true, data: getPetSettings() }
  })

  // Update settings
  ipcMain.handle('pet:setSettings', (_event, settings: Partial<PetSettings>) => {
    setPetSettings(settings)
    return { success: true, data: undefined }
  })

  // Get current state
  ipcMain.handle('pet:getState', () => {
    const monitor = getSessionMonitor()
    return { success: true, data: monitor.getState() }
  })

  // Get panel side preference
  ipcMain.handle('pet:getPanelSide', () => {
    return { success: true, data: calculatePanelSide() }
  })
}

/**
 * Get the pet window instance
 */
export function getPetWindow(): BrowserWindow | null {
  return petWindow
}
