import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from './ChatMessage'
import type { ChatMessage as ChatMessageType } from '../types'

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    const message: ChatMessageType = {
      id: '1',
      role: 'user',
      content: 'Hello, AI!',
      timestamp: Date.now(),
    }

    render(<ChatMessage message={message} />)

    expect(screen.getByText('You')).toBeDefined()
    expect(screen.getByText('Hello, AI!')).toBeDefined()
  })

  it('renders assistant message correctly', () => {
    const message: ChatMessageType = {
      id: '2',
      role: 'assistant',
      content: 'Hello! How can I help you?',
      timestamp: Date.now(),
    }

    render(<ChatMessage message={message} />)

    expect(screen.getByText('Assistant')).toBeDefined()
    expect(screen.getByText('Hello! How can I help you?')).toBeDefined()
  })

  it('shows loading indicator for empty assistant message', () => {
    const message: ChatMessageType = {
      id: '3',
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }

    const { container } = render(<ChatMessage message={message} />)

    // Check for the pulsing cursor (loading indicator)
    const loadingIndicator = container.querySelector('.animate-pulse')
    expect(loadingIndicator).toBeTruthy()
  })

  it('preserves whitespace in message content', () => {
    const message: ChatMessageType = {
      id: '4',
      role: 'user',
      content: 'Line 1\nLine 2\nLine 3',
      timestamp: Date.now(),
    }

    const { container } = render(<ChatMessage message={message} />)

    // Check that the content container has whitespace-pre-wrap class
    const contentDiv = container.querySelector('.whitespace-pre-wrap')
    expect(contentDiv).toBeTruthy()
  })
})
