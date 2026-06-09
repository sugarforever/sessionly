import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { api } from '@/types/api'
import type { IndexStatus } from '@/types/search'

/**
 * A thin, app-wide strip that appears at the top of the content area only while
 * the search index is building, then auto-hides. Visible on every panel so the
 * background indexing job is never silent. Polls the same status command the
 * Search/Settings surfaces use.
 */
export function IndexingStatusBar() {
  const [status, setStatus] = useState<IndexStatus | null>(null)

  useEffect(() => {
    let active = true
    const tick = () =>
      api
        .searchIndexStatus()
        .then((s) => {
          if (active) setStatus(s)
        })
        .catch(() => {})
    tick()
    const id = window.setInterval(tick, 2000)
    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [])

  if (!status?.building || !status.enabled) return null

  const { indexed, total, model } = status
  const pct = total > 0 ? Math.min(100, Math.round((indexed / total) * 100)) : 0

  return (
    <div className="relative flex items-center gap-2 border-b border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
      <span className="truncate">
        Indexing sessions…{' '}
        <span className="text-foreground">
          {indexed}/{total}
        </span>
        <span className="hidden sm:inline"> · {model}</span>
      </span>
      <span
        className="absolute bottom-0 left-0 h-px bg-primary transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
