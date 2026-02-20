import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '@/types/api'
import { getCurrentWindow } from '@tauri-apps/api/window'

type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'app-theme'

function getStoredTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light')
  const [isInitialized, setIsInitialized] = useState(false)

  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  useEffect(() => {
    // Get initial theme from Tauri
    api.getNativeTheme().then((t) => {
      setSystemTheme(t as ResolvedTheme)
      setIsInitialized(true)
    }).catch(() => {
      setIsInitialized(true)
    })

    // Listen for theme changes via Tauri window
    let unlisten: (() => void) | null = null
    let cancelled = false
    getCurrentWindow().onThemeChanged(({ payload }) => {
      setSystemTheme(payload === 'dark' ? 'dark' : 'light')
    }).then((fn) => {
      if (cancelled) fn()
      else unlisten = fn
    })

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  useEffect(() => {
    if (!isInitialized) return
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
    root.setAttribute('data-theme', resolvedTheme)
  }, [resolvedTheme, isInitialized])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
