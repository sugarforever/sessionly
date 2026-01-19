import { useState } from 'react'
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react'
import type { ToolUseBlock, ToolResultBlock, SubagentSession } from '@/../electron/shared/session-types'
import { CodeBlock } from './CodeBlock'
import { SubagentBlock } from './SubagentBlock'

interface ToolCallBlockProps {
  toolUse: ToolUseBlock
  toolResult?: ToolResultBlock
  subagent?: SubagentSession
  defaultExpanded?: boolean
}

export function ToolCallBlock({
  toolUse,
  toolResult,
  subagent,
  defaultExpanded = false,
}: ToolCallBlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const getToolDisplayName = (name: string) => {
    // Convert tool names to human-readable format
    const nameMap: Record<string, string> = {
      Read: 'Read File',
      Write: 'Write File',
      Edit: 'Edit File',
      Bash: 'Run Command',
      Glob: 'Search Files',
      Grep: 'Search Content',
      Task: 'Launch Agent',
      WebFetch: 'Fetch URL',
      WebSearch: 'Web Search',
      TodoWrite: 'Update Todos',
    }
    return nameMap[name] || name
  }

  const getToolInputPreview = () => {
    const input = toolUse.input
    if (input.file_path) return input.file_path as string
    if (input.command) return (input.command as string).slice(0, 50)
    if (input.pattern) return input.pattern as string
    if (input.url) return input.url as string
    if (input.query) return input.query as string
    return null
  }

  const preview = getToolInputPreview()

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
        <Wrench className="h-3.5 w-3.5 text-sky-400/80 shrink-0" />
        <span className="text-xs font-medium text-zinc-500">{getToolDisplayName(toolUse.name)}</span>
        {preview && !expanded && (
          <span className="ml-1 font-mono text-[10px] text-zinc-600 truncate flex-1 min-w-0">
            {preview}
          </span>
        )}
        {toolResult?.is_error && (
          <span className="ml-auto text-[10px] font-medium text-red-400/80">Error</span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-zinc-800/50">
          {/* Tool Input */}
          <div className="px-3 py-2.5">
            <div className="mb-1.5 text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
              Input
            </div>
            <CodeBlock code={JSON.stringify(toolUse.input, null, 2)} language="json" />
          </div>

          {/* Tool Result */}
          {toolResult && (
            <div className="border-t border-zinc-800/50 px-3 py-2.5">
              <div className="mb-1.5 text-[10px] font-medium text-zinc-600 uppercase tracking-wide">
                {toolResult.is_error ? 'Error' : 'Output'}
              </div>
              <div
                className={`rounded-md p-2.5 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto ${
                  toolResult.is_error
                    ? 'bg-red-950/30 text-red-300/80 border border-red-900/30'
                    : 'bg-zinc-950/50 text-zinc-400 border border-zinc-800/50'
                }`}
              >
                {typeof toolResult.content === 'string'
                  ? toolResult.content.slice(0, 2000)
                  : toolResult.content.map((c, i) => (
                      <span key={i}>{c.type === 'text' ? c.text : '[image]'}</span>
                    ))}
                {typeof toolResult.content === 'string' && toolResult.content.length > 2000 && (
                  <span className="text-zinc-600">... (truncated)</span>
                )}
              </div>
            </div>
          )}

          {/* Subagent Inline Display */}
          {subagent && (
            <div className="border-t border-zinc-800/50 px-3 py-2.5">
              <SubagentBlock subagent={subagent} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
