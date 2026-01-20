import { useState } from 'react'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'
import type { ThinkingBlock as ThinkingBlockType } from '@/../electron/shared/session-types'

interface ThinkingBlockProps {
  block: ThinkingBlockType
  defaultExpanded?: boolean
}

export function ThinkingBlock({ block, defaultExpanded = false }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const previewText = block.thinking.slice(0, 100).replace(/\n/g, ' ')
  const hasMore = block.thinking.length > 100

  return (
    <div className="rounded-md border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors duration-150 cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        )}
        <Brain className="h-3.5 w-3.5 text-violet-500 shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">Thinking</span>
        {!expanded && hasMore && (
          <span className="ml-1 text-muted-foreground/60 truncate text-[10px] flex-1 min-w-0">
            {previewText}...
          </span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-border px-3 py-2.5 bg-secondary">
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground leading-relaxed">
            {block.thinking}
          </pre>
        </div>
      )}
    </div>
  )
}
