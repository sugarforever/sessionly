import { useEffect, useRef, useCallback, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'
import { invoke } from '@tauri-apps/api/core'

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

async function ensurePermission(): Promise<boolean> {
  let granted = await isPermissionGranted()
  if (!granted) {
    const result = await requestPermission()
    granted = result === 'granted'
  }
  return granted
}

async function notify(title: string, body: string) {
  try {
    const granted = await ensurePermission()
    console.log('[notification] permission granted:', granted)
    if (granted) {
      sendNotification({ title, body })
      console.log('[notification] sent via plugin')
      return
    }
  } catch (err) {
    console.warn('[notification] plugin failed, using fallback:', err)
  }
  try {
    await invoke('send_native_notification', { title, body })
    console.log('[notification] sent via osascript fallback')
  } catch (e) {
    console.error('[notification] all methods failed:', e)
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
  // Cooldown per session to avoid rapid-fire duplicates (e.g. completed→working→completed)
  useEffect(() => {
    const cooldowns = new Map<string, number>()
    const COOLDOWN_MS = 5_000

    const unlisten = listen<SessionStateEvent>('session-state-changed', (event) => {
      const p = prefsRef.current
      if (!p.enabled) return

      const { session_id, state, project } = event.payload
      const now = Date.now()
      const key = `${session_id}:${state}`
      const lastFired = cooldowns.get(key) ?? 0

      if (now - lastFired < COOLDOWN_MS) return

      if (state === 'completed' && p.showOnComplete) {
        cooldowns.set(key, now)
        notify('Session Completed', project || 'Ready for input')
      } else if (state === 'error' && p.showOnError) {
        cooldowns.set(key, now)
        notify('Tool Error', project || 'Error in session')
      }
    })

    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  return { prefs, updatePrefs, sendTest }
}
