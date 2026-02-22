import { useSessionMonitorContext } from '@/contexts/SessionMonitorContext'
import { AggregateBar } from './components/AggregateBar'
import { ProjectCard } from './components/ProjectCard'
import { EmptyState } from './components/EmptyState'

export function HomePage() {
  const { projects, aggregateActive, aggregateQuiet } = useSessionMonitorContext()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b px-6 py-4">
        <AggregateBar
          activeCount={aggregateActive}
          isQuiet={aggregateQuiet}
          totalProjects={projects.length}
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
            {projects.map((p) => (
              <ProjectCard key={p.project} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
