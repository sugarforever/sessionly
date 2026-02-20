import { useEffect, useRef, useCallback, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { api } from '@/types/api'

interface SessionStateEvent {
  session_id: string
  prev_state: string
  state: string
  aggregate_state: string
  project: string | null
}

export interface NotificationPrefs {
  enabled: boolean
  showOnComplete: boolean
  showOnError: boolean
}

const STORAGE_KEY = 'sessionly_notification_prefs'

const DEFAULT_PREFS: NotificationPrefs = {
  enabled: true,
  showOnComplete: true,
  showOnError: true,
}

function loadPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    // ignore
  }
  return DEFAULT_PREFS
}

function savePrefs(prefs: NotificationPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

async function notify(title: string, body: string) {
  try {
    await api.sendNativeNotification(title, body)
  } catch (e) {
    console.error('[notification] Failed:', e)
  }
}

export function useNotifications() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(loadPrefs)
  const prefsRef = useRef(prefs)

  useEffect(() => {
    prefsRef.current = prefs
    savePrefs(prefs)
  }, [prefs])

  const sendTest = useCallback(async () => {
    await notify('Sessionly Test', 'Notifications are working!')
  }, [])

  const updatePrefs = useCallback((partial: Partial<NotificationPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...partial }))
  }, [])

  // Listen for session state changes and fire notifications
  useEffect(() => {
    const unlisten = listen<SessionStateEvent>('session-state-changed', (event) => {
      const p = prefsRef.current
      if (!p.enabled) return

      const { prev_state, state, project } = event.payload
      const ctx = project ? ` \u2014 ${project}` : ''

      if (state === 'completed' && prev_state !== 'completed' && p.showOnComplete) {
        notify('Session Completed', project || 'Ready for input')
      } else if (state === 'error' && prev_state !== 'error' && p.showOnError) {
        notify('Tool Error', project || 'Error in session')
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  return { prefs, updatePrefs, sendTest }
}
