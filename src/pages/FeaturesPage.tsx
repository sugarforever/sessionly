import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'

const features = [
  {
    category: 'Frontend',
    items: [
      { name: 'React 18', description: 'Modern React with hooks and concurrent features' },
      { name: 'TypeScript', description: 'Full type safety across the application' },
      { name: 'Vite', description: 'Lightning-fast HMR and build times' },
      { name: 'Tailwind CSS', description: 'Utility-first CSS framework' },
      { name: 'shadcn/ui', description: 'Beautiful, accessible UI components' },
    ],
  },
  {
    category: 'State Management',
    items: [
      { name: 'Redux Toolkit', description: 'Efficient, type-safe global state' },
      { name: 'React Hooks', description: 'Local component state management' },
    ],
  },
  {
    category: 'Desktop Features',
    items: [
      { name: 'System Tray', description: 'Minimize to tray with context menu' },
      { name: 'Window State', description: 'Automatic window size/position persistence' },
      {
        name: 'Native Notifications',
        description: 'OS-native notification support',
      },
      { name: 'Type-Safe IPC', description: 'Secure main-renderer communication' },
    ],
  },
  {
    category: 'Data & Database',
    items: [
      { name: 'Prisma ORM', description: 'Type-safe database access' },
      { name: 'better-sqlite3', description: 'Fast, synchronous SQLite driver' },
    ],
  },
  {
    category: 'Developer Experience',
    items: [
      { name: 'Hot Reload', description: 'Both main and renderer process HMR' },
      { name: 'ESLint + Prettier', description: 'Code quality and formatting' },
      { name: 'Vitest', description: 'Fast unit testing framework' },
      { name: 'TypeScript', description: 'Full IDE autocomplete and type checking' },
    ],
  },
]

export function FeaturesPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Features</h1>
        <p className="text-lg text-muted-foreground">
          Everything you need to build production-ready desktop applications
        </p>
      </div>

      {/* Tech Stack Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Technology Stack</CardTitle>
          <CardDescription>Modern, battle-tested technologies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[
              'Electron',
              'React 18',
              'TypeScript',
              'Vite',
              'Redux Toolkit',
              'Tailwind CSS',
              'shadcn/ui',
              'Radix UI',
              'Prisma',
              'better-sqlite3',
              'Vitest',
            ].map((tech) => (
              <Badge key={tech} variant="outline">
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Categories */}
      <div className="grid gap-6 md:grid-cols-2">
        {features.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle>{category.category}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {category.items.map((item) => (
                  <li key={item.name} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
