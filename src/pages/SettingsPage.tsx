import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { toggleTheme } from '@/store/slices/appSlice'
import { Eye, EyeOff, Check } from 'lucide-react'

export function SettingsPage() {
  const dispatch = useAppDispatch()
  const { theme } = useAppSelector((state) => state.app)

  // Chat feature state (can be removed if chat feature is not needed)
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [isSavingApiKey, setIsSavingApiKey] = useState(false)
  const [apiKeySaved, setApiKeySaved] = useState(false)

  // Load API key on mount
  useEffect(() => {
    const loadApiKey = async () => {
      const response = await window.electron.chatGetApiKey()
      if (response.success && response.data) {
        setApiKey(response.data)
      }
    }
    loadApiKey()
  }, [])

  const handleSaveApiKey = async () => {
    setIsSavingApiKey(true)
    setApiKeySaved(false)

    const response = await window.electron.chatSetApiKey(apiKey)

    setIsSavingApiKey(false)

    if (response.success) {
      setApiKeySaved(true)
      setTimeout(() => setApiKeySaved(false), 2000)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-lg text-muted-foreground">Customize your application preferences</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the app looks and feels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Theme</Label>
              <p className="text-sm text-muted-foreground">
                Current theme: <span className="font-medium capitalize">{theme}</span>
              </p>
            </div>
            <Button variant="outline" onClick={() => dispatch(toggleTheme())}>
              Toggle Theme
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Chat Configuration (can be removed if chat feature is not needed) */}
      <Card>
        <CardHeader>
          <CardTitle>AI Chat</CardTitle>
          <CardDescription>Configure OpenAI API for chat functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openai-api-key">OpenAI API Key</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="openai-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-0 top-0 h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                onClick={handleSaveApiKey}
                disabled={isSavingApiKey || !apiKey.trim()}
                className="shrink-0 h-9"
              >
                {apiKeySaved ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Saved
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key is stored securely and never leaves your device. Get your API key from{' '}
              <button
                onClick={() => window.electron.openExternal('https://platform.openai.com/api-keys')}
                className="underline hover:text-foreground"
              >
                OpenAI Platform
              </button>
              .
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Application */}
      <Card>
        <CardHeader>
          <CardTitle>Application</CardTitle>
          <CardDescription>Manage application settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Launch at startup</Label>
              <p className="text-sm text-muted-foreground">
                Automatically start the app when you log in
              </p>
            </div>
            <Button variant="outline" disabled>
              Coming Soon
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Minimize to tray</Label>
              <p className="text-sm text-muted-foreground">
                Hide window to system tray instead of closing
              </p>
            </div>
            <Button variant="outline" disabled>
              Enabled
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Storage</CardTitle>
          <CardDescription>Manage your application data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Clear cache</Label>
              <p className="text-sm text-muted-foreground">
                Remove temporary files and cached data
              </p>
            </div>
            <Button variant="outline">Clear Cache</Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Export data</Label>
              <p className="text-sm text-muted-foreground">Download your data as JSON</p>
            </div>
            <Button variant="outline">Export</Button>
          </div>
        </CardContent>
      </Card>

      {/* About Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced</CardTitle>
          <CardDescription>Advanced settings and actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Open DevTools</Label>
              <p className="text-sm text-muted-foreground">Open developer tools for debugging</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                // In production, you'd send IPC message to open devtools
                console.log('Open DevTools')
              }}
            >
              Open DevTools
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reset to defaults</Label>
              <p className="text-sm text-muted-foreground">
                Reset all settings to their default values
              </p>
            </div>
            <Button variant="outline" className="text-destructive">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
