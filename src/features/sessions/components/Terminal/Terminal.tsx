import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

interface TerminalProps {
  onReady?: (xterm: XTerm) => void
  onData?: (data: string) => void
  onResize?: (cols: number, rows: number) => void
}

export function Terminal({ onReady, onData, onResize }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const isInitializedRef = useRef(false)

  // Safe fit that checks dimensions first
  const safeFit = useCallback(() => {
    if (!fitAddonRef.current || !xtermRef.current || !containerRef.current) return

    // Check container has actual dimensions
    const { offsetWidth, offsetHeight } = containerRef.current
    if (offsetWidth === 0 || offsetHeight === 0) return

    try {
      fitAddonRef.current.fit()
      const { cols, rows } = xtermRef.current
      onResize?.(cols, rows)
    } catch (e) {
      // Ignore fit errors during initialization
      console.warn('Terminal fit error:', e)
    }
  }, [onResize])

  useEffect(() => {
    if (!containerRef.current) return

    // Create terminal instance
    const xterm = new XTerm({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#f0f0f0',
        cursor: '#f0f0f0',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#3a3a3a',
        black: '#000000',
        red: '#ff5555',
        green: '#50fa7b',
        yellow: '#f1fa8c',
        blue: '#6272a4',
        magenta: '#ff79c6',
        cyan: '#8be9fd',
        white: '#f8f8f2',
        brightBlack: '#6272a4',
        brightRed: '#ff6e6e',
        brightGreen: '#69ff94',
        brightYellow: '#ffffa5',
        brightBlue: '#d6acff',
        brightMagenta: '#ff92df',
        brightCyan: '#a4ffff',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    })

    // Add addons
    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    xterm.loadAddon(fitAddon)
    xterm.loadAddon(webLinksAddon)

    // Store refs
    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Open terminal in container
    xterm.open(containerRef.current)

    // Delay initial fit to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      isInitializedRef.current = true
      safeFit()
      // Notify parent after initialization
      onReady?.(xterm)
    }, 50)

    // Handle user input
    xterm.onData((data) => {
      onData?.(data)
    })

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (isInitializedRef.current) {
        safeFit()
      }
    })
    resizeObserver.observe(containerRef.current)

    // Cleanup
    return () => {
      clearTimeout(initTimeout)
      isInitializedRef.current = false
      resizeObserver.disconnect()
      xterm.dispose()
    }
  }, [onReady, onData, safeFit])

  return (
    <div
      ref={containerRef}
      className="h-full w-full bg-[#0a0a0a] p-1"
      style={{ minHeight: '200px' }}
    />
  )
}
