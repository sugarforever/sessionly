import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { MessageList } from '@/features/sessions/components/MessageList'
import { renderWithProviders, createMockMessage } from '../testUtils'

describe('MessageList', () => {
  describe('empty state', () => {
    it('should show empty message when no messages', () => {
      renderWithProviders(<MessageList messages={[]} />)

      expect(screen.getByText('No messages in this session')).toBeInTheDocument()
    })
  })

  describe('rendering messages', () => {
    it('should render all messages', () => {
      const messages = [
        createMockMessage({ textContent: 'First message', role: 'user' }),
        createMockMessage({ textContent: 'Second message', role: 'assistant' }),
        createMockMessage({ textContent: 'Third message', role: 'user' }),
      ]

      renderWithProviders(<MessageList messages={messages} />)

      expect(screen.getByText('First message')).toBeInTheDocument()
      expect(screen.getByText('Second message')).toBeInTheDocument()
      expect(screen.getByText('Third message')).toBeInTheDocument()
    })

    it('should render user and assistant messages differently', () => {
      const messages = [
        createMockMessage({ textContent: 'User says hello', role: 'user' }),
        createMockMessage({ textContent: 'Assistant responds', role: 'assistant' }),
      ]

      renderWithProviders(<MessageList messages={messages} />)

      expect(screen.getByText('You')).toBeInTheDocument()
      expect(screen.getByText('Claude')).toBeInTheDocument()
    })

    it('should maintain message order', () => {
      const messages = [
        createMockMessage({ textContent: 'Message 1', role: 'user', uuid: '1' }),
        createMockMessage({ textContent: 'Message 2', role: 'assistant', uuid: '2' }),
        createMockMessage({ textContent: 'Message 3', role: 'user', uuid: '3' }),
      ]

      const { container } = renderWithProviders(<MessageList messages={messages} />)

      // Find container with space-y-* class
      const spacedContainer = container.querySelector('[class*="space-y-"]')
      const messageTexts = spacedContainer?.querySelectorAll(':scope > div')
      expect(messageTexts?.length).toBe(3)
    })
  })

  describe('timestamp display', () => {
    it('should show timestamp for first message', () => {
      const now = new Date()
      const messages = [
        createMockMessage({
          textContent: 'First message',
          timestamp: now.toISOString(),
        }),
      ]

      renderWithProviders(<MessageList messages={messages} />)

      // Should show time in HH:mm format
      const timeRegex = /\d{2}:\d{2}/
      const timeElement = screen.getByText(timeRegex)
      expect(timeElement).toBeInTheDocument()
    })

    it('should show timestamp when messages are more than 1 minute apart', () => {
      const now = new Date()
      const twoMinutesLater = new Date(now.getTime() + 120000)

      const messages = [
        createMockMessage({
          textContent: 'First message',
          timestamp: now.toISOString(),
        }),
        createMockMessage({
          textContent: 'Second message',
          timestamp: twoMinutesLater.toISOString(),
        }),
      ]

      renderWithProviders(<MessageList messages={messages} />)

      // Both messages should show timestamps
      const timeElements = screen.getAllByText(/\d{2}:\d{2}/)
      expect(timeElements.length).toBe(2)
    })

    it('should not show timestamp for rapid consecutive messages', () => {
      const now = new Date()
      const thirtySecondsLater = new Date(now.getTime() + 30000)

      const messages = [
        createMockMessage({
          textContent: 'First message',
          timestamp: now.toISOString(),
        }),
        createMockMessage({
          textContent: 'Second message',
          timestamp: thirtySecondsLater.toISOString(),
        }),
      ]

      renderWithProviders(<MessageList messages={messages} />)

      // Only first message should show timestamp (within 1 minute)
      const timeElements = screen.getAllByText(/\d{2}:\d{2}/)
      expect(timeElements.length).toBe(1)
    })
  })

  describe('scroll behavior', () => {
    it('should have overflow-y-auto for scrolling', () => {
      const messages = [createMockMessage({ textContent: 'Test' })]
      const { container } = renderWithProviders(<MessageList messages={messages} />)

      const scrollContainer = container.querySelector('.overflow-y-auto')
      expect(scrollContainer).toBeInTheDocument()
    })

    it('should have padding for message content', () => {
      const messages = [createMockMessage({ textContent: 'Test' })]
      const { container } = renderWithProviders(<MessageList messages={messages} />)

      // Check for padding classes (px-6 py-6 or similar)
      const paddedContainer = container.querySelector('[class*="px-"]')
      expect(paddedContainer).toBeInTheDocument()
    })

    it('should have max width for readability', () => {
      const messages = [createMockMessage({ textContent: 'Test' })]
      const { container } = renderWithProviders(<MessageList messages={messages} />)

      const constrainedContainer = container.querySelector('.max-w-4xl')
      expect(constrainedContainer).toBeInTheDocument()
    })
  })

  describe('message spacing', () => {
    it('should have proper spacing between messages', () => {
      const messages = [
        createMockMessage({ textContent: 'First', uuid: '1' }),
        createMockMessage({ textContent: 'Second', uuid: '2' }),
      ]

      const { container } = renderWithProviders(<MessageList messages={messages} />)

      // Check for space-y-* class for message spacing
      const spacedContainer = container.querySelector('[class*="space-y-"]')
      expect(spacedContainer).toBeInTheDocument()
    })
  })

  describe('centering', () => {
    it('should center content horizontally', () => {
      const messages = [createMockMessage({ textContent: 'Test' })]
      const { container } = renderWithProviders(<MessageList messages={messages} />)

      const centeredContainer = container.querySelector('.mx-auto')
      expect(centeredContainer).toBeInTheDocument()
    })
  })

  describe('with scrollToBottom prop', () => {
    it('should accept scrollToBottom prop', () => {
      const messages = [createMockMessage({ textContent: 'Test' })]

      // Should not throw
      expect(() => {
        renderWithProviders(<MessageList messages={messages} scrollToBottom={true} />)
      }).not.toThrow()
    })

    it('should work without scrollToBottom prop', () => {
      const messages = [createMockMessage({ textContent: 'Test' })]

      // Should not throw
      expect(() => {
        renderWithProviders(<MessageList messages={messages} />)
      }).not.toThrow()
    })
  })
})
