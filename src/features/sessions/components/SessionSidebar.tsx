import { RefreshCw, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProjectGroup as ProjectGroupType } from '@/../electron/shared/types'
import { ProjectGroup } from './ProjectGroup'

interface SessionSidebarProps {
  projectGroups: ProjectGroupType[]
  selectedSessionId: string | null
  isLoading: boolean
  onSelectSession: (sessionId: string, projectEncoded: string) => void
  onRefresh: () => void
  // Hidden state props
  showHidden: boolean
  hiddenCount: { projects: number; sessions: number }
  onToggleShowHidden: () => void
  onHideProject: (projectEncoded: string) => void
  onUnhideProject: (projectEncoded: string) => void
  onHideSession: (sessionId: string) => void
  onUnhideSession: (sessionId: string) => void
  hiddenProjects: string[]
  hiddenSessions: string[]
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
}: SessionSidebarProps) {
  const totalSessions = projectGroups.reduce((sum, g) => sum + g.sessions.length, 0)
  const totalHidden = hiddenCount.projects + hiddenCount.sessions

  return (
    <div className="flex h-full flex-col border-r border-zinc-800/50 bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/50 px-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-100">Sessions</h2>
          <p className="text-xs text-zinc-500 truncate">
            {totalSessions} in {projectGroups.length} project{projectGroups.length !== 1 ? 's' : ''}
            {totalHidden > 0 && !showHidden && (
              <span className="ml-1 text-zinc-600">({totalHidden} hidden)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {totalHidden > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleShowHidden}
              className={`h-8 w-8 shrink-0 hover:bg-zinc-800/50 ${
                showHidden ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={showHidden ? 'Hide hidden items' : 'Show hidden items'}
            >
              {showHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 w-8 shrink-0 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Session List - Scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div className="p-2">
          {isLoading && projectGroups.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          ) : projectGroups.length === 0 ? (
            <div className="flex h-40 items-center justify-center px-4 text-center">
              <div>
                <p className="text-sm text-zinc-400">No sessions found</p>
                <p className="mt-1 text-xs text-zinc-600">
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
