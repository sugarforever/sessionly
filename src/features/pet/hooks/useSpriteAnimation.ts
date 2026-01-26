import { useState, useEffect } from 'react'
import type { PetState, CustomSprite } from '@/../electron/shared/pet-types'

interface UseSpriteAnimationOptions {
  sprite: CustomSprite
  state: PetState
  paused?: boolean
}

interface SpriteAnimationResult {
  frame: number
  row: number
  backgroundPosition: string
  backgroundSize: string
}

/**
 * Hook for managing sprite sheet animation frame cycling
 *
 * @param options - Sprite configuration and current state
 * @returns Current frame info and CSS background properties
 */
export function useSpriteAnimation({
  sprite,
  state,
  paused = false,
}: UseSpriteAnimationOptions): SpriteAnimationResult {
  const [frame, setFrame] = useState(0)

  // Get the row for the current state
  const row = sprite.stateMapping[state]

  // Reset frame when state changes
  useEffect(() => {
    setFrame(0)
  }, [state])

  // Frame cycling effect
  useEffect(() => {
    if (paused) return

    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % sprite.framesPerState)
    }, sprite.frameRate)

    return () => clearInterval(interval)
  }, [sprite.framesPerState, sprite.frameRate, paused])

  // Calculate background position (negative values for CSS)
  const bgX = -frame * sprite.frameWidth
  const bgY = -row * sprite.frameHeight

  // Calculate background size for proper scaling
  const totalWidth = sprite.cols * sprite.frameWidth
  const totalHeight = sprite.rows * sprite.frameHeight

  return {
    frame,
    row,
    backgroundPosition: `${bgX}px ${bgY}px`,
    backgroundSize: `${totalWidth}px ${totalHeight}px`,
  }
}
