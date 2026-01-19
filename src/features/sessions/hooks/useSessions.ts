import { useEffect, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchSessions,
  fetchSession,
  selectSession,
  refreshSessions,
} from '@/store/slices/sessionsSlice'

/**
 * Hook for managing session data
 */
export function useSessions() {
  const dispatch = useAppDispatch()
  const {
    projectGroups,
    currentSession,
    selectedSessionId,
    selectedProjectEncoded,
    isLoading,
    isLoadingSession,
    error,
  } = useAppSelector((state) => state.sessions)

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

  return {
    projectGroups,
    currentSession,
    selectedSessionId,
    selectedProjectEncoded,
    isLoading,
    isLoadingSession,
    error,
    selectSession: handleSelectSession,
    clearSelection: handleClearSelection,
    refresh: handleRefresh,
  }
}
