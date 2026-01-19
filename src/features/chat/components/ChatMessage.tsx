/**
 * Chat message component
 */

import { Bot, User } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '../types'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3 px-4 py-3',
        isUser ? 'bg-transparent' : 'bg-muted/30'
      )}
    >
      <div className={cn(
        'flex h-7 w-7 shrink-0 select-none items-center justify-center rounded-md',
        isUser
          ? 'bg-foreground text-background'
          : 'bg-muted border border-border'
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-hidden">
        <p className="text-sm font-medium leading-none">
          {isUser ? 'You' : 'Assistant'}
        </p>
        <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap break-words">
          {message.content || (
            <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse rounded-sm" />
          )}
        </div>
      </div>
    </div>
  )
}
