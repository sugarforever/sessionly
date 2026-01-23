import { BrowserWindow, screen } from 'electron'
import Store from 'electron-store'

interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  isMaximized?: boolean
}

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 800
const SAVE_DEBOUNCE_MS = 500

export class WindowStateManager {
  private store: Store<{ windowState: WindowState }>
  private saveTimeout: ReturnType<typeof setTimeout> | null = null
  private trackedWindow: BrowserWindow | null = null

  constructor() {
    this.store = new Store<{ windowState: WindowState }>({
      name: 'window-state',
      defaults: {
        windowState: {
          width: DEFAULT_WIDTH,
          height: DEFAULT_HEIGHT,
        },
      },
    })
  }

  getState(): WindowState {
    const savedState = this.store.get('windowState')
    const state = { ...savedState }

    // Ensure the window is visible on a connected display
    const { x, y, width, height } = state
    if (x !== undefined && y !== undefined) {
      const displayBounds = screen.getDisplayMatching({
        x,
        y,
        width: width || DEFAULT_WIDTH,
        height: height || DEFAULT_HEIGHT,
      }).bounds

      // Check if window is within display bounds
      if (
        x >= displayBounds.x &&
        y >= displayBounds.y &&
        x + (width || DEFAULT_WIDTH) <= displayBounds.x + displayBounds.width &&
        y + (height || DEFAULT_HEIGHT) <= displayBounds.y + displayBounds.height
      ) {
        return state
      }
    }

    // Return centered state if saved position is not valid
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize

    return {
      width: Math.min(width || DEFAULT_WIDTH, screenWidth),
      height: Math.min(height || DEFAULT_HEIGHT, screenHeight),
      x: Math.floor((screenWidth - (width || DEFAULT_WIDTH)) / 2),
      y: Math.floor((screenHeight - (height || DEFAULT_HEIGHT)) / 2),
    }
  }

  track(window: BrowserWindow) {
    // Prevent multiple registrations for the same window
    if (this.trackedWindow === window) {
      return
    }
    this.trackedWindow = window

    // Debounced save to prevent excessive I/O during rapid resize/move
    const debouncedSave = () => {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
      }
      this.saveTimeout = setTimeout(() => {
        if (!window.isMaximized() && !window.isMinimized() && !window.isFullScreen()) {
          this.saveState(window)
        }
      }, SAVE_DEBOUNCE_MS)
    }

    window.on('resize', debouncedSave)
    window.on('move', debouncedSave)
    window.on('maximize', () => this.saveMaximizedState(true))
    window.on('unmaximize', () => this.saveMaximizedState(false))

    // Clean up timeout when window is closed
    window.on('closed', () => {
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout)
        this.saveTimeout = null
      }
      this.trackedWindow = null
    })
  }

  saveState(window: BrowserWindow) {
    const bounds = window.getBounds()
    const isMaximized = window.isMaximized()

    this.store.set('windowState', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized,
    })
  }

  private saveMaximizedState(isMaximized: boolean) {
    const currentState = this.store.get('windowState')
    this.store.set('windowState', {
      ...currentState,
      isMaximized,
    })
  }
}
