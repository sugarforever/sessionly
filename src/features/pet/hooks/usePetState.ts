import { useState, useEffect } from 'react'
import type { PetStateInfo } from '@/../electron/shared/pet-types'

const DEFAULT_STATE: PetStateInfo = {
  state: 'idle',
  sessionId: null,
  project: null,
  lastActivity: Date.now(),
}

export function usePetState(): PetStateInfo {
  const [state, setState] = useState<PetStateInfo>(DEFAULT_STATE)

  useEffect(() => {
    // Get initial state
    window.electron.petGetState().then((response) => {
      if (response.success && response.data) {
        setState(response.data)
      }
    })

    // Subscribe to state changes
    const unsubscribe = window.electron.onPetStateChange((newState) => {
      setState(newState)
    })

    return unsubscribe
  }, [])

  return state
}
