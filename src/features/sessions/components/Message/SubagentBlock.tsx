import { useState } from 'react'
import { ChevronDown, ChevronRight, Bot, User, Sparkles, Wrench } from 'lucide-react'
import type { SubagentSession, ProcessedMessage } from '@/../electron/shared/session-types'

interface SubagentBlockProps {
  subagent: SubagentSession
  defaultExpanded?: boolean
}

export function SubagentBlock({ subagent, defaultExpanded = false }: SubagentBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="mt-2 rounded-md border border-zinc-800/50 bg-zinc-950/50 overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/30 transition-colors duration-150 cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
        )}
        <Bot className="h-3.5 w-3.5 text-emerald-400/80 shrink-0" />
        <span className="text-xs font-medium text-zinc-500">
          Agent ({subagent.messageCount} messages)
        </span>
        {!expanded && subagent.messages[0]?.textContent && (
          <span className="ml-1 text-zinc-600 truncate text-[10px] flex-1 min-w-0">
            {subagent.messages[0].textContent.slice(0, 80)}...
          </span>
        )}
      </button>

      {/* Expanded: show messages */}
      {expanded && (
        <div className="border-t border-zinc-800/50 max-h-96 overflow-y-auto">
          <div className="space-y-1 p-2">
            {subagent.messages.map((msg) => (
              <SubagentMessage key={msg.uuid} message={msg} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Simplified message display for subagent conversations
 */
function SubagentMessage({ message }: { message: ProcessedMessage }) {
  const isUser = message.role === 'user'
  const hasTools = message.toolUseBlocks.length > 0

  return (
    <div className="rounded-md bg-zinc-900/50 p-2">
      {/* Header */}
      <div className="flex items-center gap-1.5 mb-1">
        {isUser ? (
          <User className="h-3 w-3 text-zinc-500" />
        ) : (
          <Sparkles className="h-3 w-3 text-amber-500/80" />
        )}
        <span className="text-[10px] font-medium text-zinc-500">
          {isUser ? 'Task' : 'Agent'}
        </span>
      </div>

      {/* Text content */}
      {message.textContent && (
        <p className="text-[11px] text-zinc-400 leading-relaxed whitespace-pre-wrap line-clamp-6">
          {message.textContent}
        </p>
      )}

      {/* Tool calls summary */}
      {hasTools && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {message.toolUseBlocks.map((tool) => (
            <span
              key={tool.id}
              className="inline-flex items-center gap-1 rounded bg-zinc-800/50 px-1.5 py-0.5 text-[10px] text-zinc-500"
            >
              <Wrench className="h-2.5 w-2.5" />
              {tool.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
