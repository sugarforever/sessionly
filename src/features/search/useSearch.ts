import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/types/api'
import type { SearchHit, SearchFilters, IndexStatus } from '@/types/search'

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<IndexStatus | null>(null)
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

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await api.searchIndexStatus())
    } catch {
      // noop
    }
  }, [])

  useEffect(() => {
    refreshStatus()
    const id = window.setInterval(refreshStatus, 2000)
    return () => window.clearInterval(id)
  }, [refreshStatus])

  return { query, results, loading, status, search, run, refreshStatus }
}
