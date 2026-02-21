export interface SessionEvent {
  sessionId: string
  prevState: string
  state: string
  project: string
  timestamp: number
}

export interface ProjectState {
  project: string
  latestState: string
  events: SessionEvent[]
  lastActivity: number
  isStale: boolean
}
