/**
 * Custom hook for managing AI chat streaming via IPC
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ChatMessage } from '../types'
import { chatConfig } from '../config'

interface UseChatStreamReturn {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  clearMessages: () => void
  hasApiKey: boolean
}

export function useChatStream(): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasApiKey, setHasApiKey] = useState(false)
  const currentAssistantMessageRef = useRef<string>('')

  // Check if API key is configured
  useEffect(() => {
    const checkApiKey = async () => {
      const response = await window.electron.chatGetApiKey()
      setHasApiKey(response.success && !!response.data)
    }
    checkApiKey()
  }, [])

  // Set up stream listener
  useEffect(() => {
    const unsubscribe = window.electron.onChatStream(chunk => {
      if (chunk.type === 'content' && chunk.content) {
        // Accumulate content for the current assistant message
        currentAssistantMessageRef.current += chunk.content

        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]

          if (lastMessage && lastMessage.role === 'assistant') {
            // Update the last assistant message with accumulated content
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: currentAssistantMessageRef.current,
              },
            ]
          }

          return prev
        })
      } else if (chunk.type === 'done') {
        setIsLoading(false)
        currentAssistantMessageRef.current = ''
      } else if (chunk.type === 'error') {
        setIsLoading(false)
        setError(chunk.error || 'An error occurred')
        currentAssistantMessageRef.current = ''

        // Remove the empty assistant message if error occurred
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1]
          if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.content) {
            return prev.slice(0, -1)
          }
          return prev
        })
      }
    })

    return unsubscribe
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    setError(null)
    setIsLoading(true)
    currentAssistantMessageRef.current = ''

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    }

    // Add user message
    setMessages(prev => [...prev, userMessage])

    // Add empty assistant message that will be filled by streaming
    const assistantMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, assistantMessage])

    // Prepare messages for API (include system prompt)
    const systemMessage: ChatMessage = {
      id: 'system',
      role: 'system',
      content: chatConfig.systemPrompt,
      timestamp: Date.now(),
    }

    const allMessages = [systemMessage, ...messages, userMessage]

    // Send to main process
    const response = await window.electron.chatSendMessage(allMessages)

    if (!response.success) {
      setIsLoading(false)
      setError(response.error || 'Failed to send message')

      // Remove the empty assistant message
      setMessages(prev => prev.slice(0, -1))
    }
  }, [messages])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    currentAssistantMessageRef.current = ''
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    hasApiKey,
  }
}
