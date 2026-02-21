import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { navigationItems } from '@/config/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { useTheme } from '@/contexts/ThemeContext'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Sun, Moon, Monitor } from 'lucide-react'
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
        'flex h-screen flex-col border-r border-border/60 bg-card transition-[width] duration-200 ease-out',
        collapsed ? 'w-[52px]' : 'w-52',
      )}
    >
      {/* Branding */}
      <button
        onClick={onToggle}
        className={cn(
          'flex shrink-0 items-center gap-2.5 transition-all duration-200 cursor-pointer',
          'hover:bg-accent/60 active:bg-accent',
          collapsed ? 'justify-center px-0 py-4' : 'px-4 py-4',
        )}
      >
        <img
          src={iconPng}
          alt="Sessionly"
          className="h-6 w-6 shrink-0 rounded-[6px]"
        />
        <span
          className={cn(
            'text-[13px] font-semibold tracking-tight text-foreground transition-opacity duration-200',
            collapsed ? 'sr-only' : 'opacity-100',
          )}
        >
          Sessionly
        </span>
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-2 pt-1">
        <TooltipProvider delayDuration={300}>
          {navigationItems.map((item) => {
            const isActive = currentPage === item.id
            const Icon = item.icon

            return (
              <div key={item.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => navigateTo(item.id)}
                      disabled={item.disabled}
                      className={cn(
                        'relative flex w-full items-center gap-2.5 rounded-md py-1.5 text-[13px] transition-colors duration-150 cursor-pointer',
                        collapsed ? 'justify-center px-0' : 'px-2.5',
                        isActive
                          ? 'bg-accent text-foreground font-medium'
                          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                        item.disabled && 'pointer-events-none opacity-40',
                      )}
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        strokeWidth={isActive ? 2.25 : 1.75}
                      />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" sideOffset={8}>
                      {item.label}
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Divider after item */}
                {item.divider && (
                  <div className="my-2 mx-2 border-t border-border/50" />
                )}
              </div>
            )
          })}
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 pt-1">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={cycleTheme}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md py-1.5 text-[13px] text-muted-foreground transition-colors duration-150 cursor-pointer',
                  'hover:bg-accent/60 hover:text-foreground',
                  collapsed ? 'justify-center px-0' : 'px-2.5',
                )}
              >
                <ThemeIcon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="truncate">{themeLabel}</span>}
              </button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={8}>
                {themeLabel} theme
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
        {!collapsed && version && (
          <div className="mt-1 px-2.5">
            <span className="text-[10px] tabular-nums text-muted-foreground/40">
              v{version}
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}
