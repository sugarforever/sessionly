import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '../store'
import { ThemeProvider } from '../contexts/ThemeContext'
import App from '../App'

describe('App', () => {
  it('renders the app with navigation', async () => {
    render(
      <Provider store={store}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </Provider>
    )

    // Wait for async effects to complete (ThemeProvider, SessionsPage)
    await waitFor(() => {
      const sessionsElements = screen.getAllByText('Sessions')
      expect(sessionsElements.length).toBeGreaterThan(0)
    })
  })

  it('renders the sidebar navigation items', async () => {
    render(
      <Provider store={store}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </Provider>
    )

    // Wait for async effects to complete
    await waitFor(() => {
      expect(screen.getAllByText('Sessions').length).toBeGreaterThan(0)
    })

    // Check for navigation icons - Sessions (history) and About (info)
    const historyIcon = document.querySelector('svg.lucide-history')
    const aboutIcon = document.querySelector('svg.lucide-info')
    expect(historyIcon).toBeInTheDocument()
    expect(aboutIcon).toBeInTheDocument()
  })
})
