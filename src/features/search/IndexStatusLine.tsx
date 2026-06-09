import { cn } from '@/lib/utils'
import type { IndexStatus } from '@/types/search'

/**
 * The one-line "Indexing with <model>… n/total" notice shared by the Search
 * page and the command palette. Renders nothing unless a build is in progress.
 */
export function IndexStatusLine({
  status,
  className,
}: {
  status: IndexStatus | null
  className?: string
}) {
  if (!status?.building || !status.enabled) return null
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      Indexing with {status.model}… {status.indexed}/{status.total}
    </p>
  )
}
