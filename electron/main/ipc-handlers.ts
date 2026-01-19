import { ipcMain, Notification, shell, BrowserWindow } from 'electron'
import type { IpcResponse, ChatMessage, ChatStreamChunk } from '../shared/types'
import Store from 'electron-store'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'

// Store for persisting user settings
const store = new Store()

export function setupIPC() {
  // Example: Get app version
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

  // Example: Show notification
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

  // Example: Open external URL
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
  // Database Operations (User Management)
  // ============================================================================

  // Get all users
  ipcMain.handle('db:users:getAll', async (): Promise<IpcResponse<any[]>> => {
    try {
      const { userRepository } = await import('./database')
      const users = userRepository.getAll()
      return { success: true, data: users }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get users',
      }
    }
  })

  // Get user by ID
  ipcMain.handle('db:users:getById', async (_event, id: number): Promise<IpcResponse<any>> => {
    try {
      const { userRepository } = await import('./database')
      const user = userRepository.getById(id)
      if (!user) {
        return { success: false, error: 'User not found' }
      }
      return { success: true, data: user }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get user',
      }
    }
  })

  // Create user
  ipcMain.handle(
    'db:users:create',
    async (
      _event,
      data: { email: string; name: string | null }
    ): Promise<IpcResponse<any>> => {
      try {
        const { userRepository } = await import('./database')
        const user = userRepository.create(data)
        return { success: true, data: user }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create user',
        }
      }
    }
  )

  // Update user
  ipcMain.handle(
    'db:users:update',
    async (_event, params: {
      id: number
      data: { email?: string; name?: string | null }
    }): Promise<IpcResponse<any>> => {
      const { id, data } = params
      try {
        const { userRepository } = await import('./database')
        const user = userRepository.update(id, data)
        if (!user) {
          return { success: false, error: 'User not found' }
        }
        return { success: true, data: user }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update user',
        }
      }
    }
  )

  // Delete user
  ipcMain.handle('db:users:delete', async (_event, id: number): Promise<IpcResponse<boolean>> => {
    try {
      const { userRepository } = await import('./database')
      const deleted = userRepository.delete(id)
      if (!deleted) {
        return { success: false, error: 'User not found' }
      }
      return { success: true, data: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete user',
      }
    }
  })

  // ============================================================================
  // Chat Feature IPC Handlers
  // (Can be removed if chat feature is not needed)
  // ============================================================================

  // Get OpenAI API key from secure storage
  ipcMain.handle('chat:getApiKey', async (): Promise<IpcResponse<string | null>> => {
    try {
      const apiKey = store.get('openai.apiKey') as string | undefined
      return { success: true, data: apiKey || null }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get API key',
      }
    }
  })

  // Set OpenAI API key in secure storage
  ipcMain.handle('chat:setApiKey', async (_event, apiKey: string): Promise<IpcResponse<void>> => {
    try {
      if (apiKey && apiKey.trim().length > 0) {
        store.set('openai.apiKey', apiKey.trim())
      } else {
        store.delete('openai.apiKey')
      }
      return { success: true, data: undefined }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save API key',
      }
    }
  })

  // Send chat message and stream response
  ipcMain.handle(
    'chat:sendMessage',
    async (event, messages: ChatMessage[]): Promise<IpcResponse<{ streamId: string }>> => {
      try {
        const apiKey = store.get('openai.apiKey') as string | undefined

        if (!apiKey) {
          return {
            success: false,
            error: 'OpenAI API key not configured',
          }
        }

        const streamId = `stream-${Date.now()}`
        const mainWindow = BrowserWindow.fromWebContents(event.sender)

        if (!mainWindow) {
          return {
            success: false,
            error: 'Window not found',
          }
        }

        // Start streaming in the background
        ;(async () => {
          try {
            const openai = createOpenAI({ apiKey })
            const result = await streamText({
              model: openai('gpt-4o-mini'),
              messages: messages.map(m => ({
                role: m.role,
                content: m.content,
              })),
              temperature: 0.7,
            })

            // Stream the response
            for await (const chunk of result.textStream) {
              const streamChunk: ChatStreamChunk = {
                type: 'content',
                content: chunk,
              }
              mainWindow.webContents.send('chat:stream', streamChunk)
            }

            // Send completion signal
            const doneChunk: ChatStreamChunk = { type: 'done' }
            mainWindow.webContents.send('chat:stream', doneChunk)
          } catch (error) {
            const errorChunk: ChatStreamChunk = {
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            }
            mainWindow.webContents.send('chat:stream', errorChunk)
          }
        })()

        return { success: true, data: { streamId } }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send message',
        }
      }
    }
  )
}
