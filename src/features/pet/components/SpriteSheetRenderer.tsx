import type { PetState, CustomSprite } from '@/../electron/shared/pet-types'
import { useSpriteAnimation } from '../hooks/useSpriteAnimation'

interface SpriteSheetRendererProps {
  sprite: CustomSprite
  state: PetState
  size: number
  paused?: boolean
}

/**
 * Renders a custom sprite sheet character with frame-based animation
 *
 * Uses CSS background-position to cycle through sprite sheet frames,
 * compatible with Confirmo sprite format (8x7 grid).
 */
export function SpriteSheetRenderer({
  sprite,
  state,
  size,
  paused = false,
}: SpriteSheetRendererProps): JSX.Element {
  const { backgroundPosition, backgroundSize } = useSpriteAnimation({
    sprite,
    state,
    paused,
  })

  // Scale factor to fit the sprite frame into the desired size
  const scale = size / sprite.frameWidth

  return (
    <div
      className="sprite-sheet-wrapper"
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
      }}
    >
      <div
        className="sprite-sheet-character"
        style={{
          width: sprite.frameWidth,
          height: sprite.frameHeight,
          backgroundImage: `url("${sprite.imagePath}")`,
          backgroundPosition,
          backgroundSize,
          backgroundRepeat: 'no-repeat',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        role="img"
        aria-label={`${sprite.name} - ${state}`}
      />
    </div>
  )
}
