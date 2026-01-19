import { type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { useNavigation } from '@/contexts/NavigationContext'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { currentPage } = useNavigation()

  // Chat page needs full height without padding
  const isFullHeightPage = currentPage === 'chat'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className={isFullHeightPage ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto'}>
        {isFullHeightPage ? (
          children
        ) : (
          <div className="container mx-auto p-8">{children}</div>
        )}
      </main>
    </div>
  )
}
