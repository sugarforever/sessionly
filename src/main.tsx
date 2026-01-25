import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { ThemeProvider } from './contexts/ThemeContext'
import App from './App'
import './index.css'

// Check if this is the pet window
if (window.location.hash === '#/pet') {
  // Render pet window
  import('./features/pet/PetWindow').then(({ PetWindow }) => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <PetWindow />
      </React.StrictMode>
    )
  })
} else {
  // Render main app
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <Provider store={store}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </Provider>
    </React.StrictMode>
  )
}
