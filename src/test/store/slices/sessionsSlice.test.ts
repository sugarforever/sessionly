import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import sessionsReducer, {
  selectSession,
  clearCurrentSession,
  clearError,
  fetchSessions,
  fetchSession,
  refreshSessions,
  hideProject,
  unhideProject,
  hideSession,
  unhideSession,
  toggleShowHidden,
  selectVisibleProjectGroups,
  selectHiddenCount,
} from '@/store/slices/sessionsSlice'
import type { ProjectGroup, Session } from '@/../electron/shared/types'
import type { RootState } from '@/store'

// Mock data
const mockProjectGroups: ProjectGroup[] = [
  {
    project: '/Users/test/project1',
    projectEncoded: '-Users-test-project1',
    sessions: [
      {
        id: 'session-1',
        project: '/Users/test/project1',
        projectEncoded: '-Users-test-project1',
        firstMessage: 'Hello, help me with this code',
        messageCount: 10,
        startTime: 1704067200000,
        endTime: 1704070800000,
        gitBranch: 'main',
        model: 'claude-3-opus',
        filePath: '/path/to/session-1.jsonl',
      },
      {
        id: 'session-2',
        project: '/Users/test/project1',
        projectEncoded: '-Users-test-project1',
        firstMessage: 'Fix the bug in auth',
        messageCount: 5,
        startTime: 1704153600000,
        endTime: 1704157200000,
        gitBranch: 'feature/auth',
        model: 'claude-3-sonnet',
        filePath: '/path/to/session-2.jsonl',
      },
    ],
  },
]

const mockSession: Session = {
  id: 'session-1',
  project: '/Users/test/project1',
  projectEncoded: '-Users-test-project1',
  gitBranch: 'main',
  cwd: '/Users/test/project1',
  version: '1.0.0',
  startTime: 1704067200000,
  endTime: 1704070800000,
  messages: [
    {
      uuid: 'msg-1',
      parentUuid: null,
      timestamp: '2024-01-01T00:00:00Z',
      role: 'user',
      textContent: 'Hello, help me with this code',
      thinkingBlocks: [],
      toolUseBlocks: [],
      toolResults: {},
    },
    {
      uuid: 'msg-2',
      parentUuid: 'msg-1',
      timestamp: '2024-01-01T00:01:00Z',
      role: 'assistant',
      textContent: 'I can help you with that!',
      thinkingBlocks: [],
      toolUseBlocks: [],
      toolResults: {},
      model: 'claude-3-opus',
    },
  ],
  filePath: '/path/to/session-1.jsonl',
  subagents: {},
}

