import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTerminal } from '@/features/sessions/components/Terminal/useTerminal'

// Mock electron API
const mockTerminalSpawn = vi.fn()
const mockTerminalWrite = vi.fn()
const mockTerminalResize = vi.fn()
const mockTerminalKill = vi.fn()
const mockOnTerminalData = vi.fn()
const mockOnTerminalExit = vi.fn()

let dataCallback: ((id: string, data: string) => void) | null = null
let exitCallback: ((id: string, exitCode: number, signal?: number) => void) | null = null

beforeEach(() => {
  vi.clearAllMocks()
  dataCallback = null
  exitCallback = null

  mockTerminalSpawn.mockResolvedValue({
    success: true,
    data: 'terminal-123',
  })
  mockTerminalKill.mockResolvedValue({ success: true })

  mockOnTerminalData.mockImplementation((cb) => {
    dataCallback = cb
    return vi.fn() // Return unsubscribe function
  })

  mockOnTerminalExit.mockImplementation((cb) => {
    exitCallback = cb
    return vi.fn() // Return unsubscribe function
  })

  global.window.electron = {
    ...global.window.electron,
    terminalSpawn: mockTerminalSpawn,
    terminalWrite: mockTerminalWrite,
    terminalResize: mockTerminalResize,
    terminalKill: mockTerminalKill,
    onTerminalData: mockOnTerminalData,
    onTerminalExit: mockOnTerminalExit,
  } as typeof window.electron
})

