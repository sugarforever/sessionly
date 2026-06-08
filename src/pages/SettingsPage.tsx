import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/types/api'
import type { HookStatus } from '@/types/session-types'
import type { BackendConfig, IndexStatus } from '@/types/search'
import { useNotificationContext } from '@/contexts/NotificationContext'

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${checked ? 'bg-foreground' : 'bg-muted-foreground/30'}`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-background transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export function SettingsPage() {
  const [hookStatus, setHookStatus] = useState<HookStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const testTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const { prefs, updatePrefs, sendTest } = useNotificationContext()

  const [backend, setBackend] = useState<BackendConfig>({
    provider: 'local',
    model: 'multilingual-e5-small',
  })
  const [apiKey, setApiKey] = useState('')
  const [idxStatus, setIdxStatus] = useState<IndexStatus | null>(null)

  const mb = (b: number) => `${Math.max(1, Math.round(b / 1_000_000))} MB`

  const refreshIdxStatus = useCallback(
    () =>
      api
        .searchIndexStatus()
        .then(setIdxStatus)
        .catch(() => {}),
    []
  )

  useEffect(() => {
    api
      .searchGetBackend()
      .then(setBackend)
      .catch(() => {})
    const id = window.setInterval(
      () =>
        api
          .searchIndexStatus()
          .then(setIdxStatus)
          .catch(() => {}),
      2000
    )
    return () => window.clearInterval(id)
  }, [])

  const saveBackend = async (provider: 'local' | 'openai') => {
    const cfg: BackendConfig =
      provider === 'openai'
        ? { provider, model: 'text-embedding-3-small', apiKey: apiKey || undefined }
        : { provider, model: 'multilingual-e5-small' }
    await api.searchSetBackend(cfg)
    setBackend({ provider: cfg.provider, model: cfg.model })
  }

  const refresh = useCallback(async () => {
    const status = await api.hooksGetStatus()
    setHookStatus(status)
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

  const handleTestNotification = async () => {
    clearTimeout(testTimerRef.current)
    setTestResult(null)
    await sendTest()
    setTestResult('Sent! Check Notification Center if you don\u2019t see it.')
    testTimerRef.current = setTimeout(() => setTestResult(null), 6000)
  }

  useEffect(() => () => clearTimeout(testTimerRef.current), [])

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-lg text-muted-foreground">Configure hooks, notifications, and search</p>
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
            {loading ? '...' : hookStatus?.hooksInstalled ? 'Uninstall Hooks' : 'Install Hooks'}
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="rounded-lg border p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Notifications</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Receive native notifications when Claude Code sessions need your attention.
            </p>
          </div>
          <Toggle
            checked={prefs.enabled}
            onChange={() => updatePrefs({ enabled: !prefs.enabled })}
          />
        </div>

        {/* Per-event toggles */}
        <div className="space-y-3 pl-1">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Session completed</span>
              <p className="text-xs text-muted-foreground">
                Claude Code finished and is waiting for input
              </p>
            </div>
            <Toggle
              checked={prefs.showOnComplete}
              onChange={() => updatePrefs({ showOnComplete: !prefs.showOnComplete })}
              disabled={!prefs.enabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Error occurred</span>
              <p className="text-xs text-muted-foreground">
                A tool error was detected in a session
              </p>
            </div>
            <Toggle
              checked={prefs.showOnError}
              onChange={() => updatePrefs({ showOnError: !prefs.showOnError })}
              disabled={!prefs.enabled}
            />
          </div>
        </div>

        {/* Test button */}
        <div className="flex items-center gap-3 pt-2 border-t">
          <button
            onClick={handleTestNotification}
            className="rounded border px-4 py-2 text-sm hover:bg-accent"
          >
            Send Test Notification
          </button>
          {testResult && <span className="text-sm text-muted-foreground">{testResult}</span>}
        </div>
      </div>

      {/* Search Section */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">Search</h2>
        <p className="text-sm text-muted-foreground">
          Choose how sessions are embedded for semantic search. Local runs on your machine (private,
          free).
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => saveBackend('local')}
            className={`rounded border px-4 py-2 text-sm ${backend.provider === 'local' ? 'bg-accent' : 'hover:bg-accent'}`}
          >
            Local · multilingual-e5-small
          </button>
          <button
            onClick={() => saveBackend('openai')}
            className={`rounded border px-4 py-2 text-sm ${backend.provider === 'openai' ? 'bg-accent' : 'hover:bg-accent'}`}
          >
            OpenAI · text-embedding-3-small
          </button>
        </div>
        {backend.provider === 'openai' && (
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={() => saveBackend('openai')}
            placeholder="OpenAI API key (stored in your OS keychain)"
            className="w-full rounded border bg-transparent px-3 py-2 text-sm outline-none"
          />
        )}
        {idxStatus === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !idxStatus.enabled ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Search is off. Semantic search runs locally and needs a one-time ~120MB model
              download.
            </p>
            <button
              onClick={async () => {
                await api.searchEnable()
                await refreshIdxStatus()
              }}
              className="rounded border px-3 py-1 text-xs hover:bg-accent"
            >
              Enable search & download
            </button>
          </div>
        ) : idxStatus.building ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              Indexing with {idxStatus.model}… {idxStatus.indexed}/{idxStatus.total}
            </span>
            <button
              onClick={async () => {
                await api.searchCancelBuild()
                await refreshIdxStatus()
              }}
              className="rounded border px-3 py-1 text-xs hover:bg-accent"
            >
              Stop
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Indexed {idxStatus.indexed} sessions</span>
            <button
              onClick={async () => {
                await api.searchReindex()
                await refreshIdxStatus()
              }}
              className="rounded border px-3 py-1 text-xs hover:bg-accent"
            >
              Rebuild index
            </button>
            {idxStatus.modelPresent && (
              <button
                onClick={async () => {
                  if (
                    !window.confirm(
                      'Remove the downloaded search model? You can re-download it anytime.'
                    )
                  )
                    return
                  await api.searchDeleteModel()
                  await refreshIdxStatus()
                }}
                className="rounded border px-3 py-1 text-xs hover:bg-accent"
              >
                Remove model ({mb(idxStatus.modelSizeBytes)})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
