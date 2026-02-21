import { NavigationProvider } from './contexts/NavigationContext'
import { Layout } from './components/Layout'
import { PageRouter } from './components/PageRouter'
import { NotificationProvider } from './contexts/NotificationContext'
import { SessionMonitorProvider } from './contexts/SessionMonitorContext'

function App() {
  return (
    <NotificationProvider>
      <SessionMonitorProvider>
        <NavigationProvider defaultPage="home">
          <Layout>
            <PageRouter />
          </Layout>
        </NavigationProvider>
      </SessionMonitorProvider>
    </NotificationProvider>
  )
}

export default App
