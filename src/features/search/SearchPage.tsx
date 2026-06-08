import { useState } from 'react'
import { Search as SearchIcon, Loader2 } from 'lucide-react'
import { useSearch } from './useSearch'
import { SearchResultList } from './SearchResultList'
import { useNavigation } from '@/contexts/NavigationContext'
import { useAppDispatch } from '@/store/hooks'
import { selectSession } from '@/store/slices/sessionsSlice'
import type { SearchHit } from '@/types/search'

export function SearchPage() {
  const { query, results, loading, status, search } = useSearch()
  const [input, setInput] = useState('')
  const { navigateTo } = useNavigation()
  const dispatch = useAppDispatch()

  const pick = (hit: SearchHit) => {
    dispatch(
      selectSession({
        sessionId: hit.sessionId,
        projectEncoded: hit.projectEncoded,
        messageUuid: hit.messageUuid,
      })
    )
    navigateTo('history')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Search</h1>
        <p className="text-lg text-muted-foreground">Search across all your sessions</p>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-border px-3">
        <SearchIcon className="h-4 w-4 text-muted-foreground" />
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            search(e.target.value)
          }}
          placeholder="Search sessions…"
          className="h-11 w-full bg-transparent text-sm outline-none"
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {status?.building && status.enabled && (
        <p className="text-xs text-muted-foreground">
          Indexing with {status.model}… {status.indexed}/{status.total}
        </p>
      )}
      {status && !status.enabled ? (
        <p className="text-sm text-muted-foreground">Search is off — enable it in Settings.</p>
      ) : (
        <>
          {query.trim() && !loading && (
            <p className="text-xs text-muted-foreground">
              {results.length} result{results.length !== 1 ? 's' : ''}
            </p>
          )}
          <SearchResultList results={results} query={query} onPick={pick} variant="card" />
        </>
      )}
    </div>
  )
}
