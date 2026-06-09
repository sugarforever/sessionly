import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@/types/api'
import type { HookStatus } from '@/types/session-types'
import type { BackendConfig, IndexStatus } from '@/types/search'
import { useNotificationContext } from '@/contexts/NotificationContext'

/*
 * This panel adopts the Linear design system (Open Design binding in
 * .open-design.json). It is a self-contained dark surface — near-black
 * canvas, translucent white borders, indigo accent, Inter 510 — and is
 * intentionally distinct from the rest of the app's black & white theme.
 */

// Linear tokens (kept local — this surface does not follow the app theme)
const PAGE_BG = '#08090a'
const TEXT = '#f7f8f8' // primary
const TEXT_2 = '#d0d6e0' // secondary
const MUTED = '#8a8f98' // tertiary
const SUBTLE = '#62666d' // quaternary
const VIOLET = '#7170ff'

const card = 'rounded-xl border border-white/[0.08] bg-white/[0.02] p-6'
const btn =
  'rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[13px] text-[#e2e4e7] transition-colors hover:bg-white/[0.07] disabled:opacity-40 disabled:cursor-not-allowed'
const btnPrimary =
  'rounded-md bg-[#5e6ad2] px-3.5 py-1.5 text-[13px] text-white transition-colors hover:bg-[#828fff] disabled:opacity-40'

function Overline({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#62666d]">
      {children}
    </div>
  )
}

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
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        disabled ? 'cursor-not-allowed opacity-40' : ''
      } ${checked ? 'bg-[#5e6ad2]' : 'bg-white/[0.14]'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-[#f7f8f8] transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </button>
  )
}

