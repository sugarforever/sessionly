import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, RefreshCw } from 'lucide-react'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [version, setVersion] = useState<string>('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [update, setUpdate] = useState<Awaited<ReturnType<typeof check>> | null>(null)

  useEffect(() => {
    async function checkForUpdate() {
      try {
        setStatus('checking')
        const result = await check()
        if (result) {
          setUpdate(result)
          setVersion(result.version)
          setStatus('available')
        } else {
          setStatus('idle')
        }
      } catch {
        // Silently ignore update check failures (no release published yet, network issues, etc.)
        setStatus('idle')
      }
    }
    checkForUpdate()
  }, [])

  const handleDownload = async () => {
    if (!update) return
    try {
      setStatus('downloading')
      let totalBytes = 0
      let downloadedBytes = 0
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          totalBytes = event.data.contentLength
        } else if (event.event === 'Progress') {
          downloadedBytes += event.data.chunkLength
          if (totalBytes > 0) setProgress(Math.round((downloadedBytes / totalBytes) * 100))
        } else if (event.event === 'Finished') {
          setStatus('ready')
        }
      })
      setStatus('ready')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Download failed')
    }
  }

  const handleRelaunch = async () => {
    await relaunch()
  }

  if (status === 'idle' || status === 'checking' || dismissed) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border bg-background p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {status === 'available' && (
            <>
              <h4 className="font-semibold">Update Available</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Version {version} is ready to download
              </p>
            </>
          )}
          {status === 'downloading' && (
            <>
              <h4 className="font-semibold">Downloading Update</h4>
              <p className="mt-1 text-sm text-muted-foreground">{progress}% complete</p>
            </>
          )}
          {status === 'ready' && (
            <>
              <h4 className="font-semibold">Ready to Install</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Version {version} has been downloaded
              </p>
            </>
          )}
          {status === 'error' && (
            <>
              <h4 className="font-semibold text-destructive">Update Error</h4>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </>
          )}
        </div>
        {status !== 'downloading' && (
          <button
            onClick={() => setDismissed(true)}
            className="ml-2 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        {status === 'available' && (
          <Button onClick={handleDownload} size="sm" className="gap-1">
            <Download className="h-3 w-3" />
            Download
          </Button>
        )}
        {status === 'ready' && (
          <Button onClick={handleRelaunch} size="sm" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Restart & Install
          </Button>
        )}
        {(status === 'available' || status === 'ready') && (
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            Later
          </Button>
        )}
      </div>
    </div>
  )
}
