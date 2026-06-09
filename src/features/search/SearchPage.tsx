import { useEffect, useState } from 'react'
import { Search as SearchIcon, Loader2 } from 'lucide-react'
import { useSearch } from './useSearch'
import { SearchResultList } from './SearchResultList'
import { useNavigation } from '@/contexts/NavigationContext'
import { useAppDispatch } from '@/store/hooks'
import { selectSession } from '@/store/slices/sessionsSlice'
import { api } from '@/types/api'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SearchHit } from '@/types/search'

const ALL_PROJECTS = '__all__'

export function SearchPage() {
  const { query, results, loading, status, search } = useSearch()
  const [input, setInput] = useState('')
  const [projects, setProjects] = useState<{ project: string; projectEncoded: string }[]>([])
  const [project, setProject] = useState<string>(ALL_PROJECTS)
  const { navigateTo } = useNavigation()
  const dispatch = useAppDispatch()

  // Refresh the index when Search opens so newly-finished sessions are
  // searchable. It is hash-skipped and single-flighted, so this is cheap when
  // nothing changed. Also load the project list for the filter.
  useEffect(() => {
    api.searchReindex().catch(() => {})
    api
      .sessionsGetAll()
      .then((groups) =>
        setProjects(groups.map((g) => ({ project: g.project, projectEncoded: g.projectEncoded })))
      )
      .catch(() => {})
  }, [])

  const filters = project === ALL_PROJECTS ? undefined : { projectEncoded: project }

  const onProjectChange = (next: string) => {
    setProject(next)
    search(input, next === ALL_PROJECTS ? undefined : { projectEncoded: next })
  }

  const pick = (hit: SearchHit) => {
    dispatch(
      selectSession({
        sessionId: hit.sessionId,
        projectEncoded: hit.projectEncoded,
        messageUuid: hit.messageUuid,
      })
    )
    navigateTo('history')
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 transition-colors focus-within:border-primary/50">
          <SearchIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              search(e.target.value, filters)
            }}
            placeholder="Find a message, file path, or command across your sessions…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="h-12 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {projects.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="shrink-0">Scope</span>
            <Select value={project} onValueChange={onProjectChange}>
              <SelectTrigger className="h-9 w-auto min-w-[12rem] gap-2 border-border bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PROJECTS}>All projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.projectEncoded} value={p.projectEncoded}>
                    {p.project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {status?.building && status.enabled && (
          <p className="text-xs text-muted-foreground">
            Indexing with {status.model}… {status.indexed}/{status.total}
          </p>
        )}
        {status && !status.enabled ? (
          <p className="text-sm text-muted-foreground">Search is off — enable it in Settings.</p>
        ) : (
          <>
            {query.trim() && !loading && (
              <p className="text-xs text-muted-foreground">
                {results.length} result{results.length !== 1 ? 's' : ''}
              </p>
            )}
            <SearchResultList results={results} query={query} onPick={pick} variant="card" />
          </>
        )}
      </div>
    </div>
  )
}
