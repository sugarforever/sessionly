import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { ProjectGroup } from '@/features/sessions/components/ProjectGroup'
import { renderWithProviders, createMockProjectGroup, createMockSessionSummary } from '../testUtils'

describe('ProjectGroup', () => {
  const defaultProps = {
    group: createMockProjectGroup(),
    selectedSessionId: null,
    onSelectSession: vi.fn(),
    defaultExpanded: true,
    isHidden: false,
    onHide: vi.fn(),
    onUnhide: vi.fn(),
    onHideSession: vi.fn(),
    onUnhideSession: vi.fn(),
    hiddenSessions: [] as string[],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render project name (short form)', () => {
      const group = createMockProjectGroup({ project: '/Users/test/my-awesome-project' })
      renderWithProviders(<ProjectGroup {...defaultProps} group={group} />)

      expect(screen.getByText('my-awesome-project')).toBeInTheDocument()
    })

    it('should show session count badge', () => {
      const group = createMockProjectGroup({
        sessions: [
          createMockSessionSummary({ id: 'session-1' }),
          createMockSessionSummary({ id: 'session-2' }),
          createMockSessionSummary({ id: 'session-3' }),
        ],
      })

      renderWithProviders(<ProjectGroup {...defaultProps} group={group} />)

      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should show folder icon', () => {
      renderWithProviders(<ProjectGroup {...defaultProps} />)

      // Folder icon should be present (we can check for the SVG element)
      const folderIcon = document.querySelector('svg.lucide-folder')
      expect(folderIcon).toBeInTheDocument()
    })
  })

  describe('expansion behavior', () => {
    it('should show sessions when expanded (defaultExpanded=true)', () => {
      const group = createMockProjectGroup({
        sessions: [createMockSessionSummary({ firstMessage: 'Test session message' })],
      })

      renderWithProviders(<ProjectGroup {...defaultProps} group={group} defaultExpanded={true} />)

      expect(screen.getByText(/Test session message/)).toBeInTheDocument()
    })

    it('should hide sessions when collapsed (defaultExpanded=false)', () => {
      const group = createMockProjectGroup({
        sessions: [createMockSessionSummary({ firstMessage: 'Test session message' })],
      })

      renderWithProviders(<ProjectGroup {...defaultProps} group={group} defaultExpanded={false} />)

      expect(screen.queryByText(/Test session message/)).not.toBeInTheDocument()
    })

    it('should toggle expansion when clicking header', () => {
      const group = createMockProjectGroup({
        project: '/Users/test/myproject',
        sessions: [createMockSessionSummary({ firstMessage: 'Visible when expanded' })],
      })

      renderWithProviders(<ProjectGroup {...defaultProps} group={group} defaultExpanded={true} />)

      // Session should be visible initially
      expect(screen.getByText(/Visible when expanded/)).toBeInTheDocument()

      // Click the project header to collapse
      const projectHeader = screen.getByText('myproject').closest('button')
      fireEvent.click(projectHeader!)

      // Session should now be hidden
      expect(screen.queryByText(/Visible when expanded/)).not.toBeInTheDocument()

      // Click again to expand
      fireEvent.click(projectHeader!)

      // Session should be visible again
      expect(screen.getByText(/Visible when expanded/)).toBeInTheDocument()
    })

    it('should show chevron-down icon when expanded', () => {
      renderWithProviders(<ProjectGroup {...defaultProps} defaultExpanded={true} />)

      const chevronDown = document.querySelector('svg.lucide-chevron-down')
      expect(chevronDown).toBeInTheDocument()
    })

    it('should show chevron-right icon when collapsed', () => {
      renderWithProviders(<ProjectGroup {...defaultProps} defaultExpanded={false} />)

      const chevronRight = document.querySelector('svg.lucide-chevron-right')
      expect(chevronRight).toBeInTheDocument()
    })
  })

  describe('session selection', () => {
    it('should call onSelectSession with correct parameters when session clicked', () => {
      const onSelectSession = vi.fn()
      const group = createMockProjectGroup({
        projectEncoded: '-Users-test-myproject',
        sessions: [createMockSessionSummary({ id: 'session-123', firstMessage: 'Click me' })],
      })

      renderWithProviders(
        <ProjectGroup {...defaultProps} group={group} onSelectSession={onSelectSession} />
      )

      const sessionButton = screen.getByText(/Click me/)
      fireEvent.click(sessionButton)

      expect(onSelectSession).toHaveBeenCalledWith('session-123', '-Users-test-myproject')
    })

    it('should highlight selected session', () => {
      const group = createMockProjectGroup({
        sessions: [
          createMockSessionSummary({ id: 'session-1', firstMessage: 'First' }),
          createMockSessionSummary({ id: 'session-2', firstMessage: 'Second' }),
        ],
      })

      renderWithProviders(
        <ProjectGroup {...defaultProps} group={group} selectedSessionId="session-2" />
      )

      // Second session should be selected (have border-l-2 class)
      const secondSession = screen.getByText(/Second/).closest('div.group')
      expect(secondSession?.className).toContain('border-l-2')

      // First session should not be selected
      const firstSession = screen.getByText(/First/).closest('div.group')
      expect(firstSession?.className).toContain('border-transparent')
    })
  })

  describe('multiple sessions', () => {
    it('should render all sessions in the group', () => {
      const group = createMockProjectGroup({
        sessions: [
          createMockSessionSummary({ id: '1', firstMessage: 'Session one' }),
          createMockSessionSummary({ id: '2', firstMessage: 'Session two' }),
          createMockSessionSummary({ id: '3', firstMessage: 'Session three' }),
        ],
      })

      renderWithProviders(<ProjectGroup {...defaultProps} group={group} />)

      expect(screen.getByText(/Session one/)).toBeInTheDocument()
      expect(screen.getByText(/Session two/)).toBeInTheDocument()
      expect(screen.getByText(/Session three/)).toBeInTheDocument()
    })
  })

  describe('project path handling', () => {
    it('should extract short name from full path', () => {
      const group = createMockProjectGroup({
        project: '/Users/username/Documents/Projects/my-project-name',
      })

      renderWithProviders(<ProjectGroup {...defaultProps} group={group} />)

      expect(screen.getByText('my-project-name')).toBeInTheDocument()
    })

    it('should show full path in title attribute', () => {
      const fullPath = '/Users/username/very/long/path/to/project'
      const group = createMockProjectGroup({ project: fullPath })

      renderWithProviders(<ProjectGroup {...defaultProps} group={group} />)

      const projectName = screen.getByText('project')
      expect(projectName).toHaveAttribute('title', fullPath)
    })
  })
})
