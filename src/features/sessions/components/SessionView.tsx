import { Loader2, MessageSquareOff } from 'lucide-react'
import type { Session } from '@/types/session-types'
import { SessionHeader } from './SessionHeader'
import { MessageList } from './MessageList'

interface SessionViewProps {
  session: Session | null
  isLoading: boolean
  error: string | null
}

export function SessionView({ session, isLoading, error }: SessionViewProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <MessageSquareOff className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-sm font-medium text-red-400">Failed to load session</p>
          <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
            <MessageSquareOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No Session Selected</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Select a session from the sidebar to view its contents
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <SessionHeader session={session} />
      <div className="flex-1 overflow-hidden">
        <MessageList messages={session.messages} subagents={session.subagents} />
      </div>
    </div>
  )
}
