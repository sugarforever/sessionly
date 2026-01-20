import { useState } from 'react'
import { Loader2, MessageSquareOff } from 'lucide-react'
import type { Session } from '@/../electron/shared/types'
import { SessionHeader } from './SessionHeader'
import { MessageList } from './MessageList'
import { TerminalPanel } from './Terminal/TerminalPanel'

interface SessionViewProps {
  session: Session | null
  isLoading: boolean
  error: string | null
}

export function SessionView({ session, isLoading, error }: SessionViewProps) {
  const [showTerminal, setShowTerminal] = useState(false)

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
      <SessionHeader
        session={session}
        showTerminal={showTerminal}
        onToggleTerminal={() => setShowTerminal(!showTerminal)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className={`flex-1 overflow-hidden ${showTerminal ? 'h-1/2' : 'h-full'}`}>
          <MessageList messages={session.messages} subagents={session.subagents} />
        </div>
        {showTerminal && (
          <div className="h-1/2 min-h-[200px]">
            <TerminalPanel
              cwd={session.cwd}
              sessionId={session.id}
              onClose={() => setShowTerminal(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
