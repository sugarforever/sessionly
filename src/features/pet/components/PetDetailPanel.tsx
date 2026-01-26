import type { PetState, PetStateInfo } from '@/../electron/shared/pet-types'

interface PetDetailPanelProps {
  state: PetStateInfo
  isVisible: boolean
  onClose: () => void
}

const STATUS_LABELS: Record<PetState, string> = {
  idle: 'Idle - No active sessions',
  working: 'Working...',
  completed: 'Ready for input',
  error: 'Error occurred',
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
      {/* Backdrop to catch clicks outside - large invisible area */}
      <div className="pet-detail-backdrop" onClick={onClose} onMouseDown={handleMouseDown} />

      {/* Panel container - positioned absolutely relative to pet-sprite-wrapper */}
      <div className="pet-detail-panel-container" onMouseDown={handleMouseDown}>
        <div className="pet-detail-panel">
          {/* Close button */}
          <button className="pet-detail-close" onClick={onClose}>
            ×
          </button>

          {/* Header with status */}
          <div className="pet-detail-header">
            <span className="pet-detail-status-icon">{STATUS_ICONS[state.state]}</span>
            <span className="pet-detail-status-text">{STATUS_LABELS[state.state]}</span>
          </div>

          {/* Project info */}
          {projectName && (
            <div className="pet-detail-section">
              <div className="pet-detail-label">Project</div>
              <div className="pet-detail-value">
                <span className="pet-detail-icon">📁</span> {projectName}
              </div>
            </div>
          )}

          {/* Git branch */}
          {state.gitBranch && (
            <div className="pet-detail-section">
              <div className="pet-detail-label">Branch</div>
              <div className="pet-detail-value">
                <span className="pet-detail-icon">🌿</span> {state.gitBranch}
              </div>
            </div>
          )}

          {/* Current tool */}
          {state.state === 'working' && state.toolName && (
            <div className="pet-detail-section">
              <div className="pet-detail-label">Current Tool</div>
              <div className="pet-detail-value">
                <span className="pet-detail-icon">🔧</span> {state.toolName}
                {duration && <span className="pet-detail-duration">({duration})</span>}
              </div>
            </div>
          )}

          {/* Error message */}
          {state.state === 'error' && state.errorMessage && (
            <div className="pet-detail-section pet-detail-error">
              <div className="pet-detail-label">Error</div>
              <div className="pet-detail-value pet-detail-error-text">
                {state.errorMessage}
              </div>
            </div>
          )}

          {/* Active sessions count */}
          {state.activeSessionCount && state.activeSessionCount > 1 && (
            <div className="pet-detail-section">
              <div className="pet-detail-label">Sessions</div>
              <div className="pet-detail-value">
                <span className="pet-detail-icon">📊</span> {state.activeSessionCount} active
              </div>
            </div>
          )}

          {/* Hint */}
          <div className="pet-detail-hint">
            Click anywhere to close
          </div>
        </div>
      </div>
    </>
  )
}
