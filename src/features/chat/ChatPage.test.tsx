import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatPage } from './ChatPage'

// Mock the navigation context
vi.mock('@/contexts/NavigationContext', () => ({
  useNavigation: () => ({
    navigateTo: vi.fn(),
  }),
}))

// Mock the chat stream hook
vi.mock('./hooks/useChatStream', () => ({
  useChatStream: vi.fn(),
}))

import { useChatStream } from './hooks/useChatStream'

describe('ChatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock scrollIntoView for jsdom
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('shows API key required message when no API key is configured', () => {
    vi.mocked(useChatStream).mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      hasApiKey: false,
    })

    render(<ChatPage />)

    expect(screen.getByText('API Key Required')).toBeDefined()
    expect(screen.getByText(/Please configure your OpenAI API key/)).toBeDefined()
    expect(screen.getByRole('button', { name: /Configure API Key/i })).toBeDefined()
  })

  it('shows empty state when there are no messages', () => {
    vi.mocked(useChatStream).mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      hasApiKey: true,
    })

    render(<ChatPage />)

    // Check for unique empty state text
    expect(screen.getByText('Send a message to begin chatting with AI')).toBeDefined()
    expect(screen.getByText('AI Chat')).toBeDefined()
  })

  it('displays messages when conversation exists', () => {
    vi.mocked(useChatStream).mockReturnValue({
      messages: [
        { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
        { id: '2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
      ],
      isLoading: false,
      error: null,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      hasApiKey: true,
    })

    render(<ChatPage />)

    expect(screen.getByText('Hello')).toBeDefined()
    expect(screen.getByText('Hi there!')).toBeDefined()
    expect(screen.getByText('2 messages')).toBeDefined()
  })

  it('shows error message when there is an error', () => {
    vi.mocked(useChatStream).mockReturnValue({
      messages: [],
      isLoading: false,
      error: 'Failed to send message',
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      hasApiKey: true,
    })

    render(<ChatPage />)

    expect(screen.getByText(/Error:/)).toBeDefined()
    expect(screen.getByText(/Failed to send message/)).toBeDefined()
  })

  it('renders input field and send button', () => {
    vi.mocked(useChatStream).mockReturnValue({
      messages: [],
      isLoading: false,
      error: null,
      sendMessage: vi.fn(),
      clearMessages: vi.fn(),
      hasApiKey: true,
    })

    render(<ChatPage />)

    expect(screen.getByPlaceholderText('Type your message...')).toBeDefined()
  })
})
