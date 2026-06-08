import { NavigationProvider } from './contexts/NavigationContext'
import { Layout } from './components/Layout'
import { PageRouter } from './components/PageRouter'
import { NotificationProvider } from './contexts/NotificationContext'
import { SessionMonitorProvider } from './contexts/SessionMonitorContext'
import { SearchProvider } from './features/search/SearchProvider'

function App() {
  return (
    <NotificationProvider>
      <SessionMonitorProvider>
        <NavigationProvider defaultPage="home">
          <SearchProvider>
            <Layout>
              <PageRouter />
            </Layout>
          </SearchProvider>
        </NavigationProvider>
      </SessionMonitorProvider>
    </NotificationProvider>
  )
}

export default App
