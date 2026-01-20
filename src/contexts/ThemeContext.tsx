import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

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

  // Get initial native theme and listen for changes via Electron IPC
  useEffect(() => {
    // Get initial native theme
    window.electron.getNativeTheme().then((response) => {
      if (response.success && response.data) {
        setSystemTheme(response.data)
      }
      setIsInitialized(true)
    })

    // Listen for native theme changes from main process
    const unsubscribe = window.electron.onThemeChange((newTheme) => {
      setSystemTheme(newTheme)
    })

    return unsubscribe
  }, [])

  // Apply theme class to document
  useEffect(() => {
    if (!isInitialized) return

    const root = document.documentElement

    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    // Also set data attribute for potential CSS selectors
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
