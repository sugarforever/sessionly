import { Home, Settings, Info, Code, Cloud, MessageSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  // Optional: for future extensibility
  badge?: string | number
  disabled?: boolean
  divider?: boolean // Show divider after this item
}

/**
 * Navigation Configuration
 *
 * Add or remove items here to control the sidebar navigation.
 * Each item must have a corresponding page in src/pages/
 *
 * To add a new page:
 * 1. Add item here with unique id
 * 2. Create page component in src/pages/{id}Page.tsx
 * 3. The navigation system will automatically handle routing
 */
export const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
  },
  {
    id: 'features',
    label: 'Features',
    icon: Code,
  },
  {
    id: 'chat',
    label: 'AI Chat',
    icon: MessageSquare,
    // Can be removed if chat feature is not needed
  },
  {
    id: 'weather',
    label: 'Weather',
    icon: Cloud,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    divider: true, // Adds visual separator
  },
  {
    id: 'about',
    label: 'About',
    icon: Info,
  },
]

// Export page IDs for type safety
export type PageId = (typeof navigationItems)[number]['id']
