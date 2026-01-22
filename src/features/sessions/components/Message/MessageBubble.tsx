import { useMemo } from 'react'
import { format } from 'date-fns'
import { User, Sparkles } from 'lucide-react'
import type { ProcessedMessage, SubagentSession } from '@/../electron/shared/session-types'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolCallBlock } from './ToolCallBlock'
import { CodeBlock } from './CodeBlock'

// Hoisted to module scope to avoid recreation on each render (js-hoist-regexp)
const CODE_BLOCK_REGEX = /```(\w*)\n([\s\S]*?)```/g

interface MessageBubbleProps {
  message: ProcessedMessage
  subagents?: Record<string, SubagentSession>
  showTimestamp?: boolean
}

export function MessageBubble({ message, subagents, showTimestamp = true }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const formattedTime = useMemo(() => {
    try {
      return format(new Date(message.timestamp), 'HH:mm')
    } catch {
      return ''
    }
  }, [message.timestamp])

  // Parse text content for code blocks
  const renderedContent = useMemo(() => {
    if (!message.textContent) return null

    // Reset regex lastIndex since global regexes maintain state
    CODE_BLOCK_REGEX.lastIndex = 0
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = []
    let lastIndex = 0
    let match

    while ((match = CODE_BLOCK_REGEX.exec(message.textContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: message.textContent.slice(lastIndex, match.index),
        })
      }
      parts.push({
        type: 'code',
        content: match[2],
        language: match[1] || undefined,
      })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < message.textContent.length) {
      parts.push({
        type: 'text',
        content: message.textContent.slice(lastIndex),
      })
    }

    return parts.map((part, i) => {
      if (part.type === 'code') {
        return <CodeBlock key={i} code={part.content} language={part.language} />
      }
      return (
        <p key={i} className="whitespace-pre-wrap leading-relaxed">
          {part.content}
        </p>
      )
    })
  }, [message.textContent])

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-secondary' : 'bg-gradient-to-br from-orange-500 to-amber-600'
        }`}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-white" />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 space-y-2 ${isUser ? 'items-end' : ''}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-xs font-medium text-muted-foreground">
            {isUser ? 'You' : 'Claude'}
          </span>
          {showTimestamp && formattedTime && (
            <span className="text-[10px] text-muted-foreground/50 tabular-nums">
              {formattedTime}
            </span>
          )}
          {message.model && !isUser && (
            <span className="text-[10px] text-muted-foreground/50 font-mono">{message.model}</span>
          )}
        </div>

        {/* Thinking Blocks */}
        {message.thinkingBlocks.map((block, i) => (
          <ThinkingBlock key={`thinking-${i}`} block={block} />
        ))}

        {/* Text Content */}
        {message.textContent && (
          <div
            className={`rounded-lg px-3.5 py-2.5 ${
              isUser
                ? 'bg-secondary text-foreground'
                : 'bg-card border border-border text-foreground'
            }`}
          >
            <div className="space-y-3 text-xs leading-relaxed">{renderedContent}</div>
          </div>
        )}

        {/* Tool Calls */}
        {message.toolUseBlocks.map((toolUse) => (
          <ToolCallBlock
            key={toolUse.id}
            toolUse={toolUse}
            toolResult={message.toolResults[toolUse.id]}
            subagent={toolUse.agentId ? subagents?.[toolUse.agentId] : undefined}
          />
        ))}
      </div>
    </div>
  )
}
