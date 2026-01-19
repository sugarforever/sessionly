import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '../store'
import App from '../App'

describe('App', () => {
  it('renders the app title', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    )
    expect(screen.getByText('Electron Boilerplate')).toBeDefined()
  })

  it('renders demo actions', () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    )
    expect(screen.getByText('Show Notification')).toBeDefined()
    expect(screen.getByText('Open GitHub')).toBeDefined()
  })
})