function StatusDot({ color }: { color: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
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
    hasKey: false,
  })
  const [apiKey, setApiKey] = useState('')
  const [keySaved, setKeySaved] = useState(false)
  const keySavedTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [idxStatus, setIdxStatus] = useState<IndexStatus | null>(null)
  const [projects, setProjects] = useState<{ project: string; projectEncoded: string }[]>([])
  const [scope, setScope] = useState<string[] | null>(null) // null = all

  const mb = (b: number) => `${Math.max(1, Math.round(b / 1_000_000))} MB`

  const refreshIdxStatus = useCallback(
    () =>
      api
        .searchIndexStatus()
        .then(setIdxStatus)
        .catch(() => {}),
    []
  )

  const reloadBackend = useCallback(
    () =>
      api
        .searchGetBackend()
        .then(setBackend)
        .catch(() => {}),
    []
  )

  useEffect(() => {
    reloadBackend()
    refreshIdxStatus()
    const id = window.setInterval(refreshIdxStatus, 2000)
    return () => window.clearInterval(id)
  }, [refreshIdxStatus, reloadBackend])

  useEffect(() => {
    api
      .sessionsGetAll()
      .then((groups) =>
        setProjects(groups.map((g) => ({ project: g.project, projectEncoded: g.projectEncoded })))
      )
      .catch(() => {})
    api
      .searchGetScope()
      .then(setScope)
      .catch(() => {})
  }, [])

  const toggleProject = async (encoded: string) => {
    const allEncoded = projects.map((p) => p.projectEncoded)
    const current = scope === null ? allEncoded : scope
    const nextSet = current.includes(encoded)
      ? current.filter((e) => e !== encoded)
      : [...current, encoded]
    // if everything is selected, store null (= all) instead of an explicit full list
    const next = nextSet.length === allEncoded.length ? null : nextSet
    setScope(next)
    await api.searchSetScope(next)
    refreshIdxStatus()
  }

  const saveBackend = async (provider: 'local' | 'openai') => {
    const cfg: BackendConfig =
      provider === 'openai'
        ? { provider, model: 'text-embedding-3-small', apiKey: apiKey || undefined, hasKey: false }
        : { provider, model: 'multilingual-e5-small', hasKey: false }
    await api.searchSetBackend(cfg)
    await reloadBackend()
    refreshIdxStatus()
  }

  const saveApiKey = async () => {
    if (!apiKey.trim()) return
    await saveBackend('openai')
    setApiKey('')
    setKeySaved(true)
    clearTimeout(keySavedTimer.current)
    keySavedTimer.current = setTimeout(() => setKeySaved(false), 4000)
  }

  const deleteApiKey = async () => {
    if (
      !window.confirm(
        'Delete the stored OpenAI API key? Search will switch back to the local model.'
      )
    )
      return
    await api.searchDeleteApiKey()
    setApiKey('')
    setKeySaved(false)
    await reloadBackend()
    refreshIdxStatus()
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
    setTestResult('Sent! Check Notification Center if you don’t see it.')
    testTimerRef.current = setTimeout(() => setTestResult(null), 6000)
  }

  useEffect(
    () => () => {
      clearTimeout(testTimerRef.current)
      clearTimeout(keySavedTimer.current)
    },
    []
  )

  const backendPill = (provider: 'local' | 'openai', label: string, sub: string) => (
    <button
      onClick={() => saveBackend(provider)}
      className={`flex-1 rounded-md border px-3 py-2 text-left transition-colors ${
        backend.provider === provider
          ? 'border-[#5e6ad2]/70 bg-[#5e6ad2]/[0.14]'
          : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]'
      }`}
    >
      <div className="text-[13px]" style={{ color: backend.provider === provider ? TEXT : TEXT_2 }}>
        {label}
      </div>
      <div className="text-[11px]" style={{ color: SUBTLE }}>
        {sub}
      </div>
    </button>
  )

  return (
    <div
      className="h-full overflow-y-auto scrollbar-thin"
      style={{ backgroundColor: PAGE_BG, fontFeatureSettings: '"cv01", "ss03"' }}
    >
      <div className="mx-auto max-w-3xl space-y-6 px-8 py-10">
        {/* Header */}
        <div className="space-y-1.5">
          <h1
            className="text-[32px] leading-tight"
            style={{ color: TEXT, fontWeight: 510, letterSpacing: '-0.704px' }}
          >
            Settings
          </h1>
          <p className="text-[15px]" style={{ color: MUTED, letterSpacing: '-0.165px' }}>
            Configure hooks, notifications, and search
          </p>
        </div>

        {/* Hooks */}
        <section className={card + ' space-y-4'}>
          <div className="space-y-1">
            <h2 className="text-[18px]" style={{ color: TEXT, fontWeight: 510 }}>
              Hooks
            </h2>
            <p className="text-[13px]" style={{ color: MUTED }}>
              Claude Code hooks enable real-time session state tracking via an HTTP server.
            </p>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-[13px]" style={{ color: TEXT_2 }}>
              <StatusDot color={hookStatus?.serverRunning ? '#27a644' : '#e5484d'} />
              <span>
                Hook server: {hookStatus?.serverRunning ? 'Running' : 'Stopped'}
                {hookStatus?.serverRunning && ` on port ${hookStatus.port}`}
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[13px]" style={{ color: TEXT_2 }}>
              <StatusDot color={hookStatus?.hooksInstalled ? '#27a644' : '#f5a623'} />
              <span>Hooks: {hookStatus?.hooksInstalled ? 'Installed' : 'Not installed'}</span>
            </div>
            <button onClick={handleInstallToggle} disabled={loading} className={btn}>
              {loading ? '…' : hookStatus?.hooksInstalled ? 'Uninstall hooks' : 'Install hooks'}
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className={card + ' space-y-5'}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-[18px]" style={{ color: TEXT, fontWeight: 510 }}>
                Notifications
              </h2>
              <p className="text-[13px]" style={{ color: MUTED }}>
                Receive native notifications when Claude Code sessions need your attention.
              </p>
            </div>
            <Toggle
              checked={prefs.enabled}
              onChange={() => updatePrefs({ enabled: !prefs.enabled })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px]" style={{ color: TEXT_2 }}>
                  Session completed
                </div>
                <p className="text-[12px]" style={{ color: SUBTLE }}>
                  Claude Code finished and is waiting for input
                </p>
              </div>
              <Toggle
                checked={prefs.showOnComplete}
                onChange={() => updatePrefs({ showOnComplete: !prefs.showOnComplete })}
                disabled={!prefs.enabled}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px]" style={{ color: TEXT_2 }}>
                  Error occurred
                </div>
                <p className="text-[12px]" style={{ color: SUBTLE }}>
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

          <div className="flex items-center gap-3 border-t border-white/[0.06] pt-4">
            <button onClick={handleTestNotification} className={btn}>
              Send test notification
            </button>
            {testResult && (
              <span className="text-[12px]" style={{ color: MUTED }}>
                {testResult}
              </span>
            )}
          </div>
        </section>

        {/* Search */}
        <section className={card + ' space-y-6'}>
          <div className="space-y-1">
            <h2 className="text-[18px]" style={{ color: TEXT, fontWeight: 510 }}>
              Search
            </h2>
            <p className="text-[13px]" style={{ color: MUTED }}>
              Semantic search over your sessions. Local embeddings run on your machine — private and
              free.
            </p>
          </div>

          {/* Status / lifecycle */}
          <div className="space-y-3">
            <Overline>Status</Overline>
            {idxStatus === null ? (
              <p className="text-[13px]" style={{ color: MUTED }}>
                Loading…
              </p>
            ) : !idxStatus.enabled ? (
              <div className="space-y-3">
                {backend.provider === 'local' ? (
                  <>
                    <p className="text-[13px]" style={{ color: MUTED }}>
                      Search is off. The local embedding model (~120&nbsp;MB) downloads once on
                      first use, then runs privately on your machine.
                    </p>
                    <button
                      onClick={async () => {
                        await api.searchEnable()
                        await refreshIdxStatus()
                      }}
                      className={btnPrimary}
                    >
                      Enable &amp; download model
                    </button>
                  </>
                ) : backend.hasKey ? (
                  <>
                    <p className="text-[13px]" style={{ color: MUTED }}>
                      Search is off. OpenAI embeddings need no download.
                    </p>
                    <button
                      onClick={async () => {
                        await api.searchEnable()
                        await refreshIdxStatus()
                      }}
                      className={btnPrimary}
                    >
                      Enable search
                    </button>
                  </>
                ) : (
                  <p className="text-[13px]" style={{ color: MUTED }}>
                    Search is off. Add your OpenAI API key below to enable search — no download
                    needed.
                  </p>
                )}
              </div>
            ) : idxStatus.building ? (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2.5 text-[13px]" style={{ color: TEXT_2 }}>
                  <StatusDot color={VIOLET} />
                  <span>
                    Indexing with {idxStatus.model}…{' '}
                    <span style={{ color: TEXT }}>
                      {idxStatus.indexed}/{idxStatus.total}
                    </span>
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await api.searchCancelBuild()
                    await refreshIdxStatus()
                  }}
                  className={btn}
                >
                  Stop
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2.5 text-[13px]" style={{ color: TEXT_2 }}>
                  <StatusDot color="#27a644" />
                  <span>Indexed {idxStatus.indexed} sessions</span>
                </div>
                <button
                  onClick={async () => {
                    await api.searchReindex()
                    await refreshIdxStatus()
                  }}
                  className={btn}
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
                    className={btn}
                  >
                    Remove model ({mb(idxStatus.modelSizeBytes)})
                  </button>
                )}
              </div>
            )}
            {idxStatus?.error && (
              <p className="text-[12px]" style={{ color: '#e5484d' }}>
                Last indexing error: {idxStatus.error}
              </p>
            )}
          </div>

          {/* Embedding backend */}
          <div className="space-y-3 border-t border-white/[0.06] pt-5">
            <Overline>Embedding backend</Overline>
            <div className="flex gap-2">
              {backendPill('local', 'Local', 'multilingual-e5-small')}
              {backendPill('openai', 'OpenAI', 'text-embedding-3-small')}
            </div>
            {backend.provider === 'openai' && (
              <div className="space-y-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onBlur={saveApiKey}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void saveApiKey()
                    }
                  }}
                  placeholder={
                    backend.hasKey
                      ? 'Enter a new key to replace the stored one…'
                      : 'OpenAI API key (stored only in your OS keychain)'
                  }
                  className="w-full rounded-md border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[13px] outline-none placeholder:text-[#62666d] focus:border-[#5e6ad2]/60"
                  style={{ color: TEXT }}
                />
                <div className="flex items-center gap-3 text-[12px]">
                  {keySaved ? (
                    <span style={{ color: '#27a644' }}>✓ Saved to your OS keychain</span>
                  ) : backend.hasKey ? (
                    <>
                      <span style={{ color: '#27a644' }}>✓ Key stored in your OS keychain</span>
                      <button
                        onClick={deleteApiKey}
                        className="transition-colors hover:text-[#f7f8f8]"
                        style={{ color: MUTED }}
                      >
                        Delete key
                      </button>
                    </>
                  ) : (
                    <span style={{ color: SUBTLE }}>
                      Press Enter or click away to save. Stored only in your OS keychain.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Project scope */}
          {projects.length > 0 && (
            <div className="space-y-3 border-t border-white/[0.06] pt-5">
              <div className="flex items-center justify-between">
                <Overline>Projects to index</Overline>
                <button
                  onClick={async () => {
                    setScope(null)
                    await api.searchSetScope(null)
                    refreshIdxStatus()
                  }}
                  className="text-[12px] transition-colors hover:text-[#f7f8f8]"
                  style={{ color: MUTED }}
                >
                  Select all
                </button>
              </div>
              <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-md border border-white/[0.08] bg-white/[0.02] p-2 scrollbar-thin">
                {projects.map((p) => {
                  const included = scope === null || scope.includes(p.projectEncoded)
                  return (
                    <label
                      key={p.projectEncoded}
                      className="flex cursor-pointer items-center gap-2.5 rounded px-1.5 py-1 text-[13px] hover:bg-white/[0.04]"
                      style={{ color: included ? TEXT_2 : SUBTLE }}
                    >
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={() => toggleProject(p.projectEncoded)}
                        className="accent-[#7170ff]"
                      />
                      <span className="truncate">{p.project}</span>
                    </label>
                  )
                })}
              </div>
              <p className="text-[12px]" style={{ color: SUBTLE }}>
                {scope === null
                  ? 'Indexing all projects.'
                  : `Indexing ${scope.length} of ${projects.length} projects.`}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
