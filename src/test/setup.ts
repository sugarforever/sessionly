import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock electron API for tests
global.window.electron = {
  getVersion: async () => ({ success: true, data: '1.0.0' }),
  showNotification: async () => ({ success: true, data: undefined }),
  openExternal: async () => ({ success: true, data: undefined }),
  // Sessions mocks
  sessionsGetAll: async () => ({ success: true, data: [] }),
  sessionsGet: async () => ({ success: false, error: 'Not found' }),
  sessionsRefresh: async () => ({ success: true, data: undefined }),
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
}
