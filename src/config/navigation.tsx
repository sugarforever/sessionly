import { History, Info } from 'lucide-react'
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
    id: 'sessions',
    label: 'Sessions',
    icon: History,
  },
  {
    id: 'about',
    label: 'About',
    icon: Info,
  },
]

export type PageId = (typeof navigationItems)[number]['id']
