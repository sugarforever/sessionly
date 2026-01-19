import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { navigationItems } from '@/config/navigation'
import { useNavigation } from '@/contexts/NavigationContext'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PanelLeftClose, PanelLeft } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { currentPage, navigateTo } = useNavigation()
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

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-zinc-800/50 bg-[#0f0f0f] transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Header with toggle */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-800/50 px-3">
        {!collapsed && (
          <span className="text-sm font-semibold text-zinc-200 truncate">Claude Sessions</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            'h-8 w-8 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
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
                          ? 'bg-zinc-800 text-zinc-100 hover:bg-zinc-800'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50',
                        item.disabled && 'cursor-not-allowed opacity-50'
                      )}
                      onClick={() => !item.disabled && navigateTo(item.id)}
                      disabled={item.disabled}
                    >
                      <item.icon className={cn('h-4 w-4 shrink-0', !collapsed && 'mr-3')} />
                      {!collapsed && (
                        <span className="truncate text-sm">{item.label}</span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {collapsed && (
                    <TooltipContent side="right" className="bg-zinc-800 text-zinc-200 border-zinc-700">
                      <p>{item.label}</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </nav>

      {/* Footer - Version */}
      <div className="border-t border-zinc-800/50 p-3">
        <div className={cn('text-xs text-zinc-600', collapsed && 'text-center')}>
          <p className="font-mono">{collapsed ? `v${version.split('.')[0] || '1'}` : `v${version || '1.0.0'}`}</p>
        </div>
      </div>
    </aside>
  )
}
