import { useMemo } from 'react'
import { format } from 'date-fns'
import { MessageSquare, GitBranch } from 'lucide-react'
import type { SessionSummary } from '@/../electron/shared/types'

interface SessionItemProps {
  session: SessionSummary
  isSelected: boolean
  onSelect: () => void
}

export function SessionItem({ session, isSelected, onSelect }: SessionItemProps) {
  const formattedDate = useMemo(() => {
    if (!session.startTime) return null
    const date = new Date(session.startTime)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return format(date, 'HH:mm')
    } else if (diffDays < 7) {
      return format(date, 'EEE HH:mm')
    } else {
      return format(date, 'MMM d')
    }
  }, [session.startTime])

  const preview = session.firstMessage
    ? session.firstMessage.slice(0, 60).replace(/\n/g, ' ')
    : 'No messages'

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-2.5 py-2 rounded-md transition-colors duration-150 cursor-pointer ${
        isSelected
          ? 'bg-zinc-800/80 border-l-2 border-l-zinc-500 border-y border-r border-y-transparent border-r-transparent'
          : 'hover:bg-zinc-800/40 border-l-2 border-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={`text-xs truncate ${isSelected ? 'text-zinc-200' : 'text-zinc-400'}`}>
            {preview}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-zinc-600">
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
        {formattedDate && (
          <span className="text-[10px] text-zinc-700 shrink-0 tabular-nums">{formattedDate}</span>
        )}
      </div>
    </button>
  )
}
