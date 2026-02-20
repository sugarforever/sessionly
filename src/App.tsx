import { NavigationProvider } from './contexts/NavigationContext'
import { Layout } from './components/Layout'
import { PageRouter } from './components/PageRouter'
import { NotificationProvider } from './contexts/NotificationContext'

function App() {
  return (
    <NotificationProvider>
      <NavigationProvider defaultPage="sessions">
        <Layout>
          <PageRouter />
        </Layout>
      </NavigationProvider>
    </NotificationProvider>
  )
}

export default App
