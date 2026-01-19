import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock electron API for tests
global.window.electron = {
  getVersion: async () => ({ success: true, data: '1.0.0' }),
  showNotification: async () => ({ success: true, data: undefined }),
  openExternal: async () => ({ success: true, data: undefined }),
  // Database mocks
  dbUsersGetAll: async () => ({ success: true, data: [] }),
  dbUsersGetById: async () => ({
    success: true,
    data: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),
  dbUsersCreate: async () => ({
    success: true,
    data: {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),
  dbUsersUpdate: async () => ({
    success: true,
    data: {
      id: 1,
      email: 'test@example.com',
      name: 'Updated User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }),
  dbUsersDelete: async () => ({ success: true, data: true }),
  // Chat feature mocks (can be removed if chat feature is not needed)
  chatSendMessage: async () => ({ success: true, data: { streamId: 'test-stream' } }),
  chatGetApiKey: async () => ({ success: true, data: null }),
  chatSetApiKey: async () => ({ success: true, data: undefined }),
  onChatStream: () => () => {},
  onMainMessage: () => () => {},
  onNavigateTo: () => () => {},
}