describe('sessionsSlice', () => {
  const createTestStore = () =>
    configureStore({
      reducer: { sessions: sessionsReducer },
    })

  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    store = createTestStore()

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = store.getState().sessions
      expect(state.projectGroups).toEqual([])
      expect(state.currentSession).toBeNull()
      expect(state.selectedSessionId).toBeNull()
      expect(state.selectedProjectEncoded).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isLoadingSession).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('selectSession', () => {
    it('should set selected session ID and project', () => {
      store.dispatch(
        selectSession({ sessionId: 'session-1', projectEncoded: '-Users-test-project1' })
      )

      const state = store.getState().sessions
      expect(state.selectedSessionId).toBe('session-1')
      expect(state.selectedProjectEncoded).toBe('-Users-test-project1')
    })

    it('should clear selection when null is passed', () => {
      // First select a session
      store.dispatch(
        selectSession({ sessionId: 'session-1', projectEncoded: '-Users-test-project1' })
      )

      // Then clear it
      store.dispatch(selectSession(null))

      const state = store.getState().sessions
      expect(state.selectedSessionId).toBeNull()
      expect(state.selectedProjectEncoded).toBeNull()
      expect(state.currentSession).toBeNull()
    })
  })

  describe('clearCurrentSession', () => {
    it('should clear the current session', () => {
      // Manually set a current session via fetchSession.fulfilled
      store.dispatch({
        type: fetchSession.fulfilled.type,
        payload: mockSession,
      })

      expect(store.getState().sessions.currentSession).not.toBeNull()

      store.dispatch(clearCurrentSession())

      expect(store.getState().sessions.currentSession).toBeNull()
    })
  })

  describe('clearError', () => {
    it('should clear the error', () => {
      // Set an error state
      store.dispatch({
        type: fetchSessions.rejected.type,
        payload: 'Test error',
      })

      expect(store.getState().sessions.error).toBe('Test error')

      store.dispatch(clearError())

      expect(store.getState().sessions.error).toBeNull()
    })
  })

  describe('fetchSessions async thunk', () => {
    it('should set loading to true when pending', () => {
      store.dispatch({ type: fetchSessions.pending.type })

      const state = store.getState().sessions
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('should set projectGroups when fulfilled', () => {
      store.dispatch({
        type: fetchSessions.fulfilled.type,
        payload: mockProjectGroups,
      })

      const state = store.getState().sessions
      expect(state.isLoading).toBe(false)
      expect(state.projectGroups).toEqual(mockProjectGroups)
    })

    it('should set error when rejected', () => {
      store.dispatch({
        type: fetchSessions.rejected.type,
        payload: 'Failed to fetch sessions',
      })

      const state = store.getState().sessions
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Failed to fetch sessions')
    })

    it('should handle empty response', () => {
      store.dispatch({
        type: fetchSessions.fulfilled.type,
        payload: undefined,
      })

      const state = store.getState().sessions
      expect(state.projectGroups).toEqual([])
    })
  })

  describe('fetchSession async thunk', () => {
    it('should set isLoadingSession to true when pending', () => {
      store.dispatch({ type: fetchSession.pending.type })

      const state = store.getState().sessions
      expect(state.isLoadingSession).toBe(true)
      expect(state.error).toBeNull()
    })

    it('should set currentSession when fulfilled', () => {
      store.dispatch({
        type: fetchSession.fulfilled.type,
        payload: mockSession,
      })

      const state = store.getState().sessions
      expect(state.isLoadingSession).toBe(false)
      expect(state.currentSession).toEqual(mockSession)
    })

    it('should set error when rejected', () => {
      store.dispatch({
        type: fetchSession.rejected.type,
        payload: 'Session not found',
      })

      const state = store.getState().sessions
      expect(state.isLoadingSession).toBe(false)
      expect(state.error).toBe('Session not found')
    })

    it('should handle null response', () => {
      store.dispatch({
        type: fetchSession.fulfilled.type,
        payload: undefined,
      })

      const state = store.getState().sessions
      expect(state.currentSession).toBeNull()
    })
  })

  describe('refreshSessions async thunk', () => {
    it('should set loading to true when pending', () => {
      store.dispatch({ type: refreshSessions.pending.type })

      const state = store.getState().sessions
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('should set error when rejected', () => {
      store.dispatch({
        type: refreshSessions.rejected.type,
        payload: 'Failed to refresh',
      })

      const state = store.getState().sessions
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Failed to refresh')
    })
  })

  describe('integration scenarios', () => {
    it('should handle selecting different sessions', () => {
      // Select first session
      store.dispatch(
        selectSession({ sessionId: 'session-1', projectEncoded: '-Users-test-project1' })
      )
      expect(store.getState().sessions.selectedSessionId).toBe('session-1')

      // Select different session
      store.dispatch(
        selectSession({ sessionId: 'session-2', projectEncoded: '-Users-test-project1' })
      )
      expect(store.getState().sessions.selectedSessionId).toBe('session-2')
    })

    it('should maintain state consistency during loading', () => {
      // Set some initial data
      store.dispatch({
        type: fetchSessions.fulfilled.type,
        payload: mockProjectGroups,
      })

      // Start loading
      store.dispatch({ type: fetchSessions.pending.type })

      const state = store.getState().sessions
      // Data should still be there while loading
      expect(state.projectGroups).toEqual(mockProjectGroups)
      expect(state.isLoading).toBe(true)
    })

    it('should clear error on new fetch', () => {
      // Set error
      store.dispatch({
        type: fetchSessions.rejected.type,
        payload: 'Previous error',
      })

      // Start new fetch
      store.dispatch({ type: fetchSessions.pending.type })

      expect(store.getState().sessions.error).toBeNull()
    })
  })

  describe('hidden state actions', () => {
    let localStorageMock: { [key: string]: string }

    beforeEach(() => {
      localStorageMock = {}
      vi.useFakeTimers()
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
        localStorageMock[key] = value
      })
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
        (key) => localStorageMock[key] || null
      )
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    describe('hideProject', () => {
      it('should add project to hiddenProjects', () => {
        store.dispatch(hideProject('-Users-test-project1'))

        const state = store.getState().sessions
        expect(state.hiddenProjects).toContain('-Users-test-project1')
      })

      it('should persist to localStorage', () => {
        store.dispatch(hideProject('-Users-test-project1'))
        vi.advanceTimersByTime(500) // Wait for debounced persistence

        expect(localStorage.setItem).toHaveBeenCalledWith(
          'hiddenProjects',
          JSON.stringify(['-Users-test-project1'])
        )
      })

      it('should not duplicate project IDs', () => {
        store.dispatch(hideProject('-Users-test-project1'))
        store.dispatch(hideProject('-Users-test-project1'))

        const state = store.getState().sessions
        expect(state.hiddenProjects.filter((id) => id === '-Users-test-project1')).toHaveLength(1)
      })
    })

    describe('unhideProject', () => {
      it('should remove project from hiddenProjects', () => {
        store.dispatch(hideProject('-Users-test-project1'))
        store.dispatch(unhideProject('-Users-test-project1'))

        const state = store.getState().sessions
        expect(state.hiddenProjects).not.toContain('-Users-test-project1')
      })

      it('should persist to localStorage', () => {
        store.dispatch(hideProject('-Users-test-project1'))
        store.dispatch(unhideProject('-Users-test-project1'))
        vi.advanceTimersByTime(500) // Wait for debounced persistence

        expect(localStorage.setItem).toHaveBeenLastCalledWith('hiddenProjects', JSON.stringify([]))
      })
    })

    describe('hideSession', () => {
      it('should add session to hiddenSessions', () => {
        store.dispatch(hideSession('session-1'))

        const state = store.getState().sessions
        expect(state.hiddenSessions).toContain('session-1')
      })

      it('should persist to localStorage', () => {
        store.dispatch(hideSession('session-1'))
        vi.advanceTimersByTime(500) // Wait for debounced persistence

        expect(localStorage.setItem).toHaveBeenCalledWith(
          'hiddenSessions',
          JSON.stringify(['session-1'])
        )
      })

      it('should not duplicate session IDs', () => {
        store.dispatch(hideSession('session-1'))
        store.dispatch(hideSession('session-1'))

        const state = store.getState().sessions
        expect(state.hiddenSessions.filter((id) => id === 'session-1')).toHaveLength(1)
      })
    })

    describe('unhideSession', () => {
      it('should remove session from hiddenSessions', () => {
        store.dispatch(hideSession('session-1'))
        store.dispatch(unhideSession('session-1'))

        const state = store.getState().sessions
        expect(state.hiddenSessions).not.toContain('session-1')
      })

      it('should persist to localStorage', () => {
        store.dispatch(hideSession('session-1'))
        store.dispatch(unhideSession('session-1'))
        vi.advanceTimersByTime(500) // Wait for debounced persistence

        expect(localStorage.setItem).toHaveBeenLastCalledWith('hiddenSessions', JSON.stringify([]))
      })
    })

    describe('toggleShowHidden', () => {
      it('should toggle showHidden state', () => {
        expect(store.getState().sessions.showHidden).toBe(false)

        store.dispatch(toggleShowHidden())
        expect(store.getState().sessions.showHidden).toBe(true)

        store.dispatch(toggleShowHidden())
        expect(store.getState().sessions.showHidden).toBe(false)
      })

      it('should persist to localStorage', () => {
        store.dispatch(toggleShowHidden())
        vi.advanceTimersByTime(500) // Wait for debounced persistence

        expect(localStorage.setItem).toHaveBeenCalledWith('showHidden', 'true')
      })
    })
  })

  describe('selectors', () => {
    describe('selectVisibleProjectGroups', () => {
      it('should return all groups when showHidden is true', () => {
        // Set up state with project groups
        store.dispatch({
          type: fetchSessions.fulfilled.type,
          payload: mockProjectGroups,
        })
        store.dispatch(hideProject('-Users-test-project1'))
        store.dispatch(toggleShowHidden()) // showHidden = true

        const state = store.getState() as RootState
        const visible = selectVisibleProjectGroups(state)

        expect(visible).toHaveLength(1)
        expect(visible[0].projectEncoded).toBe('-Users-test-project1')
      })

      it('should filter out hidden projects when showHidden is false', () => {
        store.dispatch({
          type: fetchSessions.fulfilled.type,
          payload: mockProjectGroups,
        })
        store.dispatch(hideProject('-Users-test-project1'))

        const state = store.getState() as RootState
        const visible = selectVisibleProjectGroups(state)

        expect(visible).toHaveLength(0)
      })

      it('should filter out hidden sessions within visible projects', () => {
        store.dispatch({
          type: fetchSessions.fulfilled.type,
          payload: mockProjectGroups,
        })
        store.dispatch(hideSession('session-1'))

        const state = store.getState() as RootState
        const visible = selectVisibleProjectGroups(state)

        expect(visible).toHaveLength(1)
        expect(visible[0].sessions).toHaveLength(1)
        expect(visible[0].sessions[0].id).toBe('session-2')
      })

      it('should remove project groups with no visible sessions', () => {
        store.dispatch({
          type: fetchSessions.fulfilled.type,
          payload: mockProjectGroups,
        })
        // Hide all sessions in the group
        store.dispatch(hideSession('session-1'))
        store.dispatch(hideSession('session-2'))

        const state = store.getState() as RootState
        const visible = selectVisibleProjectGroups(state)

        expect(visible).toHaveLength(0)
      })
    })

    describe('selectHiddenCount', () => {
      it('should return count of hidden projects and sessions', () => {
        store.dispatch(hideProject('-Users-test-project1'))
        store.dispatch(hideProject('-Users-test-project2'))
        store.dispatch(hideSession('session-1'))

        const state = store.getState() as RootState
        const counts = selectHiddenCount(state)

        expect(counts.projects).toBe(2)
        expect(counts.sessions).toBe(1)
      })

      it('should return zero when nothing is hidden', () => {
        const state = store.getState() as RootState
        const counts = selectHiddenCount(state)

        expect(counts.projects).toBe(0)
        expect(counts.sessions).toBe(0)
      })
    })
  })
})
