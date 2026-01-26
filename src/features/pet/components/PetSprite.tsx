import type { PetState, PetCharacter } from '@/../electron/shared/pet-types'
import { CatSprite, BunnySprite, PuppySprite, PiggySprite } from './characters'

interface PetSpriteProps {
  state: PetState
  character: PetCharacter
}

const CHARACTER_COMPONENTS: Record<PetCharacter, React.ComponentType<{ state: PetState }>> = {
  cat: CatSprite,
  bunny: BunnySprite,
  puppy: PuppySprite,
  piggy: PiggySprite,
}

export function PetSprite({ state, character }: PetSpriteProps): JSX.Element {
  const CharacterComponent = CHARACTER_COMPONENTS[character] ?? CatSprite
  return <CharacterComponent state={state} />
}
