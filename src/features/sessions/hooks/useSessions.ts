import { useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchSessions,
  fetchSession,
  selectSession,
  refreshSessions,
  hideProject,
  unhideProject,
  hideSession,
  unhideSession,
  toggleShowHidden,
  selectVisibleProjectGroups,
  selectHiddenCount,
} from '@/store/slices/sessionsSlice'

/**
 * Hook for managing session data
 */
export function useSessions() {
  const dispatch = useAppDispatch()
  const {
    currentSession,
    selectedSessionId,
    selectedProjectEncoded,
    isLoading,
    isLoadingSession,
    error,
    hiddenProjects,
    hiddenSessions,
    showHidden,
  } = useAppSelector((state) => state.sessions)

  // Use selector for visible project groups (respects hidden state)
  const visibleProjectGroups = useAppSelector(selectVisibleProjectGroups)
  const hiddenCount = useAppSelector(selectHiddenCount)

  // Load sessions on mount
  useEffect(() => {
    dispatch(fetchSessions())
  }, [dispatch])

  // Load session when selection changes
  useEffect(() => {
    if (selectedSessionId && selectedProjectEncoded) {
      dispatch(
        fetchSession({ sessionId: selectedSessionId, projectEncoded: selectedProjectEncoded })
      )
    }
  }, [dispatch, selectedSessionId, selectedProjectEncoded])

  const handleSelectSession = useCallback(
    (sessionId: string, projectEncoded: string) => {
      dispatch(selectSession({ sessionId, projectEncoded }))
    },
    [dispatch]
  )

  const handleClearSelection = useCallback(() => {
    dispatch(selectSession(null))
  }, [dispatch])

  const handleRefresh = useCallback(() => {
    dispatch(refreshSessions())
  }, [dispatch])

  // Hidden state handlers
  const handleHideProject = useCallback(
    (projectEncoded: string) => {
      dispatch(hideProject(projectEncoded))
    },
    [dispatch]
  )

  const handleUnhideProject = useCallback(
    (projectEncoded: string) => {
      dispatch(unhideProject(projectEncoded))
    },
    [dispatch]
  )

  const handleHideSession = useCallback(
    (sessionId: string) => {
      dispatch(hideSession(sessionId))
    },
    [dispatch]
  )

  const handleUnhideSession = useCallback(
    (sessionId: string) => {
      dispatch(unhideSession(sessionId))
    },
    [dispatch]
  )

  const handleToggleShowHidden = useCallback(() => {
    dispatch(toggleShowHidden())
  }, [dispatch])

  return {
    projectGroups: visibleProjectGroups,
    currentSession,
    selectedSessionId,
    selectedProjectEncoded,
    isLoading,
    isLoadingSession,
    error,
    selectSession: handleSelectSession,
    clearSelection: handleClearSelection,
    refresh: handleRefresh,
    // Hidden state
    showHidden,
    hiddenCount,
    hiddenProjects,
    hiddenSessions,
    hideProject: handleHideProject,
    unhideProject: handleUnhideProject,
    hideSession: handleHideSession,
    unhideSession: handleUnhideSession,
    toggleShowHidden: handleToggleShowHidden,
  }
}
