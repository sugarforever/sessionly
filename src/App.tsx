import { useEffect } from 'react'
import { NavigationProvider } from './contexts/NavigationContext'
import { Layout } from './components/Layout'
import { PageRouter } from './components/PageRouter'
import {
  isPermissionGranted,
  requestPermission,
} from '@tauri-apps/plugin-notification'

function App() {
  useEffect(() => {
    async function ensureNotificationPermission() {
      const granted = await isPermissionGranted()
      if (!granted) {
        await requestPermission()
      }
    }
    ensureNotificationPermission().catch((e) => console.error('Notification permission error:', e))
  }, [])

  return (
    <NavigationProvider defaultPage="sessions">
      <Layout>
        <PageRouter />
      </Layout>
    </NavigationProvider>
  )
}

export default App
