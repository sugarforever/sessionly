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
    <div className="rounded-md border border-zinc-800/50 bg-zinc-900/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/30 transition-colors duration-150 cursor-pointer"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
        )}
        <Brain className="h-3.5 w-3.5 text-violet-400/80 shrink-0" />
        <span className="text-xs font-medium text-zinc-500">Thinking</span>
        {!expanded && hasMore && (
          <span className="ml-1 text-zinc-600 truncate text-[10px] flex-1 min-w-0">
            {previewText}...
          </span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-zinc-800/50 px-3 py-2.5 bg-zinc-950/30">
          <pre className="whitespace-pre-wrap font-mono text-[11px] text-zinc-500 leading-relaxed">
            {block.thinking}
          </pre>
        </div>
      )}
    </div>
  )
}
