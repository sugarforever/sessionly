/**
 * Chat Feature Configuration
 *
 * Modify these values to customize the chat experience
 */

export const chatConfig = {
  /**
   * Default OpenAI model to use for chat
   * Options: 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'
   */
  defaultModel: 'gpt-4o-mini',

  /**
   * System prompt that sets the AI's behavior
   */
  systemPrompt: 'You are a helpful AI assistant.',

  /**
   * Maximum number of tokens in the response
   */
  maxTokens: 2000,

  /**
   * Temperature for response randomness (0-2)
   * Lower = more focused, Higher = more creative
   */
  temperature: 0.7,

  /**
   * UI Configuration
   */
  ui: {
    placeholder: 'Type your message...',
    sendButtonText: 'Send',
    emptyStateTitle: 'Start a conversation',
    emptyStateDescription: 'Send a message to begin chatting with AI',
    errorTitle: 'Error',
    apiKeyMissingMessage: 'Please configure your OpenAI API key in Settings',
  },
} as const

export type ChatModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo'
