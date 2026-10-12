import { useEffect, useRef, useState } from 'react'
import { useSessions } from './hooks/useSessions'
import { SessionSidebar } from './components/SessionSidebar'
import { SessionView } from './components/SessionView'
import { api } from '@/types/api'
import type { SearchResult } from '@/types/session-types'

export function SessionsPage() {
  const {
    projectGroups,
    currentSession,
    selectedSessionId,
    isLoading,
    isLoadingSession,
    error,
    selectSession,
    refresh,
    showHidden,
    hiddenCount,
    hiddenProjects,
    hiddenSessions,
    hideProject,
    unhideProject,
    hideSession,
    unhideSession,
    toggleShowHidden,
  } = useSessions()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const searchSeq = useRef(0)

  // Debounced full-text search against the Rust backend.
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q) {
      searchSeq.current += 1 // invalidate any in-flight request
      setSearchResults([])
      setSearchError(null)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const mySeq = ++searchSeq.current
    const timer = setTimeout(() => {
      api
        .sessionsSearch(q)
        .then((r) => {
          if (searchSeq.current !== mySeq) return
          setSearchResults(r)
          setSearchError(null)
        })
        .catch((e: unknown) => {
          if (searchSeq.current !== mySeq) return
          setSearchError(e instanceof Error ? e.message : String(e))
          setSearchResults([])
        })
        .finally(() => {
          if (searchSeq.current === mySeq) setIsSearching(false)
        })
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const searchActive = searchQuery.trim().length > 0

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="w-80 shrink-0 overflow-hidden">
        <SessionSidebar
          projectGroups={projectGroups}
          selectedSessionId={selectedSessionId}
          isLoading={isLoading}
          onSelectSession={selectSession}
          onRefresh={refresh}
          showHidden={showHidden}
          hiddenCount={hiddenCount}
          onToggleShowHidden={toggleShowHidden}
          onHideProject={hideProject}
          onUnhideProject={unhideProject}
          onHideSession={hideSession}
          onUnhideSession={unhideSession}
          hiddenProjects={hiddenProjects}
          hiddenSessions={hiddenSessions}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSearching={isSearching}
          searchActive={searchActive}
          searchResults={searchResults}
          searchError={searchError}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <SessionView session={currentSession} isLoading={isLoadingSession} error={error} />
      </div>
    </div>
  )
}
