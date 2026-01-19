import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'

const resources = [
  {
    title: 'Documentation',
    description: 'Read the CLAUDE.md and README.md files',
    action: 'View Docs',
  },
  {
    title: 'GitHub',
    description: 'View source code and contribute',
    action: 'Open GitHub',
    url: 'https://github.com',
  },
  {
    title: 'Report Issue',
    description: 'Found a bug? Let us know',
    action: 'Report',
  },
]

const dependencies = [
  { name: 'Electron', version: '32+', description: 'Desktop app framework' },
  { name: 'React', version: '18', description: 'UI library' },
  { name: 'TypeScript', version: '5', description: 'Type safety' },
  { name: 'Vite', version: '5', description: 'Build tool' },
  { name: 'Tailwind CSS', version: '3', description: 'CSS framework' },
  { name: 'Redux Toolkit', version: '2', description: 'State management' },
]

export function AboutPage() {
  const handleOpenExternal = async (url: string) => {
    const response = await window.electron.openExternal(url)
    if (!response.success) {
      console.error('Failed to open URL:', response.error)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">About</h1>
        <p className="text-lg text-muted-foreground">
          Information about this application and its components
        </p>
      </div>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle>Electron Boilerplate</CardTitle>
          <CardDescription>
            A modern, production-ready Electron application template
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Version 1.0.0</Badge>
            <Badge variant="outline">MIT License</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            This boilerplate provides a solid foundation for building cross-platform desktop
            applications with React, TypeScript, and modern development tools.
          </p>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Resources</CardTitle>
          <CardDescription>Helpful links and documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {resources.map((resource) => (
              <div
                key={resource.title}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{resource.title}</p>
                  <p className="text-sm text-muted-foreground">{resource.description}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resource.url && handleOpenExternal(resource.url)}
                  disabled={!resource.url}
                >
                  {resource.action}
                  {resource.url && <ExternalLink className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dependencies */}
      <Card>
        <CardHeader>
          <CardTitle>Core Dependencies</CardTitle>
          <CardDescription>Major technologies used in this application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {dependencies.map((dep) => (
              <div key={dep.name} className="flex items-start gap-3 rounded-lg border p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{dep.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      v{dep.version}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{dep.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Details about your system and runtime</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform:</span>
              <span className="font-mono">{navigator.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">User Agent:</span>
              <span className="font-mono text-xs">{navigator.userAgent}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
