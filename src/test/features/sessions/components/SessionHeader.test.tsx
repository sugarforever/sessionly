import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { SessionHeader } from '@/features/sessions/components/SessionHeader'
import { renderWithProviders, createMockSession } from '../testUtils'

describe('SessionHeader', () => {
  const defaultProps = {
    session: createMockSession(),
    showTerminal: false,
    onToggleTerminal: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('project information', () => {
    it('should display project path', () => {
      const session = createMockSession({ project: '/Users/test/my-project' })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      expect(screen.getByText('/Users/test/my-project')).toBeInTheDocument()
    })

    it('should truncate long project paths', () => {
      const longPath = '/Users/test/very/long/path/to/some/deeply/nested/project'
      const session = createMockSession({ project: longPath })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      const projectElement = screen.getByText(longPath)
      expect(projectElement).toHaveClass('truncate')
    })

    it('should show full path in title attribute', () => {
      const fullPath = '/Users/test/my-project'
      const session = createMockSession({ project: fullPath })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      const projectElement = screen.getByText(fullPath)
      expect(projectElement).toHaveAttribute('title', fullPath)
    })

    it('should show folder icon', () => {
      renderWithProviders(<SessionHeader {...defaultProps} />)

      const folderIcon = document.querySelector('svg.lucide-folder')
      expect(folderIcon).toBeInTheDocument()
    })
  })

  describe('git branch', () => {
    it('should display git branch when available', () => {
      const session = createMockSession({ gitBranch: 'feature/awesome-feature' })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      expect(screen.getByText('feature/awesome-feature')).toBeInTheDocument()
    })

    it('should show git branch icon when branch is available', () => {
      const session = createMockSession({ gitBranch: 'main' })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      const gitBranchIcon = document.querySelector('svg.lucide-git-branch')
      expect(gitBranchIcon).toBeInTheDocument()
    })

    it('should not display git branch section when null', () => {
      const session = createMockSession({ gitBranch: null })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      const gitBranchIcon = document.querySelector('svg.lucide-git-branch')
      expect(gitBranchIcon).not.toBeInTheDocument()
    })
  })

  describe('date and duration', () => {
    it('should display relative date', () => {
      const oneHourAgo = Date.now() - 3600000
      const session = createMockSession({ startTime: oneHourAgo })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      // Should show relative time like "about 1 hour ago" or "1 hour ago"
      expect(screen.getByText(/hour ago/)).toBeInTheDocument()
    })

    it('should display session duration', () => {
      const startTime = Date.now() - 3600000 // 1 hour ago
      const endTime = Date.now() - 1800000 // 30 minutes ago (30 min duration)
      const session = createMockSession({ startTime, endTime })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      // Should show duration in parentheses
      expect(screen.getByText(/\(30m\)/)).toBeInTheDocument()
    })

    it('should display hours and minutes for long sessions', () => {
      const startTime = Date.now() - 7200000 // 2 hours ago
      const endTime = Date.now() - 3600000 // 1 hour ago (1h duration)
      const session = createMockSession({ startTime, endTime })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      expect(screen.getByText(/\(1h 0m\)/)).toBeInTheDocument()
    })

    it('should handle null startTime gracefully', () => {
      const session = createMockSession({ startTime: null })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      // Should not crash and clock icon might not be present
      const clockIcon = document.querySelector('svg.lucide-clock')
      expect(clockIcon).not.toBeInTheDocument()
    })

    it('should show clock icon when date is available', () => {
      renderWithProviders(<SessionHeader {...defaultProps} />)

      const clockIcon = document.querySelector('svg.lucide-clock')
      expect(clockIcon).toBeInTheDocument()
    })
  })

  describe('message count', () => {
    it('should display message count', () => {
      const session = createMockSession({
        messages: [
          { uuid: '1', parentUuid: null, timestamp: '', role: 'user', textContent: 'msg1', thinkingBlocks: [], toolUseBlocks: [], toolResults: {} },
          { uuid: '2', parentUuid: '1', timestamp: '', role: 'assistant', textContent: 'msg2', thinkingBlocks: [], toolUseBlocks: [], toolResults: {} },
          { uuid: '3', parentUuid: '2', timestamp: '', role: 'user', textContent: 'msg3', thinkingBlocks: [], toolUseBlocks: [], toolResults: {} },
        ],
      })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      // Message count shown next to icon
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should show message square icon', () => {
      renderWithProviders(<SessionHeader {...defaultProps} />)

      const messageIcon = document.querySelector('svg.lucide-message-square')
      expect(messageIcon).toBeInTheDocument()
    })
  })

  describe('version badge', () => {
    it('should display version badge', () => {
      const session = createMockSession({ version: '2.1.0' })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      expect(screen.getByText('v2.1.0')).toBeInTheDocument()
    })

    it('should not display version badge when version is empty', () => {
      const session = createMockSession({ version: '' })
      renderWithProviders(<SessionHeader {...defaultProps} session={session} />)

      expect(screen.queryByText(/^v/)).not.toBeInTheDocument()
    })
  })

  describe('terminal button', () => {
    it('should render terminal button', () => {
      renderWithProviders(<SessionHeader {...defaultProps} />)

      const terminalButton = screen.getByRole('button', { name: /terminal/i })
      expect(terminalButton).toBeInTheDocument()
    })

    it('should call onToggleTerminal when clicked', () => {
      const onToggleTerminal = vi.fn()
      renderWithProviders(<SessionHeader {...defaultProps} onToggleTerminal={onToggleTerminal} />)

      const terminalButton = screen.getByRole('button', { name: /terminal/i })
      fireEvent.click(terminalButton)

      expect(onToggleTerminal).toHaveBeenCalledTimes(1)
    })

    it('should have active styling when showTerminal is true', () => {
      renderWithProviders(<SessionHeader {...defaultProps} showTerminal={true} />)

      const terminalButton = screen.getByRole('button', { name: /terminal/i })
      expect(terminalButton).toHaveClass('bg-zinc-800')
    })

    it('should not have active styling when showTerminal is false', () => {
      renderWithProviders(<SessionHeader {...defaultProps} showTerminal={false} />)

      const terminalButton = screen.getByRole('button', { name: /terminal/i })
      expect(terminalButton).not.toHaveClass('bg-zinc-800')
    })

    it('should show terminal icon', () => {
      renderWithProviders(<SessionHeader {...defaultProps} />)

      // Find the terminal button and verify it has an SVG icon
      const terminalButton = screen.getByRole('button', { name: /terminal/i })
      const terminalIcon = terminalButton.querySelector('svg')
      expect(terminalIcon).toBeInTheDocument()
    })
  })
})
