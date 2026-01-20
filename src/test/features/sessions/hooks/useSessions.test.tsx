import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useSessions } from '@/features/sessions/hooks/useSessions'
import sessionsReducer from '@/store/slices/sessionsSlice'
import type { ReactNode } from 'react'
import { createMockProjectGroup, createMockSession } from '../testUtils'

// Mock the electron API
const mockSessionsGetAll = vi.fn()
const mockSessionsGet = vi.fn()
const mockSessionsRefresh = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  // Setup default mock responses
  mockSessionsGetAll.mockResolvedValue({
    success: true,
    data: [],
  })
  mockSessionsGet.mockResolvedValue({
    success: true,
    data: createMockSession(),
  })
  mockSessionsRefresh.mockResolvedValue({
    success: true,
    data: undefined,
  })

  // Setup window.electron mock
  global.window.electron = {
    ...global.window.electron,
    sessionsGetAll: mockSessionsGetAll,
    sessionsGet: mockSessionsGet,
    sessionsRefresh: mockSessionsRefresh,
  } as typeof window.electron
})

function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      sessions: sessionsReducer,
    },
    preloadedState: {
      sessions: {
        projectGroups: [],
        currentSession: null,
        selectedSessionId: null,
        selectedProjectEncoded: null,
        isLoading: false,
        isLoadingSession: false,
        error: null,
        hiddenProjects: [],
        hiddenSessions: [],
        showHidden: false,
        ...preloadedState,
      },
    },
  })
}

function createWrapper(store: ReturnType<typeof createTestStore>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }
}

