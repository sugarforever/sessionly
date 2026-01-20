import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { SubagentBlock } from '@/features/sessions/components/Message/SubagentBlock'
import { renderWithProviders, createMockMessage, createMockToolUseBlock } from '../../testUtils'
import type { SubagentSession } from '@/../electron/shared/session-types'

// Helper to create mock SubagentSession
function createMockSubagentSession(overrides: Partial<SubagentSession> = {}): SubagentSession {
  return {
    agentId: 'agent-123',
    parentToolUseId: 'tool-use-456',
    messages: [
      createMockMessage({
        uuid: 'subagent-msg-1',
        role: 'user',
        textContent: 'Search for files matching pattern',
      }),
      createMockMessage({
        uuid: 'subagent-msg-2',
        role: 'assistant',
        textContent: 'I found the following files matching your pattern.',
        toolUseBlocks: [createMockToolUseBlock({ name: 'Glob', id: 'tool-1' })],
      }),
    ],
    messageCount: 2,
    ...overrides,
  }
}

describe('SubagentBlock', () => {
  describe('rendering', () => {
    it('should render collapsed by default', () => {
      const subagent = createMockSubagentSession()
      renderWithProviders(<SubagentBlock subagent={subagent} />)

      // Should show the header with message count
      expect(screen.getByText('Agent (2 messages)')).toBeInTheDocument()

      // Should show collapsed preview
      expect(screen.getByText(/Search for files matching pattern/)).toBeInTheDocument()

      // Should show chevron-right icon (collapsed)
      const chevronRight = document.querySelector('svg.lucide-chevron-right')
      expect(chevronRight).toBeInTheDocument()
    })

    it('should render expanded when defaultExpanded is true', () => {
      const subagent = createMockSubagentSession()
      renderWithProviders(<SubagentBlock subagent={subagent} defaultExpanded={true} />)

      // Should show chevron-down icon (expanded)
      const chevronDown = document.querySelector('svg.lucide-chevron-down')
      expect(chevronDown).toBeInTheDocument()

      // Should show all messages when expanded
      expect(screen.getByText('I found the following files matching your pattern.')).toBeInTheDocument()
    })

    it('should show message count in header', () => {
      const subagent = createMockSubagentSession({ messageCount: 5 })
      renderWithProviders(<SubagentBlock subagent={subagent} />)

      expect(screen.getByText('Agent (5 messages)')).toBeInTheDocument()
    })

    it('should show Bot icon', () => {
      const subagent = createMockSubagentSession()
      renderWithProviders(<SubagentBlock subagent={subagent} />)

      const botIcon = document.querySelector('svg.lucide-bot')
      expect(botIcon).toBeInTheDocument()
    })
  })

  describe('expansion behavior', () => {
    it('should toggle expansion when clicking header', () => {
      const subagent = createMockSubagentSession()
      renderWithProviders(<SubagentBlock subagent={subagent} />)

      // Initially collapsed - message content should not be visible
      expect(screen.queryByText('I found the following files matching your pattern.')).not.toBeInTheDocument()

      // Click to expand
      const header = screen.getByRole('button')
      fireEvent.click(header)

      // Should now show expanded content
      expect(screen.getByText('I found the following files matching your pattern.')).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(header)

      // Should hide content again
      expect(screen.queryByText('I found the following files matching your pattern.')).not.toBeInTheDocument()
    })

    it('should hide preview text when expanded', () => {
      const subagent = createMockSubagentSession()
      renderWithProviders(<SubagentBlock subagent={subagent} />)

      // Collapsed - should show preview
      expect(screen.getByText(/Search for files matching pattern/)).toBeInTheDocument()

      // Expand
      fireEvent.click(screen.getByRole('button'))

      // Preview in header should not show the truncated text anymore
      const headerButton = screen.getByRole('button')
      expect(headerButton.textContent).not.toContain('...')
    })
  })

  describe('message rendering', () => {
    it('should show user messages with User icon and Task label', () => {
      const subagent = createMockSubagentSession()
      renderWithProviders(<SubagentBlock subagent={subagent} defaultExpanded={true} />)

      expect(screen.getByText('Task')).toBeInTheDocument()
      const userIcon = document.querySelector('svg.lucide-user')
      expect(userIcon).toBeInTheDocument()
    })

    it('should show assistant messages with Sparkles icon and Agent label', () => {
      const subagent = createMockSubagentSession()
      renderWithProviders(<SubagentBlock subagent={subagent} defaultExpanded={true} />)

      expect(screen.getByText('Agent')).toBeInTheDocument()
      const sparklesIcon = document.querySelector('svg.lucide-sparkles')
      expect(sparklesIcon).toBeInTheDocument()
    })

    it('should display tool use blocks', () => {
      const subagent = createMockSubagentSession({
        messages: [
          createMockMessage({
            uuid: 'msg-1',
            role: 'assistant',
            textContent: 'Running some tools',
            toolUseBlocks: [
              createMockToolUseBlock({ name: 'Read', id: 'tool-1' }),
              createMockToolUseBlock({ name: 'Write', id: 'tool-2' }),
            ],
          }),
        ],
      })

      renderWithProviders(<SubagentBlock subagent={subagent} defaultExpanded={true} />)

      expect(screen.getByText('Read')).toBeInTheDocument()
      expect(screen.getByText('Write')).toBeInTheDocument()
    })

    it('should show Wrench icon for tool calls', () => {
      const subagent = createMockSubagentSession({
        messages: [
          createMockMessage({
            uuid: 'msg-1',
            role: 'assistant',
            textContent: 'Using tools',
            toolUseBlocks: [createMockToolUseBlock({ name: 'Bash', id: 'tool-1' })],
          }),
        ],
      })

      renderWithProviders(<SubagentBlock subagent={subagent} defaultExpanded={true} />)

      const wrenchIcons = document.querySelectorAll('svg.lucide-wrench')
      expect(wrenchIcons.length).toBeGreaterThan(0)
    })
  })

  describe('empty state', () => {
    it('should handle subagent with no messages', () => {
      const subagent = createMockSubagentSession({
        messages: [],
        messageCount: 0,
      })

      renderWithProviders(<SubagentBlock subagent={subagent} />)

      expect(screen.getByText('Agent (0 messages)')).toBeInTheDocument()
    })

    it('should handle message with no text content', () => {
      const subagent = createMockSubagentSession({
        messages: [
          createMockMessage({
            uuid: 'msg-1',
            role: 'assistant',
            textContent: '',
            toolUseBlocks: [createMockToolUseBlock({ name: 'Read', id: 'tool-1' })],
          }),
        ],
      })

      renderWithProviders(<SubagentBlock subagent={subagent} defaultExpanded={true} />)

      // Should still render the tool use block
      expect(screen.getByText('Read')).toBeInTheDocument()
    })
  })

  describe('preview text', () => {
    it('should truncate long preview text', () => {
      const longMessage = 'A'.repeat(100)
      const subagent = createMockSubagentSession({
        messages: [
          createMockMessage({
            uuid: 'msg-1',
            role: 'user',
            textContent: longMessage,
          }),
        ],
      })

      renderWithProviders(<SubagentBlock subagent={subagent} />)

      // The preview should be truncated to 80 characters + "..."
      const preview = screen.getByText(/A+\.\.\./)
      expect(preview.textContent!.length).toBeLessThan(longMessage.length)
    })
  })
})
