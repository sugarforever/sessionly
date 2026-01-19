/**
 * Terminal Manager Service
 *
 * Manages PTY (pseudo-terminal) instances for running Claude Code CLI.
 * Uses node-pty for native terminal emulation.
 */

import * as pty from 'node-pty'
import * as os from 'node:os'
import { v4 as uuidv4 } from 'uuid'
import { BrowserWindow } from 'electron'

export interface TerminalOptions {
  cwd?: string
  sessionId?: string
  resume?: boolean
  fork?: boolean
}

interface TerminalInstance {
  id: string
  pty: pty.IPty
  cwd: string
  sessionId?: string
}

// Store active terminal instances
const terminals = new Map<string, TerminalInstance>()

/**
 * Get the default shell for the current platform
 */
function getDefaultShell(): string {
  if (os.platform() === 'win32') {
    return process.env.COMSPEC || 'cmd.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

/**
 * Spawn a new terminal instance
 */
export function spawn(
  window: BrowserWindow,
  options: TerminalOptions = {}
): string {
  const id = uuidv4()
  const cwd = options.cwd || os.homedir()
  const shell = getDefaultShell()

  // Build command args for Claude CLI
  const args: string[] = []

  // If resuming a session
  if (options.sessionId && options.resume) {
    // For now, just start a shell - Claude CLI resume would be:
    // args.push('-c', `claude --resume ${options.sessionId}`)
  }

  // Create PTY instance
  const ptyProcess = pty.spawn(shell, args, {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd,
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    },
  })

  // Store the terminal instance
  terminals.set(id, {
    id,
    pty: ptyProcess,
    cwd,
    sessionId: options.sessionId,
  })

  // Forward PTY output to renderer
  ptyProcess.onData((data) => {
    if (!window.isDestroyed()) {
      window.webContents.send('terminal:data', { id, data })
    }
  })

  // Handle PTY exit
  ptyProcess.onExit(({ exitCode, signal }) => {
    if (!window.isDestroyed()) {
      window.webContents.send('terminal:exit', { id, exitCode, signal })
    }
    terminals.delete(id)
  })

  return id
}

/**
 * Write data to a terminal
 */
export function write(id: string, data: string): boolean {
  const terminal = terminals.get(id)
  if (!terminal) {
    return false
  }
  terminal.pty.write(data)
  return true
}

/**
 * Resize a terminal
 */
export function resize(id: string, cols: number, rows: number): boolean {
  const terminal = terminals.get(id)
  if (!terminal) {
    return false
  }
  terminal.pty.resize(cols, rows)
  return true
}

/**
 * Kill a terminal
 */
export function kill(id: string): boolean {
  const terminal = terminals.get(id)
  if (!terminal) {
    return false
  }
  terminal.pty.kill()
  terminals.delete(id)
  return true
}

/**
 * Kill all terminals
 */
export function killAll(): void {
  for (const [id, terminal] of terminals) {
    terminal.pty.kill()
    terminals.delete(id)
  }
}

/**
 * Get list of active terminal IDs
 */
export function getActiveTerminals(): string[] {
  return Array.from(terminals.keys())
}

/**
 * Check if a terminal exists
 */
export function exists(id: string): boolean {
  return terminals.has(id)
}
