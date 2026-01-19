import { useState } from 'react'
import { ChevronDown, ChevronRight, Folder } from 'lucide-react'
import type { ProjectGroup as ProjectGroupType } from '@/../electron/shared/types'
import { SessionItem } from './SessionItem'

interface ProjectGroupProps {
  group: ProjectGroupType
  selectedSessionId: string | null
  onSelectSession: (sessionId: string, projectEncoded: string) => void
  defaultExpanded?: boolean
}

export function ProjectGroup({
  group,
  selectedSessionId,
  onSelectSession,
  defaultExpanded = true,
}: ProjectGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  // Get short project name (last folder)
  const shortName = group.project.split('/').pop() || group.project

  return (
    <div className="mb-1">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-zinc-800/50 transition-colors duration-150 cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
        )}
        <Folder className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
        <span className="text-xs font-medium text-zinc-400 truncate" title={group.project}>
          {shortName}
        </span>
        <span className="ml-auto text-[10px] text-zinc-700 tabular-nums">
          {group.sessions.length}
        </span>
      </button>

      {/* Sessions */}
      {expanded && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-zinc-800/50 pl-2">
          {group.sessions.map((session) => (
            <SessionItem
              key={session.filePath}
              session={session}
              isSelected={selectedSessionId === session.id}
              onSelect={() => onSelectSession(session.id, group.projectEncoded)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
