import { useState } from 'react'
import { ChevronDown, ChevronRight, Folder, Eye, EyeOff } from 'lucide-react'
import type { ProjectGroup as ProjectGroupType } from '@/../electron/shared/types'
import { SessionItem } from './SessionItem'

interface ProjectGroupProps {
  group: ProjectGroupType
  selectedSessionId: string | null
  onSelectSession: (sessionId: string, projectEncoded: string) => void
  defaultExpanded?: boolean
  isHidden?: boolean
  onHide: (projectEncoded: string) => void
  onUnhide: (projectEncoded: string) => void
  onHideSession: (sessionId: string) => void
  onUnhideSession: (sessionId: string) => void
  hiddenSessions: string[]
}

export function ProjectGroup({
  group,
  selectedSessionId,
  onSelectSession,
  defaultExpanded = true,
  isHidden = false,
  onHide,
  onUnhide,
  onHideSession,
  onUnhideSession,
  hiddenSessions,
}: ProjectGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Get short project name (last folder)
  const shortName = group.project.split('/').pop() || group.project

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isHidden) {
      onUnhide(group.projectEncoded)
    } else {
      onHide(group.projectEncoded)
    }
  }

  return (
    <div className="mb-1">
      {/* Header */}
      <div
        className={`group flex w-full items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-all duration-150 ${
          isHidden ? 'opacity-50 border-l-2 border-l-amber-400/50' : ''
        }`}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 items-center gap-1.5 cursor-pointer min-w-0"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
          )}
          <Folder
            className={`h-3.5 w-3.5 shrink-0 ${isHidden ? 'text-amber-400/70' : 'text-muted-foreground/60'}`}
          />
          <span
            className="text-xs font-medium text-muted-foreground truncate"
            title={group.project}
          >
            {shortName}
          </span>
        </button>
        <button
          onClick={handleHideClick}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded shrink-0"
          title={isHidden ? 'Unhide project' : 'Hide project'}
        >
          {isHidden ? (
            <Eye className="h-3 w-3 text-amber-500" />
          ) : (
            <EyeOff className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        <span className="text-[10px] text-muted-foreground/50 tabular-nums shrink-0">
          {group.sessions.length}
        </span>
      </div>

      {/* Sessions */}
      {expanded && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
          {group.sessions.map((session) => (
            <SessionItem
              key={session.filePath}
              session={session}
              isSelected={selectedSessionId === session.id}
              onSelect={() => onSelectSession(session.id, group.projectEncoded)}
              isHidden={hiddenSessions.includes(session.id)}
              onHide={onHideSession}
              onUnhide={onUnhideSession}
            />
          ))}
        </div>
      )}
    </div>
  )
}
