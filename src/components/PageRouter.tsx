import React from 'react'
import { useNavigation } from '@/contexts/NavigationContext'
import { HomePage } from '@/features/home/HomePage'
import { SessionsPage } from '@/features/sessions/SessionsPage'
import { AboutPage } from '@/pages/AboutPage'
import { SettingsPage } from '@/pages/SettingsPage'
import type { PageId } from '@/config/navigation'

const pageComponents: Record<PageId, () => React.JSX.Element> = {
  home: HomePage,
  history: SessionsPage,
  settings: SettingsPage,
  about: AboutPage,
}

export function PageRouter() {
  const { currentPage } = useNavigation()
  const PageComponent = pageComponents[currentPage]

  if (!PageComponent) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Page Not Found</h2>
          <p className="mt-2 text-muted-foreground">
            The page &quot;{currentPage}&quot; does not exist.
          </p>
        </div>
      </div>
    )
  }

  return <PageComponent />
}
