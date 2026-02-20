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

export function useSessions() {
  const dispatch = useAppDispatch()

  const currentSession = useAppSelector((state) => state.sessions.currentSession)
  const selectedSessionId = useAppSelector((state) => state.sessions.selectedSessionId)
  const selectedProjectEncoded = useAppSelector((state) => state.sessions.selectedProjectEncoded)
  const isLoading = useAppSelector((state) => state.sessions.isLoading)
  const isLoadingSession = useAppSelector((state) => state.sessions.isLoadingSession)
  const error = useAppSelector((state) => state.sessions.error)
  const showHidden = useAppSelector((state) => state.sessions.showHidden)
  const hiddenProjects = useAppSelector((state) => state.sessions.hiddenProjects)
  const hiddenSessions = useAppSelector((state) => state.sessions.hiddenSessions)
  const visibleProjectGroups = useAppSelector(selectVisibleProjectGroups)
  const hiddenCount = useAppSelector(selectHiddenCount)

  useEffect(() => {
    dispatch(fetchSessions())
  }, [dispatch])

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

  const handleRefresh = useCallback(() => {
    dispatch(refreshSessions())
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
    refresh: handleRefresh,
    showHidden,
    hiddenCount,
    hiddenProjects,
    hiddenSessions,
    hideProject: useCallback((p: string) => dispatch(hideProject(p)), [dispatch]),
    unhideProject: useCallback((p: string) => dispatch(unhideProject(p)), [dispatch]),
    hideSession: useCallback((s: string) => dispatch(hideSession(s)), [dispatch]),
    unhideSession: useCallback((s: string) => dispatch(unhideSession(s)), [dispatch]),
    toggleShowHidden: useCallback(() => dispatch(toggleShowHidden()), [dispatch]),
  }
}
