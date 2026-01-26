import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Mock canvas for xterm.js (jsdom doesn't support canvas)
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: [] })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createPattern: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock electron API for tests
global.window.electron = {
  getVersion: async () => ({ success: true, data: '1.0.0' }),
  // Theme mocks
  getNativeTheme: async () => ({ success: true, data: 'light' as const }),
  onThemeChange: () => () => {},
  showNotification: async () => ({ success: true, data: undefined }),
  openExternal: async () => ({ success: true, data: undefined }),
  // Sessions mocks
  sessionsGetAll: async () => ({ success: true, data: [] }),
  sessionsGet: async () => ({ success: false, error: 'Not found' }),
  sessionsRefresh: async () => ({ success: true, data: undefined }),
  sessionsExportMarkdown: async () => ({ success: true, data: '/tmp/export.md' }),
  // Terminal mocks
  terminalSpawn: async () => ({ success: true, data: 'test-terminal-id' }),
  terminalWrite: () => {},
  terminalResize: () => {},
  terminalKill: async () => ({ success: true, data: undefined }),
  onTerminalData: () => () => {},
  onTerminalExit: () => () => {},
  // Event listeners
  onMainMessage: () => () => {},
  onNavigateTo: () => () => {},
  // Auto-update mocks
  checkForUpdates: async () => ({ success: true, data: null }),
  downloadUpdate: async () => ({ success: true, data: undefined }),
  installUpdate: () => {},
  onUpdateChecking: () => () => {},
  onUpdateAvailable: () => () => {},
  onUpdateNotAvailable: () => () => {},
  onUpdateProgress: () => () => {},
  onUpdateDownloaded: () => () => {},
  onUpdateError: () => () => {},
  // Pet mocks
  petMouseEnter: () => {},
  petMouseLeave: () => {},
  petStartDrag: () => {},
  petEndDrag: () => {},
  petDragMove: () => {},
  petGetSettings: async () => ({
    success: true,
    data: {
      enabled: true,
      position: { x: 100, y: 100 },
      size: 'medium' as const,
      notificationsEnabled: true,
      character: 'cat' as const,
    },
  }),
  petSetSettings: async () => ({ success: true, data: undefined }),
  petGetState: async () => ({
    success: true,
    data: {
      state: 'idle' as const,
      sessionId: null,
      project: null,
      lastActivity: Date.now(),
    },
  }),
  onPetStateChange: () => () => {},
  onPetSettingsChange: () => () => {},
  petGetPanelSide: async () => ({ success: true, data: 'left' as const }),
  onPetPanelSideChange: () => () => {},
  // Custom sprites mocks
  spritesGetAll: async () => ({ success: true, data: [] }),
  spritesGet: async () => ({ success: true, data: null }),
  spritesImport: async () => ({ success: false, error: 'Import cancelled' }),
  spritesUpdate: async () => ({ success: true, data: null }),
  spritesDelete: async () => ({ success: true, data: false }),
}
