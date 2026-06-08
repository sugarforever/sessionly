import type { SearchHit } from '@/types/search'

function highlight(snippet: string, query: string) {
  const term = query.trim().split(/\s+/)[0]
  if (!term) return snippet
  const i = snippet.toLowerCase().indexOf(term.toLowerCase())
  if (i < 0) return snippet
  return (
    <>
      {snippet.slice(0, i)}
      <mark className="bg-amber-500/30 text-foreground rounded px-0.5">
        {snippet.slice(i, i + term.length)}
      </mark>
      {snippet.slice(i + term.length)}
    </>
  )
}

interface Props {
  results: SearchHit[]
  query: string
  activeIndex?: number
  onPick: (hit: SearchHit) => void
  variant?: 'row' | 'card'
}

export function SearchResultList({ results, query, activeIndex, onPick, variant = 'row' }: Props) {
  return (
    <div className={variant === 'card' ? 'space-y-2' : ''}>
      {results.map((hit, i) => (
        <button
          key={`${hit.sessionId}:${hit.messageUuid}:${i}`}
          data-result-index={i}
          onClick={() => onPick(hit)}
          className={`block w-full text-left rounded-md px-3 py-2 transition-colors ${
            i === activeIndex ? 'bg-accent' : 'hover:bg-accent/60'
          } ${variant === 'card' ? 'border border-border' : ''}`}
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground truncate max-w-[40%]">
              {hit.sessionTitle || 'Untitled'}
            </span>
            <span>·</span>
            <span className="truncate">{hit.project}</span>
            <span>·</span>
            <span>{hit.role}</span>
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
            {highlight(hit.snippet, query)}
          </div>
        </button>
      ))}
    </div>
  )
}
