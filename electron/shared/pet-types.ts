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
  // Enhanced context for tooltip
  gitBranch?: string | null
  toolName?: string | null
  errorMessage?: string | null
  activeSessionCount?: number
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
  position: { x: -1, y: -1 }, // Sentinel value - will be calculated to bottom-right
  size: 'medium',
  notificationsEnabled: true,
  character: 'cat',
}

export const PET_SIZE_PIXELS: Record<PetSettings['size'], number> = {
  small: 64,
  medium: 96,
  large: 128,
}

// Detail panel dimensions (positioned to side of pet)
export const PET_PANEL_WIDTH = 220
export const PET_PANEL_GAP = 8
export const PET_PANEL_HEIGHT = 250 // Approximate max height of detail panel

// Window needs to fit pet + panel side by side
// Height must accommodate the panel which is taller than the pet
export const PET_WINDOW_PADDING = 16
