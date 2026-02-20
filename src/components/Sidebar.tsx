import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { navigationItems } from '@/config/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PanelLeftClose, PanelLeft, Sun, Moon, Monitor } from 'lucide-react'
import { api } from '@/types/api'
import iconPng from '/icon.png'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { currentPage, navigateTo } = useNavigation()
  const { theme, setTheme } = useTheme()
  const [version, setVersion] = useState<string>('')

  useEffect(() => {
    api.getVersion().then(setVersion).catch(() => {})
  }, [])

  const cycleTheme = () => {
    const themes: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark']
    const currentIndex = themes.indexOf(theme)
    setTheme(themes[(currentIndex + 1) % themes.length])
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
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <img src={iconPng} alt="Sessionly" className="h-6 w-6 rounded-lg shrink-0" />
          {!collapsed && (
            <span className="text-sm font-semibold text-foreground truncate">Sessionly</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        <TooltipProvider delayDuration={0}>
          {navigationItems.map((item) => {
            const isActive = currentPage === item.id
            const Icon = item.icon
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigateTo(item.id)}
                    disabled={item.disabled}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer',
                      isActive
                        ? 'bg-accent text-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      item.disabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-1">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={cycleTheme}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              >
                <ThemeIcon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{themeLabel}</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">
                <p>{themeLabel} theme</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {!collapsed && version && (
          <div className="px-3 py-1">
            <span className="text-[10px] text-muted-foreground/50 font-mono">v{version}</span>
          </div>
        )}
      </div>
    </aside>
  )
}
