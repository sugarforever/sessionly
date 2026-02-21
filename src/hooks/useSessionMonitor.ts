import { useEffect, useReducer, useRef } from 'react'
import { listen } from '@tauri-apps/api/event'
import type { SessionEvent, ProjectState } from '@/types/session-monitor'

const STALE_THRESHOLD = 60 * 60 * 1000 // 1 hour

interface SessionStateEvent {
  session_id: string
  prev_state: string
  state: string
  aggregate_state: string
  project: string | null
}

interface State {
  projects: ProjectState[]
}

type Action = { type: 'event'; event: SessionEvent } | { type: 'tick' }

function reducer(state: State, action: Action): State {
  if (action.type === 'tick') {
    const now = Date.now()
    return {
      projects: state.projects.map((p) => ({
        ...p,
        isStale: now - p.lastActivity > STALE_THRESHOLD,
      })),
    }
  }

  const { event } = action
  const existing = state.projects.find((p) => p.project === event.project)

  if (existing) {
    const updated: ProjectState = {
      ...existing,
      latestState: event.state,
      events: [event, ...existing.events].slice(0, 20),
      lastActivity: event.timestamp,
      isStale: false,
    }
    const projects = state.projects
      .map((p) => (p.project === event.project ? updated : p))
      .sort((a, b) => b.lastActivity - a.lastActivity)
    return { projects }
  }

  const newProject: ProjectState = {
    project: event.project,
    latestState: event.state,
    events: [event],
    lastActivity: event.timestamp,
    isStale: false,
  }
  return {
    projects: [newProject, ...state.projects],
  }
}

export function useSessionMonitor() {
  const [state, dispatch] = useReducer(reducer, { projects: [] })
  const activeSessionsRef = useRef(new Map<string, string>())

  useEffect(() => {
    const unlisten = listen<SessionStateEvent>('session-state-changed', (e) => {
      const { session_id, prev_state, state, project } = e.payload
      const projectName = project || 'Unknown Project'

      activeSessionsRef.current.set(session_id, state)

      dispatch({
        type: 'event',
        event: {
          sessionId: session_id,
          prevState: prev_state,
          state,
          project: projectName,
          timestamp: Date.now(),
        },
      })
    })

    const interval = setInterval(() => dispatch({ type: 'tick' }), 60_000)

    return () => {
      unlisten.then((fn) => fn())
      clearInterval(interval)
    }
  }, [])

  const aggregateActive = state.projects.filter(
    (p) => !p.isStale && p.latestState === 'working',
  ).length

  const aggregateQuiet = aggregateActive === 0

  return { projects: state.projects, aggregateActive, aggregateQuiet }
}
