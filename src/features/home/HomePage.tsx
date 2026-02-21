import { useSessionMonitorContext } from '@/contexts/SessionMonitorContext'
import { AggregateBar } from './components/AggregateBar'
import { ProjectCard } from './components/ProjectCard'
import { EmptyState } from './components/EmptyState'

export function HomePage() {
  const { projects, aggregateActive, aggregateQuiet } = useSessionMonitorContext()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Status header */}
      <div className="shrink-0 border-b px-5 py-3">
        <AggregateBar
          activeCount={aggregateActive}
          isQuiet={aggregateQuiet}
          totalProjects={projects.length}
        />
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {projects.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="p-2 space-y-0.5">
            {projects.map((p) => (
              <ProjectCard key={p.project} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
