import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import iconPng from '/icon.png'

export function AboutPage() {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    async function fetchVersion() {
      const response = await window.electron.getVersion()
      if (response.success && response.data) {
        setVersion(response.data)
      }
    }
    fetchVersion()
  }, [])

  const handleOpenExternal = async (url: string) => {
    await window.electron.openExternal(url)
  }

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="max-w-md text-center px-6">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <img src={iconPng} alt="Sessionly Logo" className="h-16 w-16 rounded-2xl" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sessionly</h1>

        {/* Version */}
        <p className="mt-1 font-mono text-sm text-muted-foreground">v{version || '1.0.0'}</p>

        {/* Description */}
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Browse and manage your Claude Code CLI session history. View past conversations, search
          across sessions, and resume where you left off.
        </p>

        {/* Links */}
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => handleOpenExternal('https://claude.ai/code')}
          >
            Claude Code
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => handleOpenExternal('https://github.com/sugarforever/sessionly')}
          >
            GitHub
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </Button>
        </div>

        {/* Info */}
        <p className="mt-8 text-[10px] text-muted-foreground/50">
          Sessions are stored locally in ~/.claude
        </p>
      </div>
    </div>
  )
}
