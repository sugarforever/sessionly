import { createContext, useContext, type ReactNode } from 'react'
import { useSessionMonitor } from '@/hooks/useSessionMonitor'
import type { ProjectState } from '@/types/session-monitor'

interface SessionMonitorContextType {
  projects: ProjectState[]
  aggregateActive: number
  aggregateQuiet: boolean
}

const SessionMonitorContext = createContext<SessionMonitorContextType | null>(null)

export function SessionMonitorProvider({ children }: { children: ReactNode }) {
  const value = useSessionMonitor()
  return (
    <SessionMonitorContext.Provider value={value}>{children}</SessionMonitorContext.Provider>
  )
}

export function useSessionMonitorContext() {
  const ctx = useContext(SessionMonitorContext)
  if (!ctx)
    throw new Error('useSessionMonitorContext must be used within SessionMonitorProvider')
  return ctx
}
