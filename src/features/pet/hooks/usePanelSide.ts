import { useState, useEffect } from 'react'

export type PanelSide = 'left' | 'right'

/**
 * Hook to track which side the detail panel should appear
 * - 'left': panel appears to the left of the pet (pet is on right side of screen)
 * - 'right': panel appears to the right of the pet (pet is on left side of screen)
 */
export function usePanelSide(): PanelSide {
  const [panelSide, setPanelSide] = useState<PanelSide>('left')

  useEffect(() => {
    // Get initial panel side
    window.electron.petGetPanelSide().then((response) => {
      if (response.success && response.data) {
        setPanelSide(response.data)
      }
    })

    // Subscribe to panel side changes
    const unsubscribe = window.electron.onPetPanelSideChange((side) => {
      setPanelSide(side)
    })

    return unsubscribe
  }, [])

  return panelSide
}
