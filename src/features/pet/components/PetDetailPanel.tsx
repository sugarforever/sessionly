import type { PetState, PetStateInfo } from '@/../electron/shared/pet-types'

interface PetDetailPanelProps {
  state: PetStateInfo
  isVisible: boolean
  onClose: () => void
}

const STATUS_LABELS: Record<PetState, string> = {
  idle: 'Idle',
  working: 'Working...',
  completed: 'Ready',
  error: 'Error',
}

const STATUS_ICONS: Record<PetState, string> = {
  idle: '💤',
  working: '⚡',
  completed: '✅',
  error: '❌',
}

export function PetDetailPanel({ state, isVisible, onClose }: PetDetailPanelProps): JSX.Element {
  const projectName = state.project
    ? state.project.split('/').filter(Boolean).pop() ?? 'Unknown'
    : null

  // Format the working duration if we have lastActivity
  const getWorkingDuration = (): string | null => {
    if (state.state !== 'working' || !state.lastActivity) return null
    const elapsed = Date.now() - state.lastActivity
    const seconds = Math.floor(elapsed / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const duration = getWorkingDuration()

  // Stop mousedown propagation to prevent container's drag handling from interfering
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  if (!isVisible) return <></>

  return (
    <>
      {/* Backdrop to catch clicks outside */}
      <div className="pet-detail-backdrop" onClick={onClose} onMouseDown={handleMouseDown} />

      {/* Panel container */}
      <div className="pet-detail-panel-container" onMouseDown={handleMouseDown}>
        <div className="pet-detail-panel">
          {/* Status row */}
          <div className="pet-detail-row pet-detail-status">
            <span>{STATUS_ICONS[state.state]}</span>
            <span>{STATUS_LABELS[state.state]}</span>
          </div>

          {/* Project & branch row */}
          {(projectName || state.gitBranch) && (
            <div className="pet-detail-row pet-detail-context">
              {projectName && <span>📁 {projectName}</span>}
              {projectName && state.gitBranch && <span className="pet-detail-sep">·</span>}
              {state.gitBranch && <span>🌿 {state.gitBranch}</span>}
            </div>
          )}

          {/* Tool row - only when working */}
          {state.state === 'working' && state.toolName && (
            <div className="pet-detail-row pet-detail-tool">
              <span>🔧 {state.toolName}</span>
              {duration && <span className="pet-detail-duration">{duration}</span>}
            </div>
          )}

          {/* Error row */}
          {state.state === 'error' && state.errorMessage && (
            <div className="pet-detail-row pet-detail-error">
              {state.errorMessage}
            </div>
          )}

          {/* Sessions count - only when multiple */}
          {state.activeSessionCount && state.activeSessionCount > 1 && (
            <div className="pet-detail-row pet-detail-sessions">
              +{state.activeSessionCount - 1} more session{state.activeSessionCount > 2 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
