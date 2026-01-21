import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { navigationItems } from '@/config/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PanelLeftClose, PanelLeft, Sun, Moon, Monitor } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { currentPage, navigateTo } = useNavigation()
  const { theme, setTheme } = useTheme()
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    async function fetchVersion() {
      const response = await window.electron.getVersion()
      if (response.success && response.data) {
        setVersion(response.data)
      }
    }
    fetchVersion()
  }, [])

  const cycleTheme = () => {
    const themes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  const ThemeIcon = theme === 'system' ? Monitor : theme === 'light' ? Sun : Moon
  const themeLabel = theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark'

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-border bg-card transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Header with toggle */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="Sessionly" className="h-6 w-6 rounded" />
            <span className="text-sm font-semibold text-foreground truncate">Sessionly</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            'h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2">
        <TooltipProvider delayDuration={0}>
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <div key={item.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full transition-colors duration-150',
                        collapsed ? 'justify-center px-2' : 'justify-start px-3',
                        currentPage === item.id
                          ? 'bg-accent text-accent-foreground hover:bg-accent'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                        item.disabled && 'cursor-not-allowed opacity-50'
                      )}
                      onClick={() => !item.disabled && navigateTo(item.id)}
                      disabled={item.disabled}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', !collapsed && 'mr-3')} />
                      {!collapsed && <span className="truncate text-sm">{item.label}</span>}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent
                      side="right"
                      className="bg-popover text-popover-foreground border-border"
                    >
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </nav>

      {/* Footer - Theme toggle & Version */}
      <div className="border-t border-border p-2">
        <TooltipProvider delayDuration={0}>
          <div
            className={cn(
              'flex items-center',
              collapsed ? 'justify-center' : 'justify-between px-1'
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={cycleTheme}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent"
                >
                  <ThemeIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side={collapsed ? 'right' : 'top'}
                className="bg-popover text-popover-foreground border-border"
              >
                <p>Theme: {themeLabel}</p>
              </TooltipContent>
            </Tooltip>
            {!collapsed && (
              <span className="text-xs text-muted-foreground font-mono">v{version || '1.0.0'}</span>
            )}
          </div>
        </TooltipProvider>
      </div>
    </aside>
  )
}
