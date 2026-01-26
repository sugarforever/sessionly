import { useState, useEffect } from 'react'
import type { PetSettings } from '@/../electron/shared/pet-types'
import { DEFAULT_PET_SETTINGS } from '@/../electron/shared/pet-types'

export function usePetSettings(): PetSettings {
  const [settings, setSettings] = useState<PetSettings>(DEFAULT_PET_SETTINGS)

  useEffect(() => {
    // Get initial settings
    window.electron.petGetSettings().then((response) => {
      if (response.success && response.data) {
        setSettings(response.data)
      }
    })

    // Subscribe to settings changes
    const unsubscribe = window.electron.onPetSettingsChange((newSettings) => {
      setSettings(newSettings)
    })

    return unsubscribe
  }, [])

  return settings
}
