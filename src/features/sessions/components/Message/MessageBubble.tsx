import { useMemo } from 'react'
import { format } from 'date-fns'
import { User, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ProcessedMessage, SubagentSession } from '@/../electron/shared/session-types'
import { ThinkingBlock } from './ThinkingBlock'
import { ToolCallBlock } from './ToolCallBlock'
import { CodeBlock } from './CodeBlock'

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

  // Markdown components for ReactMarkdown
  const markdownComponents = useMemo(
    () => ({
      code: ({
        className,
        children,
        ...props
      }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) => {
        const match = /language-(\w+)/.exec(className || '')
        const isInline = !match && !String(children).includes('\n')

        if (isInline) {
          return (
            <code
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
              {...props}
            >
              {children}
            </code>
          )
        }

        return <CodeBlock code={String(children).replace(/\n$/, '')} language={match?.[1]} />
      },
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className="leading-relaxed">{children}</p>
      ),
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="list-disc pl-4 space-y-1">{children}</ul>
      ),
      ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="list-decimal pl-4 space-y-1">{children}</ol>
      ),
      li: ({ children }: { children?: React.ReactNode }) => (
        <li className="leading-relaxed">{children}</li>
      ),
      a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
        <a
          href={href}
          className="text-blue-400 hover:text-blue-300 underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
      strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-semibold">{children}</strong>
      ),
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="text-base font-bold mt-3 mb-1">{children}</h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="text-sm font-bold mt-3 mb-1">{children}</h2>
      ),
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="text-xs font-bold mt-2 mb-1">{children}</h3>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="border-l-2 border-muted-foreground/30 pl-3 italic text-muted-foreground">
          {children}
        </blockquote>
      ),
      hr: () => <hr className="border-border my-3" />,
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className="overflow-x-auto my-2">
          <table className="min-w-full border-collapse border border-border text-xs">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }: { children?: React.ReactNode }) => (
        <thead className="bg-muted">{children}</thead>
      ),
      tbody: ({ children }: { children?: React.ReactNode }) => <tbody>{children}</tbody>,
      tr: ({ children }: { children?: React.ReactNode }) => (
        <tr className="border-b border-border">{children}</tr>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <th className="border border-border px-2 py-1.5 text-left font-semibold">{children}</th>
      ),
      td: ({ children }: { children?: React.ReactNode }) => (
        <td className="border border-border px-2 py-1.5">{children}</td>
      ),
    }),
    []
  )

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
            <div className="prose-sm text-xs leading-relaxed space-y-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {message.textContent}
              </ReactMarkdown>
            </div>
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
