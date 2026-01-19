import { useEffect, useCallback } from 'react'
import { X, TerminalSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Terminal } from './Terminal'
import { useTerminal } from './useTerminal'
import type { Terminal as XTerm } from 'xterm'

interface TerminalPanelProps {
  cwd?: string
  sessionId?: string
  onClose: () => void
}

export function TerminalPanel({ cwd, sessionId, onClose }: TerminalPanelProps) {
  const { isRunning, error, spawn, write, resize, kill, setXterm } = useTerminal({
    onExit: (exitCode) => {
      console.log('Terminal exited with code:', exitCode)
    },
  })

  // Spawn terminal on mount
  useEffect(() => {
    spawn({ cwd, sessionId })
    return () => {
      kill()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTerminalReady = useCallback(
    (xterm: XTerm) => {
      setXterm(xterm)
    },
    [setXterm]
  )

  const handleTerminalData = useCallback(
    (data: string) => {
      write(data)
    },
    [write]
  )

  const handleTerminalResize = useCallback(
    (cols: number, rows: number) => {
      resize(cols, rows)
    },
    [resize]
  )

  const handleClose = useCallback(() => {
    kill()
    onClose()
  }, [kill, onClose])

  return (
    <div className="flex h-full flex-col border-t border-zinc-800/50 bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/50 bg-[#0f0f0f] px-3 py-1.5">
        <div className="flex items-center gap-2">
          <TerminalSquare className="h-3.5 w-3.5 text-zinc-600" />
          <span className="text-xs font-medium text-zinc-400">Terminal</span>
          {isRunning && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Running" />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50"
          onClick={handleClose}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Terminal */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : (
          <Terminal
            onReady={handleTerminalReady}
            onData={handleTerminalData}
            onResize={handleTerminalResize}
          />
        )}
      </div>
    </div>
  )
}
