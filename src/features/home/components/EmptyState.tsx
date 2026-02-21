import { Terminal } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Terminal className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-[13px] font-medium text-foreground/80">No active sessions</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Start a Claude Code session to see it here
        </p>
      </div>
    </div>
  )
}
