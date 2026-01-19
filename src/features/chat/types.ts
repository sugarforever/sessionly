/**
 * Chat Feature Types
 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface ChatStreamChunk {
  type: 'content' | 'done' | 'error'
  content?: string
  error?: string
}

export interface ChatSettings {
  apiKey: string
  model: string
}
