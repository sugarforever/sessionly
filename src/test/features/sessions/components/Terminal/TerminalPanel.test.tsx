import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { TerminalPanel } from '@/features/sessions/components/Terminal/TerminalPanel'
import { renderWithProviders } from '../../testUtils'

// Mock the Terminal component since it uses xterm.js which needs DOM
vi.mock('@/features/sessions/components/Terminal/Terminal', () => ({
  Terminal: ({ onReady }: { onReady?: (xterm: unknown) => void }) => {
    // Call onReady after a short delay to simulate real behavior
    setTimeout(() => {
      onReady?.({ write: vi.fn() })
    }, 0)
    return <div data-testid="mock-terminal">Mock Terminal</div>
  },
}))

// Mock electron API
const mockTerminalSpawn = vi.fn()
const mockTerminalWrite = vi.fn()
const mockTerminalResize = vi.fn()
const mockTerminalKill = vi.fn()
const mockOnTerminalData = vi.fn()
const mockOnTerminalExit = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  mockTerminalSpawn.mockResolvedValue({
    success: true,
    data: 'terminal-123',
  })
  mockTerminalKill.mockResolvedValue({ success: true })
  mockOnTerminalData.mockReturnValue(vi.fn())
  mockOnTerminalExit.mockReturnValue(vi.fn())

  global.window.electron = {
    ...global.window.electron,
    terminalSpawn: mockTerminalSpawn,
    terminalWrite: mockTerminalWrite,
    terminalResize: mockTerminalResize,
    terminalKill: mockTerminalKill,
    onTerminalData: mockOnTerminalData,
    onTerminalExit: mockOnTerminalExit,
  } as typeof window.electron
})

describe('TerminalPanel', () => {
  describe('rendering', () => {
    it('should render terminal header', () => {
      const onClose = vi.fn()
      renderWithProviders(<TerminalPanel onClose={onClose} />)

      expect(screen.getByText('Terminal')).toBeInTheDocument()
    })

    it('should render close button', () => {
      const onClose = vi.fn()
      renderWithProviders(<TerminalPanel onClose={onClose} />)

      const closeButton = screen.getByRole('button')
      expect(closeButton).toBeInTheDocument()
    })

    it('should render terminal icon', () => {
      const onClose = vi.fn()
      const { container } = renderWithProviders(<TerminalPanel onClose={onClose} />)

      // Lucide icons add classes like "lucide lucide-terminal-square"
      const terminalIcon = container.querySelector('svg[class*="lucide"]')
      expect(terminalIcon).toBeInTheDocument()
    })

    it('should render terminal component', () => {
      const onClose = vi.fn()
      renderWithProviders(<TerminalPanel onClose={onClose} />)

      expect(screen.getByTestId('mock-terminal')).toBeInTheDocument()
    })
  })

  describe('terminal spawning', () => {
    it('should spawn terminal on mount', async () => {
      const onClose = vi.fn()
      renderWithProviders(<TerminalPanel onClose={onClose} />)

      await waitFor(() => {
        expect(mockTerminalSpawn).toHaveBeenCalled()
      })
    })

    it('should spawn terminal with cwd when provided', async () => {
      const onClose = vi.fn()
      renderWithProviders(<TerminalPanel cwd="/test/path" onClose={onClose} />)

      await waitFor(() => {
        expect(mockTerminalSpawn).toHaveBeenCalledWith(
          expect.objectContaining({
            cwd: '/test/path',
          })
        )
      })
    })

    it('should spawn terminal with sessionId when provided', async () => {
      const onClose = vi.fn()
      renderWithProviders(<TerminalPanel sessionId="session-456" onClose={onClose} />)

      await waitFor(() => {
        expect(mockTerminalSpawn).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'session-456',
          })
        )
      })
    })

    it('should spawn terminal with both cwd and sessionId', async () => {
      const onClose = vi.fn()
      renderWithProviders(
        <TerminalPanel cwd="/project/dir" sessionId="session-789" onClose={onClose} />
      )

      await waitFor(() => {
        expect(mockTerminalSpawn).toHaveBeenCalledWith({
          cwd: '/project/dir',
          sessionId: 'session-789',
        })
      })
    })
  })

  describe('running indicator', () => {
    it('should show running indicator when terminal is running', async () => {
      const onClose = vi.fn()
      const { container } = renderWithProviders(<TerminalPanel onClose={onClose} />)

      await waitFor(() => {
        const runningIndicator = container.querySelector('.bg-emerald-500')
        expect(runningIndicator).toBeInTheDocument()
      })
    })
  })

  describe('close behavior', () => {
    it('should call onClose when close button clicked', async () => {
      const onClose = vi.fn()
      renderWithProviders(<TerminalPanel onClose={onClose} />)

      const closeButton = screen.getByRole('button')
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })

    it('should kill terminal when close button clicked', async () => {
      const onClose = vi.fn()
      renderWithProviders(<TerminalPanel onClose={onClose} />)

      // Wait for terminal to spawn
      await waitFor(() => {
        expect(mockTerminalSpawn).toHaveBeenCalled()
      })

      const closeButton = screen.getByRole('button')
      fireEvent.click(closeButton)

      expect(mockTerminalKill).toHaveBeenCalledWith('terminal-123')
    })
  })

  describe('cleanup on unmount', () => {
    it('should not throw when unmounted', async () => {
      const onClose = vi.fn()
      const { unmount } = renderWithProviders(<TerminalPanel onClose={onClose} />)

      // Wait for terminal to spawn
      await waitFor(() => {
        expect(mockTerminalSpawn).toHaveBeenCalled()
      })

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('error state', () => {
    it('should show error message when spawn fails', async () => {
      mockTerminalSpawn.mockResolvedValue({
        success: false,
        error: 'Failed to create terminal',
      })

      const onClose = vi.fn()
      renderWithProviders(<TerminalPanel onClose={onClose} />)

      await waitFor(() => {
        expect(screen.getByText('Failed to create terminal')).toBeInTheDocument()
      })
    })

    it('should not show terminal component when there is an error', async () => {
      mockTerminalSpawn.mockResolvedValue({
        success: false,
        error: 'Error occurred',
      })

      const onClose = vi.fn()
      renderWithProviders(<TerminalPanel onClose={onClose} />)

      await waitFor(() => {
        expect(screen.getByText('Error occurred')).toBeInTheDocument()
      })

      // Terminal component should not be rendered
      expect(screen.queryByTestId('mock-terminal')).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should have dark background', () => {
      const onClose = vi.fn()
      const { container } = renderWithProviders(<TerminalPanel onClose={onClose} />)

      const wrapper = container.firstChild as HTMLElement
      expect(wrapper.className).toContain('bg-')
    })

    it('should have top border', () => {
      const onClose = vi.fn()
      const { container } = renderWithProviders(<TerminalPanel onClose={onClose} />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('border-t')
    })

    it('should have header with bottom border', () => {
      const onClose = vi.fn()
      const { container } = renderWithProviders(<TerminalPanel onClose={onClose} />)

      const header = container.querySelector('.border-b')
      expect(header).toBeInTheDocument()
    })
  })
})
