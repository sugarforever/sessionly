import { Home, History, Info, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavigationItem {
  id: string
  label: string
  icon: LucideIcon
  badge?: string | number
  disabled?: boolean
  divider?: boolean
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
  },
  {
    id: 'history',
    label: 'History',
    icon: History,
    divider: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
  {
    id: 'about',
    label: 'About',
    icon: Info,
  },
]

export type PageId = (typeof navigationItems)[number]['id']
