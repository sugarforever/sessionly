import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { SessionView } from '@/features/sessions/components/SessionView'
import { renderWithProviders, createMockSession, createMockMessage } from '../testUtils'

// Mock the Terminal components since they have external dependencies
vi.mock('@/features/sessions/components/Terminal/TerminalPanel', () => ({
  TerminalPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="terminal-panel">
      <button onClick={onClose}>Close Terminal</button>
    </div>
  ),
}))

describe('SessionView', () => {
  const defaultProps = {
    session: null,
    isLoading: false,
    error: null,
  }

  describe('loading state', () => {
    it('should show loading spinner when isLoading is true', () => {
      renderWithProviders(<SessionView {...defaultProps} isLoading={true} />)

      // Loader2 component should be present (check for animate-spin class)
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should not show session content when loading', () => {
      const session = createMockSession()
      renderWithProviders(<SessionView {...defaultProps} session={session} isLoading={true} />)

      // Should show spinner, not session content
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('should show error message when error is present', () => {
      renderWithProviders(<SessionView {...defaultProps} error="Session file corrupted" />)

      // Should show the hardcoded error label
      expect(screen.getByText('Failed to load session')).toBeInTheDocument()
      // Should show the specific error message
      expect(screen.getByText('Session file corrupted')).toBeInTheDocument()
    })

    it('should show generic error text', () => {
      renderWithProviders(<SessionView {...defaultProps} error="Network error" />)

      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show placeholder when no session is selected', () => {
      renderWithProviders(<SessionView {...defaultProps} />)

      expect(screen.getByText('No Session Selected')).toBeInTheDocument()
      expect(
        screen.getByText('Select a session from the sidebar to view its contents')
      ).toBeInTheDocument()
    })
  })

  describe('session display', () => {
    it('should render session header when session is provided', () => {
      const session = createMockSession({ project: '/Users/test/myproject' })
      renderWithProviders(<SessionView {...defaultProps} session={session} />)

      // Should show project path
      expect(screen.getByText('/Users/test/myproject')).toBeInTheDocument()
    })

    it('should render messages when session is provided', () => {
      const session = createMockSession({
        messages: [
          createMockMessage({ role: 'user', textContent: 'Hello from user' }),
          createMockMessage({ role: 'assistant', textContent: 'Hello from assistant' }),
        ],
      })

      renderWithProviders(<SessionView {...defaultProps} session={session} />)

      expect(screen.getByText('Hello from user')).toBeInTheDocument()
      expect(screen.getByText('Hello from assistant')).toBeInTheDocument()
    })

    it('should show git branch in header', () => {
      const session = createMockSession({ gitBranch: 'feature/test-branch' })
      renderWithProviders(<SessionView {...defaultProps} session={session} />)

      expect(screen.getByText('feature/test-branch')).toBeInTheDocument()
    })

    it('should show message count in header', () => {
      const session = createMockSession({
        messages: [
          createMockMessage(),
          createMockMessage(),
          createMockMessage(),
        ],
      })

      renderWithProviders(<SessionView {...defaultProps} session={session} />)

      // Message count shown next to icon
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('terminal panel', () => {
    it('should not show terminal by default', () => {
      const session = createMockSession()
      renderWithProviders(<SessionView {...defaultProps} session={session} />)

      expect(screen.queryByTestId('terminal-panel')).not.toBeInTheDocument()
    })

    it('should show terminal when Terminal button is clicked', () => {
      const session = createMockSession()
      renderWithProviders(<SessionView {...defaultProps} session={session} />)

      // Click the Terminal button in the header
      const terminalButton = screen.getByRole('button', { name: /terminal/i })
      fireEvent.click(terminalButton)

      expect(screen.getByTestId('terminal-panel')).toBeInTheDocument()
    })

    it('should hide terminal when close is clicked', () => {
      const session = createMockSession()
      renderWithProviders(<SessionView {...defaultProps} session={session} />)

      // Open terminal
      const terminalButton = screen.getByRole('button', { name: /terminal/i })
      fireEvent.click(terminalButton)

      expect(screen.getByTestId('terminal-panel')).toBeInTheDocument()

      // Close terminal
      const closeButton = screen.getByText('Close Terminal')
      fireEvent.click(closeButton)

      expect(screen.queryByTestId('terminal-panel')).not.toBeInTheDocument()
    })

    it('should toggle terminal button state when terminal is open', () => {
      const session = createMockSession()
      renderWithProviders(<SessionView {...defaultProps} session={session} />)

      const terminalButton = screen.getByRole('button', { name: /terminal/i })

      // Initially not active
      expect(terminalButton).not.toHaveClass('bg-zinc-800')

      // Click to open
      fireEvent.click(terminalButton)

      // Should have active class
      expect(terminalButton).toHaveClass('bg-zinc-800')
    })
  })

  describe('layout', () => {
    it('should have full height layout', () => {
      const session = createMockSession()
      const { container } = renderWithProviders(
        <SessionView {...defaultProps} session={session} />
      )

      const mainContainer = container.firstChild
      expect(mainContainer).toHaveClass('h-full')
    })

    it('should split layout when terminal is shown', () => {
      const session = createMockSession()
      renderWithProviders(<SessionView {...defaultProps} session={session} />)

      // Open terminal
      const terminalButton = screen.getByRole('button', { name: /terminal/i })
      fireEvent.click(terminalButton)

      // Both message list and terminal should be visible
      expect(screen.getByText(/Hello/)).toBeInTheDocument()
      expect(screen.getByTestId('terminal-panel')).toBeInTheDocument()
    })
  })
})
