import type { PetState, PetCharacter, CustomSprite } from '@/../electron/shared/pet-types'
import { CatSprite, BunnySprite, PuppySprite, PiggySprite, SamuraiSprite } from './characters'
import { SpriteSheetRenderer } from './SpriteSheetRenderer'

interface PetSpriteProps {
  state: PetState
  character: PetCharacter
  customSprite?: CustomSprite
  size?: number
  paused?: boolean
}

// SVG-based characters (simple state prop only)
type SvgCharacter = 'cat' | 'bunny' | 'puppy' | 'piggy'
const SVG_CHARACTER_COMPONENTS: Record<SvgCharacter, React.ComponentType<{ state: PetState }>> = {
  cat: CatSprite,
  bunny: BunnySprite,
  puppy: PuppySprite,
  piggy: PiggySprite,
}

export function PetSprite({
  state,
  character,
  customSprite,
  size = 96,
  paused = false,
}: PetSpriteProps): JSX.Element {
  // Custom sprite sheet rendering
  if (character === 'custom' && customSprite) {
    return (
      <SpriteSheetRenderer sprite={customSprite} state={state} size={size} paused={paused} />
    )
  }

  // Built-in sprite sheet character (samurai)
  if (character === 'samurai') {
    return <SamuraiSprite state={state} size={size} paused={paused} />
  }

  // Built-in SVG character rendering
  const svgCharacter = character as SvgCharacter
  const CharacterComponent = SVG_CHARACTER_COMPONENTS[svgCharacter] ?? CatSprite
  return <CharacterComponent state={state} />
}
