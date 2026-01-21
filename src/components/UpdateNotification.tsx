import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { X, Download, RefreshCw } from 'lucide-react'
import type { UpdateInfo, UpdateProgress } from '@/../electron/shared/types'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'

export function UpdateNotification() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<UpdateProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsubChecking = window.electron.onUpdateChecking(() => {
      setStatus('checking')
    })

    const unsubAvailable = window.electron.onUpdateAvailable((info) => {
      setStatus('available')
      setUpdateInfo(info)
      setDismissed(false)
    })

    const unsubNotAvailable = window.electron.onUpdateNotAvailable(() => {
      setStatus('idle')
    })

    const unsubProgress = window.electron.onUpdateProgress((prog) => {
      setStatus('downloading')
      setProgress(prog)
    })

    const unsubDownloaded = window.electron.onUpdateDownloaded((info) => {
      setStatus('downloaded')
      setUpdateInfo(info)
      setProgress(null)
    })

    const unsubError = window.electron.onUpdateError((err) => {
      setStatus('error')
      setError(err)
    })

    return () => {
      unsubChecking()
      unsubAvailable()
      unsubNotAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [])

  const handleDownload = async () => {
    setStatus('downloading')
    setProgress({ percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 })
    await window.electron.downloadUpdate()
  }

  const handleInstall = () => {
    window.electron.installUpdate()
  }

  const handleDismiss = () => {
    setDismissed(true)
  }

  const handleCheckAgain = async () => {
    setError(null)
    setStatus('checking')
    await window.electron.checkForUpdates()
  }

  // Don't show notification for idle, checking, or dismissed states
  if (status === 'idle' || status === 'checking' || dismissed) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border bg-background p-4 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {status === 'available' && (
            <>
              <h4 className="font-semibold">Update Available</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Version {updateInfo?.version} is ready to download
              </p>
            </>
          )}

          {status === 'downloading' && (
            <>
              <h4 className="font-semibold">Downloading Update</h4>
              <p className="mt-1 text-sm text-muted-foreground">Version {updateInfo?.version}</p>
              {progress && (
                <div className="mt-3">
                  <Progress value={progress.percent} className="h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Math.round(progress.percent)}% complete
                  </p>
                </div>
              )}
            </>
          )}

          {status === 'downloaded' && (
            <>
              <h4 className="font-semibold">Ready to Install</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Version {updateInfo?.version} has been downloaded
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
          <button onClick={handleDismiss} className="ml-2 rounded-sm opacity-70 hover:opacity-100">
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

        {status === 'downloaded' && (
          <Button onClick={handleInstall} size="sm" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Restart & Install
          </Button>
        )}

        {status === 'error' && (
          <Button onClick={handleCheckAgain} size="sm" variant="outline" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Try Again
          </Button>
        )}

        {(status === 'available' || status === 'downloaded') && (
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Later
          </Button>
        )}
      </div>
    </div>
  )
}
