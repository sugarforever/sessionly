import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, Search } from 'lucide-react'
import { useSearch } from './useSearch'
import { SearchResultList } from './SearchResultList'
import { useNavigation } from '@/contexts/NavigationContext'
import { useAppDispatch } from '@/store/hooks'
import { selectSession } from '@/store/slices/sessionsSlice'
import type { SearchHit } from '@/types/search'

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { query, results, loading, status, search } = useSearch()
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { navigateTo } = useNavigation()
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (open) {
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => setActive(0), [results])

  if (!open) return null

  const pick = (hit: SearchHit) => {
    dispatch(
      selectSession({
        sessionId: hit.sessionId,
        projectEncoded: hit.projectEncoded,
        messageUuid: hit.messageUuid,
      })
    )
    navigateTo('history')
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') return onClose()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    }
    if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      pick(results[active])
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Search sessions…"
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-1.5 scrollbar-thin">
          {status?.building && (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Indexing with {status.model}… {status.indexed}/{status.total}
            </div>
          )}
          {status && !status.enabled ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Search is off — enable it in Settings.
            </div>
          ) : !query.trim() ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              Type to search your sessions
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No matches</div>
          ) : (
            <SearchResultList results={results} query={query} activeIndex={active} onPick={pick} />
          )}
        </div>
        <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          ↑↓ navigate · ↵ open · esc close
        </div>
      </div>
    </div>,
    document.body
  )
}
