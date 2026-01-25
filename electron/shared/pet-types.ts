/**
 * Pet state and settings types for the floating session monitor pet
 */

export type PetState = 'idle' | 'working' | 'completed' | 'error'

export type PetCharacter = 'cat' | 'bunny' | 'puppy' | 'piggy'

export const PET_CHARACTER_NAMES: Record<PetCharacter, string> = {
  cat: 'Cat',
  bunny: 'Bunny',
  puppy: 'Puppy',
  piggy: 'Piggy',
}

export interface PetStateInfo {
  state: PetState
  sessionId: string | null
  project: string | null
  lastActivity: number
  message?: string
}

export interface PetSettings {
  enabled: boolean
  position: { x: number; y: number }
  size: 'small' | 'medium' | 'large'
  notificationsEnabled: boolean
  character: PetCharacter
}

export const DEFAULT_PET_SETTINGS: PetSettings = {
  enabled: true,
  position: { x: 100, y: 100 },
  size: 'medium',
  notificationsEnabled: true,
  character: 'cat',
}

export const PET_SIZE_PIXELS: Record<PetSettings['size'], number> = {
  small: 64,
  medium: 96,
  large: 128,
}
