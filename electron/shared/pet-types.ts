/**
 * Pet state and settings types for the floating session monitor pet
 */

export type PetState = 'idle' | 'working' | 'completed' | 'error'

export type BuiltInCharacter = 'cat' | 'bunny' | 'puppy' | 'piggy' | 'samurai'
export type PetCharacter = BuiltInCharacter | 'custom'

export const PET_CHARACTER_NAMES: Record<BuiltInCharacter, string> = {
  cat: 'Cat',
  bunny: 'Bunny',
  puppy: 'Puppy',
  piggy: 'Piggy',
  samurai: 'Samurai',
}

/**
 * Custom sprite sheet configuration
 * Compatible with Confirmo sprite format (8x7 grid)
 */
export interface CustomSprite {
  id: string
  name: string
  imagePath: string // Path to sprite sheet image file
  cols: number // Grid columns (default: 8)
  rows: number // Grid rows (default: 7)
  frameWidth: number // Pixel width per frame
  frameHeight: number // Pixel height per frame
  stateMapping: {
    // Which row corresponds to each state
    idle: number
    working: number
    completed: number
    error: number
  }
  framesPerState: number // How many frames to cycle through per state
  frameRate: number // Milliseconds per frame
}

/**
 * Default sprite configuration matching Confirmo format
 */
export const DEFAULT_SPRITE_CONFIG: Omit<CustomSprite, 'id' | 'name' | 'imagePath'> = {
  cols: 8,
  rows: 7,
  frameWidth: 64,
  frameHeight: 64,
  stateMapping: {
    idle: 0,
    working: 1,
    completed: 2,
    error: 3,
  },
  framesPerState: 8,
  frameRate: 150,
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
  customSprite?: CustomSprite // Only used when character === 'custom'
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
export const PET_PANEL_WIDTH = 250 // Max expected width for auto-sizing panel
export const PET_PANEL_GAP = 8
export const PET_PANEL_HEIGHT = 120 // Compact panel max height

// Window needs to fit pet + panel side by side
export const PET_WINDOW_PADDING = 16
