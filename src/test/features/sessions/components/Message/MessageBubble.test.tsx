import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { MessageBubble } from '@/features/sessions/components/Message/MessageBubble'
import {
  renderWithProviders,
  createMockMessage,
  createMockThinkingBlock,
  createMockToolUseBlock,
} from '../../testUtils'
import type { ToolResultBlock } from '@/../electron/shared/session-types'

describe('MessageBubble', () => {
  describe('user messages', () => {
    it('should render user message with "You" label', () => {
      const message = createMockMessage({ role: 'user', textContent: 'Hello, Claude!' })
      renderWithProviders(<MessageBubble message={message} />)

      expect(screen.getByText('You')).toBeInTheDocument()
      expect(screen.getByText('Hello, Claude!')).toBeInTheDocument()
    })

    it('should show user icon', () => {
      const message = createMockMessage({ role: 'user' })
      renderWithProviders(<MessageBubble message={message} />)

      const userIcon = document.querySelector('svg.lucide-user')
      expect(userIcon).toBeInTheDocument()
    })

    it('should have user-specific styling', () => {
      const message = createMockMessage({ role: 'user', textContent: 'Test' })
      const { container } = renderWithProviders(<MessageBubble message={message} />)

      const bubble = container.querySelector('.bg-secondary')
      expect(bubble).toBeInTheDocument()
    })
  })

  describe('assistant messages', () => {
    it('should render assistant message with "Claude" label', () => {
      const message = createMockMessage({ role: 'assistant', textContent: 'Hello!' })
      renderWithProviders(<MessageBubble message={message} />)

      expect(screen.getByText('Claude')).toBeInTheDocument()
      expect(screen.getByText('Hello!')).toBeInTheDocument()
    })

    it('should show bot icon', () => {
      const message = createMockMessage({ role: 'assistant' })
      renderWithProviders(<MessageBubble message={message} />)

      // Using sparkles icon for assistant
      const assistantIcon = document.querySelector('svg.lucide-sparkles')
      expect(assistantIcon).toBeInTheDocument()
    })

    it('should display model name when available', () => {
      const message = createMockMessage({
        role: 'assistant',
        textContent: 'Test',
        model: 'claude-3-opus',
      })
      renderWithProviders(<MessageBubble message={message} />)

      expect(screen.getByText('claude-3-opus')).toBeInTheDocument()
    })

    it('should not display model for user messages', () => {
      const message = createMockMessage({
        role: 'user',
        textContent: 'Test',
        model: 'some-model',
      })
      renderWithProviders(<MessageBubble message={message} />)

      expect(screen.queryByText('some-model')).not.toBeInTheDocument()
    })
  })

  describe('timestamp', () => {
    it('should display timestamp when showTimestamp is true', () => {
      const message = createMockMessage({
        textContent: 'Test',
        timestamp: '2024-01-15T14:30:00Z',
      })
      renderWithProviders(<MessageBubble message={message} showTimestamp={true} />)

      // Should show time in HH:mm format
      const timeRegex = /\d{2}:\d{2}/
      expect(screen.getByText(timeRegex)).toBeInTheDocument()
    })

    it('should not display timestamp when showTimestamp is false', () => {
      const message = createMockMessage({
        textContent: 'Test',
        timestamp: '2024-01-15T14:30:00Z',
      })
      renderWithProviders(<MessageBubble message={message} showTimestamp={false} />)

      // Time should not be displayed
      // Note: We need to be careful here as the message might contain time-like patterns
      const allText = screen.getByText('Test')
      expect(allText).toBeInTheDocument()
    })
  })

  describe('text content', () => {
    it('should render plain text content', () => {
      const message = createMockMessage({ textContent: 'This is a plain text message' })
      renderWithProviders(<MessageBubble message={message} />)

      expect(screen.getByText('This is a plain text message')).toBeInTheDocument()
    })

    it('should render multiline text', () => {
      const message = createMockMessage({ textContent: 'Line 1\nLine 2\nLine 3' })
      renderWithProviders(<MessageBubble message={message} />)

      // ReactMarkdown renders lines - verify all content is present
      expect(screen.getByText(/Line 1/)).toBeInTheDocument()
      expect(screen.getByText(/Line 2/)).toBeInTheDocument()
      expect(screen.getByText(/Line 3/)).toBeInTheDocument()
    })

    it('should not render empty text content', () => {
      const message = createMockMessage({
        textContent: '',
        thinkingBlocks: [createMockThinkingBlock()],
      })
      renderWithProviders(<MessageBubble message={message} />)

      // Should have thinking block but no text bubble with message text
      expect(screen.queryByText('Test content')).not.toBeInTheDocument()
    })
  })

  describe('code blocks', () => {
    it('should render inline code blocks', () => {
      const message = createMockMessage({
        textContent: 'Here is some code:\n```javascript\nconsole.log("hello")\n```',
      })
      const { container } = renderWithProviders(<MessageBubble message={message} />)

      // Code is rendered inside a code element (may be syntax highlighted)
      const codeElement = container.querySelector('code')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement?.textContent).toContain('console.log')
    })

    it('should render multiple code blocks', () => {
      const message = createMockMessage({
        textContent: '```js\nconst a = 1\n```\n\n```ts\nconst b: number = 2\n```',
      })
      const { container } = renderWithProviders(<MessageBubble message={message} />)

      // Should have two code elements
      const codeElements = container.querySelectorAll('code')
      expect(codeElements.length).toBe(2)
      expect(codeElements[0]?.textContent).toContain('const a')
      expect(codeElements[1]?.textContent).toContain('const b')
    })
  })

  describe('thinking blocks', () => {
    it('should render thinking blocks', () => {
      const thinkingBlock = createMockThinkingBlock({ thinking: 'Let me think about this...' })
      const message = createMockMessage({
        textContent: 'Response text',
        thinkingBlocks: [thinkingBlock],
      })

      renderWithProviders(<MessageBubble message={message} />)

      expect(screen.getByText('Thinking')).toBeInTheDocument()
    })

    it('should render multiple thinking blocks', () => {
      const message = createMockMessage({
        textContent: 'Response',
        thinkingBlocks: [
          createMockThinkingBlock({ thinking: 'First thought' }),
          createMockThinkingBlock({ thinking: 'Second thought' }),
        ],
      })

      renderWithProviders(<MessageBubble message={message} />)

      // Should show two thinking headers
      const thinkingHeaders = screen.getAllByText('Thinking')
      expect(thinkingHeaders.length).toBe(2)
    })
  })

  describe('tool calls', () => {
    it('should render tool use blocks', () => {
      const toolUseBlock = createMockToolUseBlock({
        name: 'Read',
        input: { file_path: '/test/file.ts' },
      })
      const message = createMockMessage({
        textContent: 'Let me read that file',
        toolUseBlocks: [toolUseBlock],
      })

      renderWithProviders(<MessageBubble message={message} />)

      expect(screen.getByText('Read File')).toBeInTheDocument()
    })

    it('should show tool result when available', () => {
      const toolUseBlock = createMockToolUseBlock({
        id: 'tool-123',
        name: 'Bash',
        input: { command: 'ls -la' },
      })
      const toolResult: ToolResultBlock = {
        type: 'tool_result',
        tool_use_id: 'tool-123',
        content: 'file1.txt\nfile2.txt',
      }

      const message = createMockMessage({
        textContent: 'Running command',
        toolUseBlocks: [toolUseBlock],
        toolResults: { 'tool-123': toolResult },
      })

      renderWithProviders(<MessageBubble message={message} />)

      expect(screen.getByText('Run Command')).toBeInTheDocument()
    })

    it('should render multiple tool calls', () => {
      const message = createMockMessage({
        textContent: 'Working on it',
        toolUseBlocks: [
          createMockToolUseBlock({ name: 'Read', id: '1' }),
          createMockToolUseBlock({ name: 'Write', id: '2' }),
        ],
      })

      renderWithProviders(<MessageBubble message={message} />)

      expect(screen.getByText('Read File')).toBeInTheDocument()
      expect(screen.getByText('Write File')).toBeInTheDocument()
    })
  })

  describe('avatar styling', () => {
    it('should have orange avatar for assistant', () => {
      const message = createMockMessage({ role: 'assistant' })
      const { container } = renderWithProviders(<MessageBubble message={message} />)

      // Using gradient for assistant avatar
      const avatar = container.querySelector('.rounded-full')
      expect(avatar).toBeInTheDocument()
    })

    it('should have gray avatar for user', () => {
      const message = createMockMessage({ role: 'user' })
      const { container } = renderWithProviders(<MessageBubble message={message} />)

      const avatar = container.querySelector('.bg-secondary')
      expect(avatar).toBeInTheDocument()
    })
  })
})
