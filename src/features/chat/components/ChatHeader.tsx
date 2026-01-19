/**
 * Chat header component
 */

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ChatHeaderProps {
  onClear: () => void
  messageCount: number
}

export function ChatHeader({ onClear, messageCount }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold">AI Chat</h2>
        <p className="text-xs text-muted-foreground">
          {messageCount === 0
            ? 'Start a conversation'
            : `${messageCount} message${messageCount === 1 ? '' : 's'}`}
        </p>
      </div>
      {messageCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                className="h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear conversation</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
