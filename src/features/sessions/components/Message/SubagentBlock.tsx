import { useState } from 'react'
import { ChevronDown, ChevronRight, Bot, User, Sparkles, Wrench } from 'lucide-react'
import type { SubagentSession, ProcessedMessage } from '@/types/session-types'

interface SubagentBlockProps {
  subagent: SubagentSession
  defaultExpanded?: boolean
}

export function SubagentBlock({ subagent, defaultExpanded = false }: SubagentBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="mt-2 rounded-md border border-border bg-secondary overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors duration-150 cursor-pointer"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />}
        <Bot className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">Agent ({subagent.messageCount} messages)</span>
        {!expanded && subagent.messages[0]?.textContent && (
          <span className="ml-1 text-muted-foreground/60 truncate text-[10px] flex-1 min-w-0">{subagent.messages[0].textContent.slice(0, 80)}...</span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-border max-h-96 overflow-y-auto">
          <div className="space-y-1 p-2">
            {subagent.messages.map((msg) => <SubagentMessage key={msg.uuid} message={msg} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function SubagentMessage({ message }: { message: ProcessedMessage }) {
  const isUser = message.role === 'user'
  const hasTools = message.toolUseBlocks.length > 0

  return (
    <div className="rounded-md bg-card p-2">
      <div className="flex items-center gap-1.5 mb-1">
        {isUser ? <User className="h-3 w-3 text-muted-foreground" /> : <Sparkles className="h-3 w-3 text-amber-500" />}
        <span className="text-[10px] font-medium text-muted-foreground">{isUser ? 'Task' : 'Agent'}</span>
      </div>
      {message.textContent && (
        <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">{message.textContent}</p>
      )}
      {hasTools && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {message.toolUseBlocks.map((tool) => (
            <span key={tool.id} className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Wrench className="h-2.5 w-2.5" />{tool.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
