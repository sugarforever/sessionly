import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { SessionSidebar } from '@/features/sessions/components/SessionSidebar'
import { renderWithProviders, createMockProjectGroup, createMockSessionSummary } from '../testUtils'

describe('SessionSidebar', () => {
  const defaultProps = {
    projectGroups: [],
    selectedSessionId: null,
    isLoading: false,
    onSelectSession: vi.fn(),
    onRefresh: vi.fn(),
    showHidden: false,
    hiddenCount: { projects: 0, sessions: 0 },
    onToggleShowHidden: vi.fn(),
    onHideProject: vi.fn(),
    onUnhideProject: vi.fn(),
    onHideSession: vi.fn(),
    onUnhideSession: vi.fn(),
    hiddenProjects: [] as string[],
    hiddenSessions: [] as string[],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the header with title', () => {
      renderWithProviders(<SessionSidebar {...defaultProps} />)

      expect(screen.getByText('Sessions')).toBeInTheDocument()
    })

    it('should display correct session count', () => {
      const projectGroups = [
        createMockProjectGroup({
          sessions: [
            createMockSessionSummary({ id: 'session-1' }),
            createMockSessionSummary({ id: 'session-2' }),
          ],
        }),
        createMockProjectGroup({
          projectEncoded: '-Users-test-project2',
          sessions: [createMockSessionSummary({ id: 'session-3' })],
        }),
      ]

      renderWithProviders(<SessionSidebar {...defaultProps} projectGroups={projectGroups} />)

      expect(screen.getByText(/3 in 2 projects/)).toBeInTheDocument()
    })

    it('should display singular form for 1 session in 1 project', () => {
      const projectGroups = [createMockProjectGroup()]

      renderWithProviders(<SessionSidebar {...defaultProps} projectGroups={projectGroups} />)

      expect(screen.getByText(/1 in 1 project/)).toBeInTheDocument()
    })

    it('should show refresh button', () => {
      renderWithProviders(<SessionSidebar {...defaultProps} />)

      const refreshButton = screen.getByRole('button')
      expect(refreshButton).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('should show loading spinner when loading with no data', () => {
      renderWithProviders(<SessionSidebar {...defaultProps} isLoading={true} />)

      // The loading spinner should be visible (Loader2 component)
      expect(screen.queryByText('No sessions found')).not.toBeInTheDocument()
    })

    it('should disable refresh button when loading', () => {
      renderWithProviders(<SessionSidebar {...defaultProps} isLoading={true} />)

      const refreshButton = screen.getByRole('button')
      expect(refreshButton).toBeDisabled()
    })

    it('should show existing data while loading', () => {
      const projectGroups = [createMockProjectGroup()]

      renderWithProviders(
        <SessionSidebar {...defaultProps} projectGroups={projectGroups} isLoading={true} />
      )

      // Should still show the project
      expect(screen.getByText('project1')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show empty state message when no sessions', () => {
      renderWithProviders(<SessionSidebar {...defaultProps} projectGroups={[]} />)

      expect(screen.getByText('No sessions found')).toBeInTheDocument()
      expect(screen.getByText('Sessions appear after using Claude Code CLI')).toBeInTheDocument()
    })
  })

  describe('project groups', () => {
    it('should render project groups', () => {
      const projectGroups = [
        createMockProjectGroup({ project: '/Users/test/project1' }),
        createMockProjectGroup({
          project: '/Users/test/another-project',
          projectEncoded: '-Users-test-another-project',
        }),
      ]

      renderWithProviders(<SessionSidebar {...defaultProps} projectGroups={projectGroups} />)

      expect(screen.getByText('project1')).toBeInTheDocument()
      expect(screen.getByText('another-project')).toBeInTheDocument()
    })

    it('should collapse all projects by default', () => {
      const projectGroups = [
        createMockProjectGroup({
          project: '/Users/test/project1',
          sessions: [createMockSessionSummary({ firstMessage: 'First project message' })],
        }),
        createMockProjectGroup({
          project: '/Users/test/project2',
          projectEncoded: '-Users-test-project2',
          sessions: [
            createMockSessionSummary({ id: 'session-2', firstMessage: 'Second project message' }),
          ],
        }),
        createMockProjectGroup({
          project: '/Users/test/project3',
          projectEncoded: '-Users-test-project3',
          sessions: [
            createMockSessionSummary({ id: 'session-3', firstMessage: 'Third project message' }),
          ],
        }),
      ]

      renderWithProviders(<SessionSidebar {...defaultProps} projectGroups={projectGroups} />)

      // Projects should be collapsed by default, so session messages should not be visible
      expect(screen.queryByText(/First project message/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Second project message/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Third project message/)).not.toBeInTheDocument()

      // But project names should still be visible
      expect(screen.getByText('project1')).toBeInTheDocument()
      expect(screen.getByText('project2')).toBeInTheDocument()
      expect(screen.getByText('project3')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should call onRefresh when refresh button is clicked', () => {
      const onRefresh = vi.fn()
      renderWithProviders(<SessionSidebar {...defaultProps} onRefresh={onRefresh} />)

      const refreshButton = screen.getByRole('button')
      fireEvent.click(refreshButton)

      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('should call onSelectSession when a session is clicked', () => {
      const onSelectSession = vi.fn()
      const projectGroups = [
        createMockProjectGroup({
          sessions: [createMockSessionSummary({ id: 'session-1', firstMessage: 'Test message' })],
        }),
      ]

      renderWithProviders(
        <SessionSidebar
          {...defaultProps}
          projectGroups={projectGroups}
          onSelectSession={onSelectSession}
        />
      )

      // First expand the project group by clicking on it
      const projectButton = screen.getByText('project1')
      fireEvent.click(projectButton)

      // Click on the session
      const sessionButton = screen.getByText(/Test message/)
      fireEvent.click(sessionButton)

      expect(onSelectSession).toHaveBeenCalledWith('session-1', '-Users-test-project1')
    })
  })

  describe('session selection', () => {
    it('should highlight selected session', () => {
      const projectGroups = [
        createMockProjectGroup({
          sessions: [
            createMockSessionSummary({ id: 'session-1', firstMessage: 'First session' }),
            createMockSessionSummary({ id: 'session-2', firstMessage: 'Second session' }),
          ],
        }),
      ]

      renderWithProviders(
        <SessionSidebar
          {...defaultProps}
          projectGroups={projectGroups}
          selectedSessionId="session-1"
        />
      )

      // First expand the project group by clicking on it
      const projectButton = screen.getByText('project1')
      fireEvent.click(projectButton)

      // The selected session should have different styling (border-l-2 with border-l-zinc-500)
      const firstSession = screen.getByText(/First session/).closest('div.group')
      expect(firstSession?.className).toContain('border-l-2')
    })
  })
})
