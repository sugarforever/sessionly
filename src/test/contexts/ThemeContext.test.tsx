import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext'

// Test component to access context
function TestComponent() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('system')}>Set System</button>
    </div>
  )
}

describe('ThemeContext', () => {
  let localStorageMock: { [key: string]: string }
  let unsubscribeMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    localStorageMock = {}
    unsubscribeMock = vi.fn()

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      localStorageMock[key] = value
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key) => localStorageMock[key] || null
    )

    // Mock electron API
    window.electron = {
      ...window.electron,
      getNativeTheme: vi.fn().mockResolvedValue({ success: true, data: 'light' }),
      onThemeChange: vi.fn().mockReturnValue(unsubscribeMock),
    }

    // Reset document classes
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ThemeProvider', () => {
    it('should provide default system theme', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('system')
      })
    })

    it('should load theme from localStorage', async () => {
      localStorageMock['app-theme'] = 'dark'

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark')
      })
    })

    it('should fetch native theme on mount', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(window.electron.getNativeTheme).toHaveBeenCalled()
      })
    })

    it('should subscribe to native theme changes', async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(window.electron.onThemeChange).toHaveBeenCalled()
      })
    })

    it('should unsubscribe on unmount', async () => {
      const { unmount } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(window.electron.onThemeChange).toHaveBeenCalled()
      })

      unmount()

      expect(unsubscribeMock).toHaveBeenCalled()
    })

    it('should apply theme class to document', async () => {
      localStorageMock['app-theme'] = 'dark'

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true)
      })
    })

    it('should set data-theme attribute on document', async () => {
      localStorageMock['app-theme'] = 'light'

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light')
      })
    })
  })

  describe('setTheme', () => {
    it('should update theme when setTheme is called', async () => {
      const user = userEvent.setup()

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('system')
      })

      await user.click(screen.getByText('Set Dark'))

      expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    })

    it('should persist theme to localStorage', async () => {
      const user = userEvent.setup()

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Set Dark'))

      expect(localStorage.setItem).toHaveBeenCalledWith('app-theme', 'dark')
    })
  })

  describe('resolvedTheme', () => {
    it('should resolve to system theme when theme is system', async () => {
      ;(window.electron.getNativeTheme as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: 'dark',
      })

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
      })
    })

    it('should resolve to explicit theme when set', async () => {
      const user = userEvent.setup()

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Set Light'))

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
    })

    it('should update resolved theme when native theme changes', async () => {
      let themeChangeCallback: (theme: 'light' | 'dark') => void = () => {}
      ;(window.electron.onThemeChange as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
        themeChangeCallback = cb
        return unsubscribeMock
      })

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')
      })

      // Simulate native theme change
      act(() => {
        themeChangeCallback('dark')
      })

      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
    })
  })

  describe('useTheme', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => render(<TestComponent />)).toThrow(
        'useTheme must be used within a ThemeProvider'
      )

      consoleSpy.mockRestore()
    })
  })

  describe('invalid localStorage values', () => {
    it('should default to system when localStorage has invalid value', async () => {
      localStorageMock['app-theme'] = 'invalid-theme'

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('system')
      })
    })
  })
})