describe('useSessions', () => {
  describe('initialization', () => {
    it('should fetch sessions on mount', async () => {
      const store = createTestStore()

      renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      await waitFor(() => {
        expect(mockSessionsGetAll).toHaveBeenCalledTimes(1)
      })
    })

    it('should return state values', async () => {
      const store = createTestStore()

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // These are the default values after fetchSessions completes
      expect(result.current.projectGroups).toEqual([])
      expect(result.current.currentSession).toBeNull()
      expect(result.current.selectedSessionId).toBeNull()
      expect(result.current.selectedProjectEncoded).toBeNull()
      expect(result.current.isLoadingSession).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('state values', () => {
    it('should return projectGroups from state', async () => {
      const projectGroups = [
        createMockProjectGroup({ project: '/test/project1' }),
        createMockProjectGroup({ project: '/test/project2' }),
      ]
      // Mock the API to return the same project groups
      mockSessionsGetAll.mockResolvedValue({
        success: true,
        data: projectGroups,
      })
      const store = createTestStore({ projectGroups })

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockSessionsGetAll).toHaveBeenCalled()
      })

      expect(result.current.projectGroups).toEqual(projectGroups)
    })

    it('should return currentSession from state', async () => {
      const currentSession = createMockSession()
      const store = createTestStore({ currentSession })

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockSessionsGetAll).toHaveBeenCalled()
      })

      expect(result.current.currentSession).toEqual(currentSession)
    })

    it('should return loading states', async () => {
      const store = createTestStore({
        isLoading: true,
        isLoadingSession: true,
      })

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Check initial loading state synchronously (before async updates)
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isLoadingSession).toBe(true)

      // Wait for any pending updates
      await waitFor(() => {
        expect(mockSessionsGetAll).toHaveBeenCalled()
      })
    })

    it('should return error from state after failed fetch', async () => {
      mockSessionsGetAll.mockResolvedValue({
        success: false,
        error: 'Test error message',
      })

      const store = createTestStore()

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for the error to be set from the failed fetch
      await waitFor(() => {
        expect(result.current.error).toBe('Test error message')
      })
    })

    it('should return selected session info', async () => {
      const store = createTestStore({
        selectedSessionId: 'session-123',
        selectedProjectEncoded: '-test-project',
      })

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for initial fetch and session fetch to complete
      await waitFor(() => {
        expect(mockSessionsGet).toHaveBeenCalled()
      })

      expect(result.current.selectedSessionId).toBe('session-123')
      expect(result.current.selectedProjectEncoded).toBe('-test-project')
    })
  })

  describe('selectSession', () => {
    it('should dispatch selectSession action', async () => {
      const store = createTestStore()

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockSessionsGetAll).toHaveBeenCalled()
      })

      act(() => {
        result.current.selectSession('session-456', '-project-encoded')
      })

      // Wait for the triggered fetchSession to complete
      await waitFor(() => {
        expect(mockSessionsGet).toHaveBeenCalledWith('session-456', '-project-encoded')
      })

      expect(store.getState().sessions.selectedSessionId).toBe('session-456')
      expect(store.getState().sessions.selectedProjectEncoded).toBe('-project-encoded')
    })

    it('should trigger fetchSession when selection changes', async () => {
      const store = createTestStore()

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      act(() => {
        result.current.selectSession('session-789', '-another-project')
      })

      await waitFor(() => {
        expect(mockSessionsGet).toHaveBeenCalledWith('session-789', '-another-project')
      })
    })
  })

  describe('clearSelection', () => {
    it('should clear the selection', async () => {
      const store = createTestStore({
        selectedSessionId: 'session-123',
        selectedProjectEncoded: '-test-project',
      })

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockSessionsGet).toHaveBeenCalled()
      })

      act(() => {
        result.current.clearSelection()
      })

      expect(store.getState().sessions.selectedSessionId).toBeNull()
      expect(store.getState().sessions.selectedProjectEncoded).toBeNull()
    })
  })

  describe('refresh', () => {
    it('should dispatch refreshSessions action', async () => {
      const store = createTestStore()

      const { result } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      act(() => {
        result.current.refresh()
      })

      await waitFor(() => {
        expect(mockSessionsRefresh).toHaveBeenCalled()
        expect(mockSessionsGetAll).toHaveBeenCalledTimes(2) // Once on mount, once on refresh
      })
    })
  })

  describe('automatic session fetching', () => {
    it('should not fetch session if no selection', async () => {
      const store = createTestStore({
        selectedSessionId: null,
        selectedProjectEncoded: null,
      })

      renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockSessionsGetAll).toHaveBeenCalled()
      })

      expect(mockSessionsGet).not.toHaveBeenCalled()
    })

    it('should not fetch session if only sessionId is set', async () => {
      const store = createTestStore({
        selectedSessionId: 'session-123',
        selectedProjectEncoded: null,
      })

      renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockSessionsGetAll).toHaveBeenCalled()
      })

      expect(mockSessionsGet).not.toHaveBeenCalled()
    })

    it('should not fetch session if only projectEncoded is set', async () => {
      const store = createTestStore({
        selectedSessionId: null,
        selectedProjectEncoded: '-test-project',
      })

      renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockSessionsGetAll).toHaveBeenCalled()
      })

      expect(mockSessionsGet).not.toHaveBeenCalled()
    })

    it('should fetch session when both sessionId and projectEncoded are set', async () => {
      const store = createTestStore({
        selectedSessionId: 'session-123',
        selectedProjectEncoded: '-test-project',
      })

      renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      await waitFor(() => {
        expect(mockSessionsGet).toHaveBeenCalledWith('session-123', '-test-project')
      })
    })
  })

  describe('returned functions are memoized', () => {
    it('should return stable function references', async () => {
      const store = createTestStore()

      const { result, rerender } = renderHook(() => useSessions(), {
        wrapper: createWrapper(store),
      })

      // Wait for initial fetch to complete
      await waitFor(() => {
        expect(mockSessionsGetAll).toHaveBeenCalled()
      })

      const firstSelectSession = result.current.selectSession
      const firstClearSelection = result.current.clearSelection
      const firstRefresh = result.current.refresh
      const firstHideProject = result.current.hideProject
      const firstUnhideProject = result.current.unhideProject
      const firstHideSession = result.current.hideSession
      const firstUnhideSession = result.current.unhideSession
      const firstToggleShowHidden = result.current.toggleShowHidden

      rerender()

      expect(result.current.selectSession).toBe(firstSelectSession)
      expect(result.current.clearSelection).toBe(firstClearSelection)
      expect(result.current.refresh).toBe(firstRefresh)
      expect(result.current.hideProject).toBe(firstHideProject)
      expect(result.current.unhideProject).toBe(firstUnhideProject)
      expect(result.current.hideSession).toBe(firstHideSession)
      expect(result.current.unhideSession).toBe(firstUnhideSession)
      expect(result.current.toggleShowHidden).toBe(firstToggleShowHidden)
    })
  })
})
