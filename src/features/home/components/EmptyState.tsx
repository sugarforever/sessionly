import { Terminal } from 'lucide-react'

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <Terminal className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">No active sessions</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a session to see it here
        </p>
      </div>
    </div>
  )
}
