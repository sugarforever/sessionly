import { cn } from '@/lib/utils'
import { navigationItems } from '@/config/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

export function Sidebar() {
  const { currentPage, navigateTo } = useNavigation()

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* App Title */}
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-lg font-semibold">Electron App</h1>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1 p-4">
        <TooltipProvider delayDuration={300}>
          {navigationItems.map((item, index) => (
            <div key={item.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentPage === item.id ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start',
                      currentPage === item.id && 'bg-secondary font-medium',
                      item.disabled && 'cursor-not-allowed opacity-50'
                    )}
                    onClick={() => !item.disabled && navigateTo(item.id)}
                    disabled={item.disabled}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
              {item.divider && index < navigationItems.length - 1 && (
                <div className="my-2 border-t" />
              )}
            </div>
          ))}
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <p className="font-mono">v1.0.0</p>
        </div>
      </div>
    </aside>
  )
}
