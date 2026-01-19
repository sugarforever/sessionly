import { useState, useCallback, useEffect, useRef } from 'react'
import type { Terminal as XTerm } from 'xterm'
import type { TerminalSpawnOptions } from '@/../electron/shared/types'

interface UseTerminalOptions {
  onData?: (data: string) => void
  onExit?: (exitCode: number, signal?: number) => void
}

export function useTerminal(options: UseTerminalOptions = {}) {
  const [terminalId, setTerminalId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const xtermRef = useRef<XTerm | null>(null)

  // Set up data and exit listeners
  useEffect(() => {
    const unsubData = window.electron.onTerminalData((id, data) => {
      if (id === terminalId && xtermRef.current) {
        xtermRef.current.write(data)
        options.onData?.(data)
      }
    })

    const unsubExit = window.electron.onTerminalExit((id, exitCode, signal) => {
      if (id === terminalId) {
        setIsRunning(false)
        options.onExit?.(exitCode, signal)
      }
    })

    return () => {
      unsubData()
      unsubExit()
    }
  }, [terminalId, options])

  const spawn = useCallback(async (spawnOptions?: TerminalSpawnOptions) => {
    try {
      setError(null)
      const response = await window.electron.terminalSpawn(spawnOptions)
      if (response.success && response.data) {
        setTerminalId(response.data)
        setIsRunning(true)
        return response.data
      } else {
        setError(response.error || 'Failed to spawn terminal')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to spawn terminal')
      return null
    }
  }, [])

  const write = useCallback(
    (data: string) => {
      if (terminalId) {
        window.electron.terminalWrite(terminalId, data)
      }
    },
    [terminalId]
  )

  const resize = useCallback(
    (cols: number, rows: number) => {
      if (terminalId) {
        window.electron.terminalResize(terminalId, cols, rows)
      }
    },
    [terminalId]
  )

  const kill = useCallback(async () => {
    if (terminalId) {
      await window.electron.terminalKill(terminalId)
      setTerminalId(null)
      setIsRunning(false)
    }
  }, [terminalId])

  const setXterm = useCallback((xterm: XTerm | null) => {
    xtermRef.current = xterm
  }, [])

  return {
    terminalId,
    isRunning,
    error,
    spawn,
    write,
    resize,
    kill,
    setXterm,
  }
}
