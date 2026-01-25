import type { PetState } from '@/../electron/shared/pet-types'

export interface CharacterProps {
  state: PetState
}

// Eye configuration helper for consistent eye behavior across characters
export function getEyeConfig(state: PetState): { pupilOffsetX: number; pupilRadiusY: number } {
  switch (state) {
    case 'working':
      return { pupilOffsetX: 1, pupilRadiusY: 3 }
    case 'idle':
      return { pupilOffsetX: 0, pupilRadiusY: 1 }
    case 'error':
      return { pupilOffsetX: 0, pupilRadiusY: 4 }
    case 'completed':
    default:
      return { pupilOffsetX: 0, pupilRadiusY: 3 }
  }
}
