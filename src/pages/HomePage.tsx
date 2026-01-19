import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setVersion } from '@/store/slices/appSlice'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function HomePage() {
  const dispatch = useAppDispatch()
  const { version } = useAppSelector((state) => state.app)

  useEffect(() => {
    // Get app version from main process
    window.electron.getVersion().then((response) => {
      if (response.success && response.data) {
        dispatch(setVersion(response.data))
      }
    })

    // Listen for main process messages
    const unsubscribe = window.electron.onMainMessage((message) => {
      console.log('Message from main process:', message)
    })

    return () => unsubscribe()
  }, [dispatch])

  const handleNotification = async () => {
    const response = await window.electron.showNotification({
      title: 'Hello from Electron!',
      body: 'This is a native notification.',
    })

    if (!response.success) {
      console.error('Failed to show notification:', response.error)
    }
  }

  const handleOpenExternal = async () => {
    const response = await window.electron.openExternal('https://github.com')
    if (!response.success) {
      console.error('Failed to open URL:', response.error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Welcome</h1>
        <p className="text-lg text-muted-foreground">
          A modern, production-ready Electron boilerplate
        </p>
        {version && (
          <Badge variant="secondary" className="font-mono text-xs">
            v{version}
          </Badge>
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Try out the built-in features</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={handleNotification}>Show Notification</Button>
          <Button onClick={handleOpenExternal} variant="secondary">
            Open GitHub
          </Button>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Start building your desktop application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-2 font-semibold">1. Explore the Navigation</h3>
            <p className="text-sm text-muted-foreground">
              Use the sidebar to navigate between different pages. Each page is a separate module.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">2. Add Your Features</h3>
            <p className="text-sm text-muted-foreground">
              Create new pages in <code className="rounded bg-muted px-1 py-0.5">src/pages/</code>{' '}
              and add them to the navigation config.
            </p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">3. Customize the UI</h3>
            <p className="text-sm text-muted-foreground">
              Modify components, add new shadcn/ui components, and customize the theme.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
