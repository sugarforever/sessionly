import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { SessionItem } from '@/features/sessions/components/SessionItem'
import { renderWithProviders, createMockSessionSummary } from '../testUtils'

describe('SessionItem', () => {
  const defaultProps = {
    session: createMockSessionSummary(),
    isSelected: false,
    onSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render session first message preview', () => {
      const session = createMockSessionSummary({ firstMessage: 'Help me debug this function' })
      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      expect(screen.getByText(/Help me debug this function/)).toBeInTheDocument()
    })

    it('should truncate long messages to 80 characters', () => {
      const longMessage =
        'This is a very long message that should be truncated because it exceeds the maximum length allowed for the preview text'
      const session = createMockSessionSummary({ firstMessage: longMessage })

      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      // The displayed text should be truncated
      const preview = screen.getByText(/This is a very long message/)
      expect(preview.textContent!.length).toBeLessThanOrEqual(80)
    })

    it('should show "No messages" for empty first message', () => {
      const session = createMockSessionSummary({ firstMessage: '' })
      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      expect(screen.getByText('No messages')).toBeInTheDocument()
    })

    it('should display message count', () => {
      const session = createMockSessionSummary({ messageCount: 42 })
      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      expect(screen.getByText('42')).toBeInTheDocument()
    })

    it('should display git branch when available', () => {
      const session = createMockSessionSummary({ gitBranch: 'feature/new-feature' })
      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      expect(screen.getByText('feature/new-feature')).toBeInTheDocument()
    })

    it('should not display git branch section when null', () => {
      const session = createMockSessionSummary({ gitBranch: null })
      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      // Should only show message count icon, not git branch icon
      const gitBranchIcon = document.querySelector('svg.lucide-git-branch')
      expect(gitBranchIcon).not.toBeInTheDocument()
    })
  })

  describe('date formatting', () => {
    it('should show time for today\'s sessions', () => {
      const now = new Date()
      const session = createMockSessionSummary({
        startTime: now.getTime() - 3600000, // 1 hour ago
      })

      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      // Should show HH:mm format
      const timeRegex = /^\d{2}:\d{2}$/
      const dateElement = screen.getByText(timeRegex)
      expect(dateElement).toBeInTheDocument()
    })

    it('should show day and time for sessions within a week', () => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

      const session = createMockSessionSummary({
        startTime: threeDaysAgo.getTime(),
      })

      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      // Should show day name and time (e.g., "Mon 14:30")
      const dateElement = screen.getByText(/\w{3} \d{2}:\d{2}/)
      expect(dateElement).toBeInTheDocument()
    })

    it('should show month and day for older sessions', () => {
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)

      const session = createMockSessionSummary({
        startTime: twoWeeksAgo.getTime(),
      })

      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      // Should show "MMM d" format (e.g., "Jan 5")
      const dateElement = screen.getByText(/\w{3} \d{1,2}/)
      expect(dateElement).toBeInTheDocument()
    })

    it('should handle null startTime gracefully', () => {
      const session = createMockSessionSummary({ startTime: null })
      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      // Should not crash and should not show date
      expect(screen.queryByText(/\d{2}:\d{2}/)).not.toBeInTheDocument()
    })
  })

  describe('selection state', () => {
    it('should have selected styling when isSelected is true', () => {
      renderWithProviders(<SessionItem {...defaultProps} isSelected={true} />)

      const button = screen.getByRole('button')
      expect(button.className).toContain('border-l-2')
    })

    it('should have default styling when isSelected is false', () => {
      renderWithProviders(<SessionItem {...defaultProps} isSelected={false} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('border-transparent')
    })
  })

  describe('interactions', () => {
    it('should call onSelect when clicked', () => {
      const onSelect = vi.fn()
      renderWithProviders(<SessionItem {...defaultProps} onSelect={onSelect} />)

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onSelect).toHaveBeenCalledTimes(1)
    })

    it('should have hover styling', () => {
      renderWithProviders(<SessionItem {...defaultProps} isSelected={false} />)

      const button = screen.getByRole('button')
      // hover styling is applied via hover:bg-zinc-800/40
      expect(button.className).toContain('hover:')
    })
  })

  describe('message preview', () => {
    it('should replace newlines with spaces in preview', () => {
      const session = createMockSessionSummary({
        firstMessage: 'Line one\nLine two\nLine three',
      })

      renderWithProviders(<SessionItem {...defaultProps} session={session} />)

      const preview = screen.getByText(/Line one Line two Line three/)
      expect(preview).toBeInTheDocument()
    })
  })
})
