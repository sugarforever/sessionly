import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { CommandPalette } from './CommandPalette'

interface PaletteContext {
  open: boolean
  setOpen: (v: boolean) => void
}
const Ctx = createContext<PaletteContext | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

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

  return (
    <Ctx.Provider value={{ open, setOpen }}>
      {children}
      <CommandPalette open={open} onClose={() => setOpen(false)} />
    </Ctx.Provider>
  )
}

export function useCommandPalette() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCommandPalette must be used within SearchProvider')
  return c
}
