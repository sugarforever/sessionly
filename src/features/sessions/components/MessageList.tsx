import { useRef, useEffect } from 'react'
import { MessageSquareOff } from 'lucide-react'
import type { ProcessedMessage, SubagentSession } from '@/../electron/shared/session-types'
import { MessageBubble } from './Message/MessageBubble'

interface MessageListProps {
  messages: ProcessedMessage[]
  subagents?: Record<string, SubagentSession>
  scrollToBottom?: boolean
}

export function MessageList({ messages, subagents, scrollToBottom = false }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change (if enabled)
  useEffect(() => {
    if (scrollToBottom && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages, scrollToBottom])

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center">
          <MessageSquareOff className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs text-muted-foreground">No messages in this session</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto bg-background scrollbar-thin">
      <div className="space-y-4 max-w-4xl mx-auto px-6 py-6">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.uuid}
            message={message}
            subagents={subagents}
            showTimestamp={
              // Show timestamp if first message or different from previous
              index === 0 ||
              new Date(message.timestamp).getTime() -
                new Date(messages[index - 1].timestamp).getTime() >
                60000
            }
          />
        ))}
      </div>
    </div>
  )
}
