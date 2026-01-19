import { useNavigation } from '@/contexts/NavigationContext'
import { HomePage } from '@/pages/HomePage'
import { FeaturesPage } from '@/pages/FeaturesPage'
import { ChatPage } from '@/features/chat/ChatPage'
import { WeatherPage } from '@/pages/WeatherPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AboutPage } from '@/pages/AboutPage'
import type { PageId } from '@/config/navigation'

/**
 * Page Router
 *
 * Maps page IDs to their corresponding components.
 * When adding a new page:
 * 1. Import the page component
 * 2. Add it to the pageComponents map with the same ID from navigation config
 */
const pageComponents: Record<PageId, () => JSX.Element> = {
  home: HomePage,
  features: FeaturesPage,
  chat: ChatPage, // Can be removed if chat feature is not needed
  weather: WeatherPage,
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
