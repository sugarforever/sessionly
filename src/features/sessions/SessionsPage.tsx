import { useSessions } from './hooks/useSessions'
import { SessionSidebar } from './components/SessionSidebar'
import { SessionView } from './components/SessionView'

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
  } = useSessions()

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sessions List - Independent scroll */}
      <div className="w-80 shrink-0 overflow-hidden">
        <SessionSidebar
          projectGroups={projectGroups}
          selectedSessionId={selectedSessionId}
          isLoading={isLoading}
          onSelectSession={selectSession}
          onRefresh={refresh}
        />
      </div>

      {/* Session Detail - Independent scroll */}
      <div className="flex-1 overflow-hidden">
        <SessionView session={currentSession} isLoading={isLoadingSession} error={error} />
      </div>
    </div>
  )
}
