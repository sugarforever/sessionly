import { RefreshCw, Loader2, Eye, EyeOff, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProjectGroup as ProjectGroupType, SearchResult } from '@/types/session-types'
import { ProjectGroup } from './ProjectGroup'
import { SearchResults } from './SearchResults'

interface SessionSidebarProps {
  projectGroups: ProjectGroupType[]
  selectedSessionId: string | null
  isLoading: boolean
  onSelectSession: (sessionId: string, projectEncoded: string) => void
  onRefresh: () => void
  showHidden: boolean
  hiddenCount: { projects: number; sessions: number }
  onToggleShowHidden: () => void
  onHideProject: (projectEncoded: string) => void
  onUnhideProject: (projectEncoded: string) => void
  onHideSession: (sessionId: string) => void
  onUnhideSession: (sessionId: string) => void
  hiddenProjects: string[]
  hiddenSessions: string[]
  searchQuery: string
  onSearchChange: (query: string) => void
  isSearching: boolean
  searchActive: boolean
  searchResults: SearchResult[]
  searchError: string | null
}

export function SessionSidebar({
  projectGroups,
  selectedSessionId,
  isLoading,
  onSelectSession,
  onRefresh,
  showHidden,
  hiddenCount,
  onToggleShowHidden,
  onHideProject,
  onUnhideProject,
  onHideSession,
  onUnhideSession,
  hiddenProjects,
  hiddenSessions,
  searchQuery,
  onSearchChange,
  isSearching,
  searchActive,
  searchResults,
  searchError,
}: SessionSidebarProps) {
  const totalSessions = projectGroups.reduce((sum, g) => sum + g.sessions.length, 0)
  const totalHidden = hiddenCount.projects + hiddenCount.sessions

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Sessions</h2>
          <p className="text-xs text-muted-foreground truncate">
            {totalSessions} in {projectGroups.length} project{projectGroups.length !== 1 ? 's' : ''}
            {totalHidden > 0 && !showHidden ? (
              <span className="ml-1 opacity-60">({totalHidden} hidden)</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {totalHidden > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleShowHidden}
              className={`h-8 w-8 shrink-0 hover:bg-accent ${
                showHidden
                  ? 'text-amber-500 hover:text-amber-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={showHidden ? 'Hide hidden items' : 'Show hidden items'}
            >
              {showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {isLoading && projectGroups.length > 0 ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search sessions…"
            spellCheck={false}
            className="h-8 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {searchQuery ? (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-2">
          {searchActive ? (
            <SearchResults
              results={searchResults}
              isSearching={isSearching}
              query={searchQuery}
              error={searchError}
              selectedSessionId={selectedSessionId}
              onSelectSession={onSelectSession}
            />
          ) : isLoading && projectGroups.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : projectGroups.length === 0 ? (
            <div className="flex h-40 items-center justify-center px-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">No sessions found</p>
                <p className="mt-1 text-xs text-muted-foreground opacity-60">
                  Sessions appear after using Claude Code CLI
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {projectGroups.map((group) => (
                <ProjectGroup
                  key={group.projectEncoded}
                  group={group}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={onSelectSession}
                  defaultExpanded={false}
                  isHidden={hiddenProjects.includes(group.projectEncoded)}
                  onHide={onHideProject}
                  onUnhide={onUnhideProject}
                  onHideSession={onHideSession}
                  onUnhideSession={onUnhideSession}
                  hiddenSessions={hiddenSessions}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
