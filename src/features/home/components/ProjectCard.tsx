import { Fragment } from 'react'
import type { ProjectState, SessionEvent } from '@/types/session-monitor'
import { stateToColor, stateToTextColor, stateToLabel, relativeTime } from '../utils'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  project: ProjectState
}

/** Collapse consecutive same-state events into groups */
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
  // Skip the first event (it's the current state shown in the header)
  const pastEvents = project.events.slice(1, 8)
  const collapsed = collapseEvents(pastEvents)
  // Only show timeline if there are actual state transitions
  const hasTransitions = collapsed.length > 0 && !(collapsed.length === 1 && collapsed[0].state === project.latestState)
  const isWorking = project.latestState === 'working'

  return (
    <div
      className={cn(
        'rounded-lg px-4 py-3 transition-colors duration-200 hover:bg-accent/50',
        project.isStale && 'opacity-40',
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'h-2 w-2 shrink-0 rounded-full transition-all duration-300',
            stateToColor(project.latestState),
            isWorking && 'shadow-[0_0_8px_rgba(34,197,94,0.5)]',
          )}
        />

        <span className="min-w-0 truncate text-[13px] font-semibold tracking-tight">
          {project.project}
        </span>

        <span className={cn('text-xs', stateToTextColor(project.latestState))}>
          {stateToLabel(project.latestState)}
        </span>

        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground/50">
          {relativeTime(project.lastActivity)}
        </span>
      </div>

      {/* Collapsed event trail — compact inline chips */}
      {hasTransitions && (
        <div className="mt-2 ml-[18px] flex flex-wrap items-center gap-1">
          {collapsed.slice(0, 4).map((group, i) => (
            <Fragment key={`${group.state}-${group.timestamp}`}>
              {i > 0 && (
                <span className="text-[10px] text-muted-foreground/25 select-none">›</span>
              )}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]',
                  'bg-muted/60 text-muted-foreground',
                  i >= 2 && 'opacity-50',
                )}
              >
                <span className={cn('h-1 w-1 rounded-full', stateToColor(group.state))} />
                {stateToLabel(group.state)}
                {group.count > 1 && (
                  <span className="text-muted-foreground/50">×{group.count}</span>
                )}
              </span>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
