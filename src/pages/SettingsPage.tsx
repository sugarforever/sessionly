import { useEffect, useState, useCallback } from 'react'
import { api } from '@/types/api'
import type { HookStatus } from '@/types/session-types'

export function SettingsPage() {
  const [hookStatus, setHookStatus] = useState<HookStatus | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    const [status, enabled] = await Promise.all([
      api.hooksGetStatus(),
      api.notificationsGetEnabled(),
    ])
    setHookStatus(status)
    setNotificationsEnabled(enabled)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleInstallToggle = async () => {
    setLoading(true)
    try {
      if (hookStatus?.hooksInstalled) {
        await api.hooksUninstall()
      } else {
        await api.hooksInstall()
      }
      await refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleNotificationToggle = async () => {
    const newValue = !notificationsEnabled
    setNotificationsEnabled(newValue)
    await api.notificationsSetEnabled(newValue)
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-lg text-muted-foreground">Configure hooks and notifications</p>
      </div>

      {/* Hooks Section */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Hooks</h2>
        <p className="text-sm text-muted-foreground">
          Claude Code hooks enable real-time session state tracking via an HTTP server.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                hookStatus?.serverRunning ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm">
              Hook server: {hookStatus?.serverRunning ? 'Running' : 'Stopped'}
              {hookStatus?.serverRunning && ` on port ${hookStatus.port}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                hookStatus?.hooksInstalled ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
            <span className="text-sm">
              Hooks: {hookStatus?.hooksInstalled ? 'Installed' : 'Not installed'}
            </span>
          </div>
          <button
            onClick={handleInstallToggle}
            disabled={loading}
            className="rounded border px-4 py-2 text-sm hover:bg-accent disabled:opacity-50"
          >
            {loading
              ? '...'
              : hookStatus?.hooksInstalled
                ? 'Uninstall Hooks'
                : 'Install Hooks'}
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Receive native notifications when Claude Code sessions complete or encounter errors.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={handleNotificationToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              notificationsEnabled ? 'bg-foreground' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-background transition-transform ${
                notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm">
            {notificationsEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
    </div>
  )
}
