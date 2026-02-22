import { cn } from '@/lib/utils'

interface AggregateBarProps {
  activeCount: number
  isQuiet: boolean
  totalProjects: number
}

export function AggregateBar({ activeCount, isQuiet, totalProjects }: AggregateBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            isQuiet
              ? 'bg-muted-foreground/40'
              : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]',
          )}
        />
        <span className="text-sm font-medium text-foreground">
          {isQuiet ? 'All quiet' : `${activeCount} active`}
        </span>
      </div>

      {totalProjects > 0 && (
        <span className="text-xs text-muted-foreground">
          {totalProjects} project{totalProjects !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}
