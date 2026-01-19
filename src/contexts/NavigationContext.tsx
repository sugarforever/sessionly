import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { PageId } from '@/config/navigation'

interface NavigationContextType {
  currentPage: PageId
  navigateTo: (pageId: PageId) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

interface NavigationProviderProps {
  children: ReactNode
  defaultPage?: PageId
}

export function NavigationProvider({ children, defaultPage = 'home' }: NavigationProviderProps) {
  const [currentPage, setCurrentPage] = useState<PageId>(defaultPage)

  const navigateTo = useCallback((pageId: PageId) => {
    setCurrentPage(pageId)
  }, [])

  return (
    <NavigationContext.Provider value={{ currentPage, navigateTo }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider')
  }
  return context
}