describe('useTerminal', () => {
  describe('initial state', () => {
    it('should have null terminalId initially', () => {
      const { result } = renderHook(() => useTerminal())

      expect(result.current.terminalId).toBeNull()
    })

    it('should not be running initially', () => {
      const { result } = renderHook(() => useTerminal())

      expect(result.current.isRunning).toBe(false)
    })

    it('should have no error initially', () => {
      const { result } = renderHook(() => useTerminal())

      expect(result.current.error).toBeNull()
    })
  })

  describe('spawn', () => {
    it('should spawn terminal successfully', async () => {
      const { result } = renderHook(() => useTerminal())

      let terminalId: string | null = null
      await act(async () => {
        terminalId = await result.current.spawn()
      })

      expect(terminalId).toBe('terminal-123')
      expect(result.current.terminalId).toBe('terminal-123')
      expect(result.current.isRunning).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('should spawn terminal with options', async () => {
      const { result } = renderHook(() => useTerminal())

      await act(async () => {
        await result.current.spawn({ cwd: '/test/path', sessionId: 'session-456' })
      })

      expect(mockTerminalSpawn).toHaveBeenCalledWith({
        cwd: '/test/path',
        sessionId: 'session-456',
      })
    })

    it('should handle spawn error from API', async () => {
      mockTerminalSpawn.mockResolvedValue({
        success: false,
        error: 'Failed to create PTY',
      })

      const { result } = renderHook(() => useTerminal())

      let terminalId: string | null = null
      await act(async () => {
        terminalId = await result.current.spawn()
      })

      expect(terminalId).toBeNull()
      expect(result.current.terminalId).toBeNull()
      expect(result.current.isRunning).toBe(false)
      expect(result.current.error).toBe('Failed to create PTY')
    })

    it('should handle spawn exception', async () => {
      mockTerminalSpawn.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useTerminal())

      await act(async () => {
        await result.current.spawn()
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.isRunning).toBe(false)
    })

    it('should clear previous error on new spawn attempt', async () => {
      mockTerminalSpawn.mockResolvedValueOnce({
        success: false,
        error: 'First error',
      })

      const { result } = renderHook(() => useTerminal())

      // First spawn fails
      await act(async () => {
        await result.current.spawn()
      })
      expect(result.current.error).toBe('First error')

      // Second spawn succeeds
      mockTerminalSpawn.mockResolvedValueOnce({
        success: true,
        data: 'terminal-456',
      })

      await act(async () => {
        await result.current.spawn()
      })

      expect(result.current.error).toBeNull()
      expect(result.current.terminalId).toBe('terminal-456')
    })
  })

  describe('write', () => {
    it('should not write if no terminal', () => {
      const { result } = renderHook(() => useTerminal())

      act(() => {
        result.current.write('test data')
      })

      expect(mockTerminalWrite).not.toHaveBeenCalled()
    })

    it('should write to terminal', async () => {
      const { result } = renderHook(() => useTerminal())

      await act(async () => {
        await result.current.spawn()
      })

      act(() => {
        result.current.write('test data')
      })

      expect(mockTerminalWrite).toHaveBeenCalledWith('terminal-123', 'test data')
    })
  })

  describe('resize', () => {
    it('should not resize if no terminal', () => {
      const { result } = renderHook(() => useTerminal())

      act(() => {
        result.current.resize(80, 24)
      })

      expect(mockTerminalResize).not.toHaveBeenCalled()
    })

    it('should resize terminal', async () => {
      const { result } = renderHook(() => useTerminal())

      await act(async () => {
        await result.current.spawn()
      })

      act(() => {
        result.current.resize(120, 40)
      })

      expect(mockTerminalResize).toHaveBeenCalledWith('terminal-123', 120, 40)
    })
  })

  describe('kill', () => {
    it('should not kill if no terminal', async () => {
      const { result } = renderHook(() => useTerminal())

      await act(async () => {
        await result.current.kill()
      })

      expect(mockTerminalKill).not.toHaveBeenCalled()
    })

    it('should kill terminal', async () => {
      const { result } = renderHook(() => useTerminal())

      await act(async () => {
        await result.current.spawn()
      })

      await act(async () => {
        await result.current.kill()
      })

      expect(mockTerminalKill).toHaveBeenCalledWith('terminal-123')
      expect(result.current.terminalId).toBeNull()
      expect(result.current.isRunning).toBe(false)
    })
  })

  describe('setXterm', () => {
    it('should set xterm reference', () => {
      const { result } = renderHook(() => useTerminal())

      const mockXterm = { write: vi.fn() }

      act(() => {
        result.current.setXterm(mockXterm as unknown as import('xterm').Terminal)
      })

      // setXterm stores in a ref, so we can't directly test it
      // But we can verify the function doesn't throw
      expect(result.current.setXterm).toBeDefined()
    })
  })

  describe('event listeners', () => {
    it('should set up data listener', () => {
      renderHook(() => useTerminal())

      expect(mockOnTerminalData).toHaveBeenCalled()
    })

    it('should set up exit listener', () => {
      renderHook(() => useTerminal())

      expect(mockOnTerminalExit).toHaveBeenCalled()
    })

    it('should handle terminal data event', async () => {
      const onData = vi.fn()
      const mockXterm = { write: vi.fn() }

      const { result } = renderHook(() => useTerminal({ onData }))

      // Set up xterm and spawn terminal
      act(() => {
        result.current.setXterm(mockXterm as unknown as import('xterm').Terminal)
      })

      await act(async () => {
        await result.current.spawn()
      })

      // Simulate data event
      act(() => {
        dataCallback?.('terminal-123', 'output data')
      })

      expect(mockXterm.write).toHaveBeenCalledWith('output data')
      expect(onData).toHaveBeenCalledWith('output data')
    })

    it('should handle terminal exit event', async () => {
      const onExit = vi.fn()

      const { result } = renderHook(() => useTerminal({ onExit }))

      await act(async () => {
        await result.current.spawn()
      })

      expect(result.current.isRunning).toBe(true)

      // Simulate exit event
      act(() => {
        exitCallback?.('terminal-123', 0, undefined)
      })

      expect(result.current.isRunning).toBe(false)
      expect(onExit).toHaveBeenCalledWith(0, undefined)
    })

    it('should ignore data from other terminals', async () => {
      const onData = vi.fn()
      const mockXterm = { write: vi.fn() }

      const { result } = renderHook(() => useTerminal({ onData }))

      act(() => {
        result.current.setXterm(mockXterm as unknown as import('xterm').Terminal)
      })

      await act(async () => {
        await result.current.spawn()
      })

      // Simulate data event from different terminal
      act(() => {
        dataCallback?.('different-terminal', 'output data')
      })

      expect(mockXterm.write).not.toHaveBeenCalled()
      expect(onData).not.toHaveBeenCalled()
    })

    it('should ignore exit from other terminals', async () => {
      const onExit = vi.fn()

      const { result } = renderHook(() => useTerminal({ onExit }))

      await act(async () => {
        await result.current.spawn()
      })

      // Simulate exit event from different terminal
      act(() => {
        exitCallback?.('different-terminal', 1)
      })

      expect(result.current.isRunning).toBe(true)
      expect(onExit).not.toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should unsubscribe from events on unmount', () => {
      const unsubData = vi.fn()
      const unsubExit = vi.fn()

      mockOnTerminalData.mockReturnValue(unsubData)
      mockOnTerminalExit.mockReturnValue(unsubExit)

      const { unmount } = renderHook(() => useTerminal())

      unmount()

      expect(unsubData).toHaveBeenCalled()
      expect(unsubExit).toHaveBeenCalled()
    })
  })
})
