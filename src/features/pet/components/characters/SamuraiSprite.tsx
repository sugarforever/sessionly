import type { PetState } from '@/../electron/shared/pet-types'
import { SpriteSheetRenderer } from '../SpriteSheetRenderer'
import type { CustomSprite } from '@/../electron/shared/pet-types'

/**
 * Built-in pixel art samurai character using sprite sheet animation
 *
 * Sprite sheet: 8 columns × 4 rows
 * - Row 0: Idle poses
 * - Row 1: Sword action poses (working)
 * - Row 2: Celebration poses (completed)
 * - Row 3: Defeated poses (error)
 */
const SAMURAI_SPRITE: CustomSprite = {
  id: 'builtin-samurai',
  name: 'Samurai',
  imagePath: '/sprites/samurai.png',
  cols: 8,
  rows: 4,
  frameWidth: 364, // 2912 / 8
  frameHeight: 360, // 1440 / 4
  stateMapping: {
    idle: 0,
    working: 1,
    completed: 2,
    error: 3,
  },
  framesPerState: 8,
  frameRate: 200, // Slightly slower for pixel art feel
}

interface SamuraiSpriteProps {
  state: PetState
  size?: number
  paused?: boolean
}

export function SamuraiSprite({
  state,
  size = 96,
  paused = false,
}: SamuraiSpriteProps): JSX.Element {
  return (
    <SpriteSheetRenderer
      sprite={SAMURAI_SPRITE}
      state={state}
      size={size}
      paused={paused}
    />
  )
}
