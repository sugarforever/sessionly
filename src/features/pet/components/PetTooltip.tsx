import type { PetState, PetStateInfo } from '@/../electron/shared/pet-types'

interface PetTooltipProps {
  state: PetStateInfo
}

const STATUS_LABELS: Record<PetState, string> = {
  idle: 'Sleeping...',
  working: 'Working...',
  completed: 'Done!',
  error: 'Uh oh!',
}

export function PetTooltip({ state }: PetTooltipProps): JSX.Element {
  const projectName = state.project
    ? state.project.split('/').filter(Boolean).pop() ?? 'Unknown'
    : null

  return (
    <div className="pet-tooltip">
      {projectName && (
        <div className="pet-tooltip-project">{projectName}</div>
      )}
      <div className="pet-tooltip-status">{STATUS_LABELS[state.state]}</div>
    </div>
  )
}
