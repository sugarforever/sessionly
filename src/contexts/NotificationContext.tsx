import { createContext, useContext, type ReactNode } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import type { NotificationPrefs } from '@/hooks/useNotifications'

interface NotificationContextType {
  prefs: NotificationPrefs
  updatePrefs: (partial: Partial<NotificationPrefs>) => void
  sendTest: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const value = useNotifications()
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider')
  return ctx
}
