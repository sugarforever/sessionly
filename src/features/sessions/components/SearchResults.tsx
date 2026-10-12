import type { ReactNode } from 'react'
import { format } from 'date-fns'
import { Loader2, SearchX, MessageSquare } from 'lucide-react'
import type { SearchResult } from '@/types/session-types'

interface SearchResultsProps {
  results: SearchResult[]
  isSearching: boolean
  query: string
  error: string | null
  selectedSessionId: string | null
  onSelectSession: (sessionId: string, projectEncoded: string) => void
}

/** Render the excerpt with every case-insensitive query hit wrapped in <mark>. */
function highlight(excerpt: string, query: string): ReactNode {
  const q = query.trim()
  if (!q) return excerpt
  const lowerExcerpt = excerpt.toLowerCase()
  const lowerQ = q.toLowerCase()
  const nodes: ReactNode[] = []
  let cursor = 0
  let key = 0
  for (;;) {
    const idx = lowerExcerpt.indexOf(lowerQ, cursor)
    if (idx === -1) break
    if (idx > cursor) nodes.push(excerpt.slice(cursor, idx))
    nodes.push(
      <mark key={key++} className="rounded-[2px] bg-yellow-500/30 px-px text-inherit">
        {excerpt.slice(idx, idx + q.length)}
      </mark>
    )
    cursor = idx + lowerQ.length
  }
  if (cursor < excerpt.length) nodes.push(excerpt.slice(cursor))
  return nodes
}

function shortProject(project: string): string {
  const parts = project.split('/').filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : project
}

export function SearchResults({
  results,
  isSearching,
  query,
  error,
  selectedSessionId,
  onSelectSession,
}: SearchResultsProps) {
  if (error) {
    return (
      <div className="flex h-40 items-center justify-center px-4 text-center">
        <p className="text-xs text-destructive">Search failed: {error}</p>
      </div>
    )
  }

  if (isSearching && results.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center px-4 text-center">
        <div>
          <SearchX className="mx-auto h-5 w-5 text-muted-foreground/60" />
          <p className="mt-2 text-sm text-muted-foreground">No matches for “{query.trim()}”</p>
          <p className="mt-1 text-xs text-muted-foreground opacity-60">
            Try message text, a tool name, or a file path
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <p className="px-2.5 pb-1 text-[11px] text-muted-foreground">
        {results.length} session{results.length !== 1 ? 's' : ''} matched
      </p>
      {results.map((result) => {
        const isSelected = selectedSessionId === result.id
        const preview = result.firstMessage
          ? result.firstMessage.slice(0, 80).replace(/\n/g, ' ')
          : 'No messages'
        const date = result.endTime ? format(new Date(result.endTime), 'MMM d') : null
        return (
          <div
            key={`${result.projectEncoded}:${result.id}`}
            onClick={() => onSelectSession(result.id, result.projectEncoded)}
            className={`w-full cursor-pointer rounded-md border-l-2 px-2.5 py-2 text-left transition-all duration-150 hover:bg-accent/50 ${
              isSelected ? 'border-l-primary bg-accent' : 'border-l-transparent'
            }`}
          >
            <p className="truncate text-xs text-foreground">{preview}</p>
            <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/60">
              <span className="truncate">{shortProject(result.project)}</span>
              <span className="flex shrink-0 items-center gap-0.5">
                <MessageSquare className="h-2.5 w-2.5" />
                {result.matchedMessageCount} match{result.matchedMessageCount !== 1 ? 'es' : ''}
              </span>
              {date && <span className="shrink-0 tabular-nums">{date}</span>}
            </div>
            <div className="mt-1.5 space-y-1">
              {result.snippets.slice(0, 2).map((snippet, i) => (
                <p
                  key={`${result.id}-snippet-${i}`}
                  className="text-[11px] leading-snug text-muted-foreground"
                >
                  <span className="mr-1 text-[9px] font-medium uppercase tracking-wide opacity-70">
                    {snippet.role}
                  </span>
                  {highlight(snippet.excerpt, query)}
                </p>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
