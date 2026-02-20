import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, X } from 'lucide-react'

const DISMISS_KEY = 'migration-banner-dismissed'

export function MigrationBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true')

  if (dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setDismissed(true)
  }

  const handleDownload = () => {
    window.electron.openExternal('https://github.com/sugarforever/sessionly/releases/latest')
  }

  return (
    <div className="relative z-50 flex items-center justify-between border-b border-amber-500/30 bg-amber-500/15 px-4 py-2">
      <p className="text-sm text-amber-900 dark:text-amber-200">
        <span className="font-semibold">Sessionly v2 is here</span> — rebuilt with Tauri for a
        smaller, faster experience.
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={handleDownload}>
          <ExternalLink className="h-3 w-3" />
          Download v2
        </Button>
        <button onClick={handleDismiss} className="rounded-sm opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
