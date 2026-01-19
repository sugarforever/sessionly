import { useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { GitBranch, Clock, Folder, MessageSquare, TerminalSquare, Copy, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Session } from '@/../electron/shared/types'

interface SessionHeaderProps {
  session: Session
  showTerminal: boolean
  onToggleTerminal: () => void
}

export function SessionHeader({ session, showTerminal, onToggleTerminal }: SessionHeaderProps) {
  const [copied, setCopied] = useState(false)

  const resumeCommand = `claude --resume ${session.id}`

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(resumeCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      console.error('Failed to copy command')
    }
  }

  const formattedDate = useMemo(() => {
    if (!session.startTime) return null
    const date = new Date(session.startTime)
    return {
      full: format(date, 'PPp'),
      relative: formatDistanceToNow(date, { addSuffix: true }),
    }
  }, [session.startTime])

  const duration = useMemo(() => {
    if (!session.startTime || !session.endTime) return null
    const durationMs = session.endTime - session.startTime
    const minutes = Math.floor(durationMs / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    }
    return `${minutes}m`
  }, [session.startTime, session.endTime])

  return (
    <div className="shrink-0 border-b border-zinc-800/50 bg-[#0f0f0f] px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Project */}
          <div className="flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5 text-zinc-600" />
            <span
              className="font-mono text-xs text-zinc-400 truncate max-w-[250px]"
              title={session.project}
            >
              {session.project}
            </span>
          </div>

          <span className="text-zinc-800">|</span>

          {/* Branch */}
          {session.gitBranch && (
            <>
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-zinc-600" />
                <span className="text-xs text-zinc-500">{session.gitBranch}</span>
              </div>
              <span className="text-zinc-800">|</span>
            </>
          )}

          {/* Date */}
          {formattedDate && (
            <>
              <div className="flex items-center gap-1.5" title={formattedDate.full}>
                <Clock className="h-3.5 w-3.5 text-zinc-600" />
                <span className="text-xs text-zinc-500">{formattedDate.relative}</span>
                {duration && <span className="text-xs text-zinc-700">({duration})</span>}
              </div>
              <span className="text-zinc-800">|</span>
            </>
          )}

          {/* Message Count */}
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-zinc-600" />
            <span className="text-xs text-zinc-500">{session.messages.length}</span>
          </div>

          {/* Version */}
          {session.version && (
            <Badge
              variant="secondary"
              className="h-5 bg-zinc-900 px-1.5 font-mono text-[10px] text-zinc-500 hover:bg-zinc-900"
            >
              v{session.version}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCommand}
            className={`h-7 px-2.5 text-xs transition-colors ${
              copied
                ? 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900/50'
                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100'
            }`}
            title={`Copy: ${resumeCommand}`}
          >
            {copied ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy Resume Command
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTerminal}
            className={`h-7 px-2.5 text-xs ${
              showTerminal
                ? 'bg-zinc-800 text-zinc-200'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <TerminalSquare className="mr-1.5 h-3.5 w-3.5" />
            Terminal
          </Button>
        </div>
      </div>
    </div>
  )
}
