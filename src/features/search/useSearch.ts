import { useCallback, useRef, useState } from 'react'
import { api } from '@/types/api'
import { useIndexStatus } from './SearchProvider'
import type { SearchHit, SearchFilters } from '@/types/search'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  // Index status comes from the single app-wide poller in SearchProvider.
  const { status } = useIndexStatus()
  const timer = useRef<number | undefined>(undefined)

  const run = useCallback(async (q: string, filters?: SearchFilters) => {
    if (!q.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      setResults(await api.searchQuery(q, filters, 40))
    } catch (e) {
      console.error('search failed:', e)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const search = useCallback(
    (q: string, filters?: SearchFilters) => {
      setQuery(q)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => run(q, filters), 150)
    },
    [run]
  )

  return { query, results, loading, status, search, run }
}
