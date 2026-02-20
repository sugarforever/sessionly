import { useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import {
  GitBranch,
  Clock,
  Folder,
  MessageSquare,
  Copy,
  Check,
  Download,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Session } from '@/types/session-types'
import { api } from '@/types/api'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

interface SessionHeaderProps {
  session: Session
}

export function SessionHeader({ session }: SessionHeaderProps) {
  const [copied, setCopied] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

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

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const markdown = await api.sessionsExportMarkdown(session.id, session.projectEncoded)
      const filePath = await save({
        title: 'Export Session as Markdown',
        defaultPath: `session_${session.id.slice(0, 8)}.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      })
      if (filePath) {
        await writeTextFile(filePath, markdown)
      }
    } catch (error) {
      console.error('Failed to export session:', error)
    } finally {
      setIsExporting(false)
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
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }, [session.startTime, session.endTime])

  return (
    <div className="shrink-0 border-b border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Folder className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="font-mono text-xs text-muted-foreground truncate max-w-[250px]" title={session.project}>
              {session.project}
            </span>
          </div>
          <span className="text-border">|</span>
          {session.gitBranch && (
            <>
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground">{session.gitBranch}</span>
              </div>
              <span className="text-border">|</span>
            </>
          )}
          {formattedDate && (
            <>
              <div className="flex items-center gap-1.5" title={formattedDate.full}>
                <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-xs text-muted-foreground">{formattedDate.relative}</span>
                {duration && <span className="text-xs text-muted-foreground/50">({duration})</span>}
              </div>
              <span className="text-border">|</span>
            </>
          )}
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground">{session.messages.length}</span>
          </div>
          {session.version && (
            <Badge variant="secondary" className="h-5 bg-secondary px-1.5 font-mono text-[10px] text-muted-foreground hover:bg-secondary">
              v{session.version}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyCommand}
            className={`h-7 px-2.5 text-xs transition-colors ${
              copied
                ? 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900/50'
                : 'bg-accent text-foreground hover:bg-accent/80'
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
            onClick={handleExport}
            disabled={isExporting}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
            title="Export session as Markdown"
          >
            {isExporting ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Export
          </Button>
        </div>
      </div>
    </div>
  )
}
