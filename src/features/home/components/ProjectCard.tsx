import { Fragment } from 'react'
import type { ProjectState, SessionEvent } from '@/types/session-monitor'
import { stateToColor, stateToTextColor, stateToLabel, relativeTime } from '../utils'
import { cn } from '@/lib/utils'
import { FolderOpen } from 'lucide-react'

interface ProjectCardProps {
  project: ProjectState
}

function collapseEvents(events: SessionEvent[]): { state: string; count: number; timestamp: number }[] {
  const groups: { state: string; count: number; timestamp: number }[] = []
  for (const e of events) {
    const last = groups[groups.length - 1]
    if (last && last.state === e.state) {
      last.count++
    } else {
      groups.push({ state: e.state, count: 1, timestamp: e.timestamp })
    }
  }
  return groups
}

export function ProjectCard({ project }: ProjectCardProps) {
  const pastEvents = project.events.slice(1, 8)
  const collapsed = collapseEvents(pastEvents)
  const hasTransitions = collapsed.length > 0 && !(collapsed.length === 1 && collapsed[0].state === project.latestState)
  const isWorking = project.latestState === 'working'

  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-4 transition-colors duration-200 hover:border-border/80 hover:bg-accent/30',
        project.isStale && 'opacity-50',
      )}
    >
      {/* Header: icon + project name */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
            <FolderOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {project.project}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  stateToColor(project.latestState),
                  isWorking && 'shadow-[0_0_6px_rgba(34,197,94,0.4)]',
                )}
              />
              <span className={cn('text-xs font-medium', stateToTextColor(project.latestState))}>
                {stateToLabel(project.latestState)}
              </span>
            </div>
          </div>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground pt-1">
          {relativeTime(project.lastActivity)}
        </span>
      </div>

      {/* Event trail */}
      {hasTransitions && (
        <div className="mt-3 flex flex-wrap items-center gap-1 pl-[42px]">
          {collapsed.slice(0, 4).map((group, i) => (
            <Fragment key={`${group.state}-${group.timestamp}`}>
              {i > 0 && (
                <span className="text-[10px] text-muted-foreground/30 select-none">›</span>
              )}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
                  'bg-muted text-muted-foreground',
                  i >= 3 && 'opacity-50',
                )}
              >
                <span className={cn('h-1 w-1 rounded-full', stateToColor(group.state))} />
                {stateToLabel(group.state)}
                {group.count > 1 && (
                  <span className="text-muted-foreground/60">×{group.count}</span>
                )}
              </span>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
