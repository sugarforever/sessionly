import type { PetState, PetStateInfo } from '@/../electron/shared/pet-types'

interface PetTooltipProps {
  state: PetStateInfo
  isVisible: boolean
}

const STATUS_LABELS: Record<PetState, string> = {
  idle: 'Zzz...',
  working: 'Working...',
  completed: 'Ready!',
  error: 'Error!',
}

const STATUS_ICONS: Record<PetState, string> = {
  idle: '💤',
  working: '⚡',
  completed: '✅',
  error: '❌',
}

export function PetTooltip({ state, isVisible }: PetTooltipProps): JSX.Element {
  return (
    <div className={`pet-speech-bubble pet-bubble-minimal ${isVisible ? 'visible' : ''}`}>
      {/* Minimal status: icon + brief text only */}
      <div className="pet-bubble-status">
        <span className="pet-bubble-status-icon">{STATUS_ICONS[state.state]}</span>
        <span>{STATUS_LABELS[state.state]}</span>
      </div>

      {/* Comic bubble tail */}
      <div className="pet-bubble-tail" />
    </div>
  )
}
