import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/types/api'
import { open } from '@tauri-apps/plugin-shell'
import iconPng from '/icon.png'

export function AboutPage() {
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    api.getVersion().then(setVersion).catch(() => {})
  }, [])

  const handleOpenExternal = async (url: string) => {
    await open(url)
  }

  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="max-w-md text-center px-6">
        <div className="flex justify-center mb-4">
          <img src={iconPng} alt="Sessionly Logo" className="h-16 w-16 rounded-2xl" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sessionly</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">v{version || '2.0.0'}</p>
        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          Browse and manage your Claude Code CLI session history. View conversations, tool calls,
          and thinking blocks from your coding sessions.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenExternal('https://docs.anthropic.com/en/docs/agents-and-tools/claude-code/overview')}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Claude Code
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenExternal('https://github.com/sugarforever/sessionly')}
            className="gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            GitHub
          </Button>
        </div>
        <p className="mt-8 text-[10px] text-muted-foreground/50">
          Sessions are stored locally in ~/.claude
        </p>
      </div>
    </div>
  )
}
