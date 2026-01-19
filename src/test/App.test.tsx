import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '../store'
import App from '../App'

describe('App', () => {
  it('renders the app with navigation', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    )
    // Should show Sessions in the sidebar - use getAllByText since it appears multiple times
    const sessionsElements = screen.getAllByText('Sessions')
    expect(sessionsElements.length).toBeGreaterThan(0)
  })

  it('renders the sidebar navigation items', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    )
    // Use getAllByText for items that appear multiple times
    expect(screen.getAllByText('Sessions').length).toBeGreaterThan(0)
    // Check for navigation icons - Sessions (history) and About (info)
    const historyIcon = document.querySelector('svg.lucide-history')
    const aboutIcon = document.querySelector('svg.lucide-info')
    expect(historyIcon).toBeInTheDocument()
    expect(aboutIcon).toBeInTheDocument()
  })
})
