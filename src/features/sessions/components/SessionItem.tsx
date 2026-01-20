import { useMemo } from 'react'
import { format } from 'date-fns'
import { MessageSquare, GitBranch, Eye, EyeOff } from 'lucide-react'
import type { SessionSummary } from '@/../electron/shared/types'

interface SessionItemProps {
  session: SessionSummary
  isSelected: boolean
  onSelect: () => void
  isHidden?: boolean
  onHide: (sessionId: string) => void
  onUnhide: (sessionId: string) => void
}

export function SessionItem({
  session,
  isSelected,
  onSelect,
  isHidden = false,
  onHide,
  onUnhide,
}: SessionItemProps) {
  const formattedDate = useMemo(() => {
    if (!session.startTime) return null

    const date = new Date(session.startTime)
    const now = new Date()
    const msPerDay = 1000 * 60 * 60 * 24
    const daysSinceSession = Math.floor((now.getTime() - date.getTime()) / msPerDay)

    const isToday = daysSinceSession === 0
    const isWithinWeek = daysSinceSession < 7

    if (isToday) {
      return format(date, 'HH:mm')
    }
    if (isWithinWeek) {
      return format(date, 'EEE HH:mm')
    }
    return format(date, 'MMM d')
  }, [session.startTime])

  const preview = session.firstMessage
    ? session.firstMessage.slice(0, 60).replace(/\n/g, ' ')
    : 'No messages'

  const handleHideClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isHidden) {
      onUnhide(session.id)
    } else {
      onHide(session.id)
    }
  }

  return (
    <div
      className={`group w-full text-left px-2.5 py-2 rounded-md transition-all duration-150 cursor-pointer ${
        isSelected
          ? 'bg-accent border-l-2 border-l-primary border-y border-r border-y-transparent border-r-transparent'
          : isHidden
            ? 'hover:bg-accent/50 border-l-2 border-l-amber-400/50 opacity-50'
            : 'hover:bg-accent/50 border-l-2 border-transparent'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-xs truncate ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
            {preview}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground/60">
            {session.gitBranch && (
              <span className="flex items-center gap-0.5 truncate max-w-[80px]">
                <GitBranch className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{session.gitBranch}</span>
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <MessageSquare className="h-2.5 w-2.5" />
              {session.messageCount}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleHideClick}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-accent rounded"
            title={isHidden ? 'Unhide session' : 'Hide session'}
          >
            {isHidden ? (
              <Eye className="h-3 w-3 text-amber-500" />
            ) : (
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          {formattedDate && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums">{formattedDate}</span>
          )}
        </div>
      </div>
    </div>
  )
}
