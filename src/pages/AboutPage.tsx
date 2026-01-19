import { useState, useEffect } from 'react'
import { History, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
      <div className="max-w-md text-center px-6">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20">
            <History className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Claude Sessions
        </h1>

        {/* Version */}
        <p className="mt-1 font-mono text-sm text-zinc-500">
          v{version || '1.0.0'}
        </p>

        {/* Description */}
        <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
          Browse and manage your Claude Code CLI session history.
          View past conversations, search across sessions, and resume
          where you left off.
        </p>

        {/* Links */}
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs border-zinc-800 bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
            onClick={() => handleOpenExternal('https://claude.ai/code')}
          >
            Claude Code
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs border-zinc-800 bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
            onClick={() => handleOpenExternal('https://github.com/anthropics/claude-code')}
          >
            GitHub
            <ExternalLink className="ml-1.5 h-3 w-3" />
          </Button>
        </div>

        {/* Copyright */}
        <p className="mt-8 text-[10px] text-zinc-700">
          Sessions are stored locally in ~/.claude
        </p>
      </div>
    </div>
  )
}
