import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { CommandPalette } from './CommandPalette'
import { api } from '@/types/api'
import type { IndexStatus } from '@/types/search'

interface IndexStatusContext {
  status: IndexStatus | null
  /** Fetch the index status immediately (e.g. right after a mutating action). */
  refreshStatus: () => Promise<void>
}
const Ctx = createContext<IndexStatusContext | null>(null)

const POLL_BUILDING_MS = 1500
const POLL_IDLE_MS = 5000

/**
 * Owns the single app-wide poll of the search index status and the ⌘K command
 * palette. Every surface (status strip, Search page, palette, Settings) reads
 * status from here via `useIndexStatus`, so there is exactly one poller — it
 * runs fast while a build is in progress, slow when idle, and pauses while the
 * window is hidden.
 */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<IndexStatus | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await api.searchIndexStatus())
    } catch {
      // keep the last known status
    }
  }, [])

  // ⌘K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Single adaptive poller. The next delay is derived from the just-fetched
  // status (not a stale closure), so it speeds up/slows down on its own.
  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>

    const tick = async () => {
      let building = false
      if (!document.hidden) {
        try {
          const s = await api.searchIndexStatus()
          if (!active) return
          setStatus(s)
          building = s.building
        } catch {
          // keep the last known status
        }
      }
      if (!active) return
      timer = setTimeout(tick, building ? POLL_BUILDING_MS : POLL_IDLE_MS)
    }

    tick()

    // Refresh immediately when the window regains focus after being hidden.
    const onVisible = () => {
      if (!document.hidden && active) {
        clearTimeout(timer)
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      active = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return (
    <Ctx.Provider value={{ status, refreshStatus }}>
      {children}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </Ctx.Provider>
  )
}

export function useIndexStatus() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useIndexStatus must be used within SearchProvider')
  return c
}
