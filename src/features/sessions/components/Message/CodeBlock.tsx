import { useEffect, useRef, useState } from 'react'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
}

export function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (codeRef.current) {
      // Remove any previous highlighting
      codeRef.current.removeAttribute('data-highlighted')
      hljs.highlightElement(codeRef.current)
    }
  }, [code, language])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Try to detect language if not provided
  const detectedLanguage = language || (filename ? getLanguageFromFilename(filename) : undefined)

  return (
    <div className="group relative rounded-md border border-border bg-secondary overflow-hidden">
      {filename && (
        <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-1.5">
          <span className="font-mono text-[10px] text-muted-foreground">{filename}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
          </Button>
        </div>
      )}
      {!filename && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1.5 top-1.5 h-5 w-5 p-0 text-muted-foreground hover:text-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
        </Button>
      )}
      <div className="overflow-x-auto scrollbar-thin">
        <pre className="p-3 text-[11px]">
          <code ref={codeRef} className={detectedLanguage ? `language-${detectedLanguage}` : ''}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  )
}

function getLanguageFromFilename(filename: string): string | undefined {
  const ext = filename.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    md: 'markdown',
    toml: 'toml',
    dockerfile: 'dockerfile',
  }
  return ext ? langMap[ext] : undefined
}
