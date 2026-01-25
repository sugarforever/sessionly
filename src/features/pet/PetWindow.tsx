import { useRef, useCallback, useState, useEffect } from 'react'
import { usePetState } from './hooks/usePetState'
import { usePetSettings } from './hooks/usePetSettings'
import { PetSprite } from './components/PetSprite'
import { PetTooltip } from './components/PetTooltip'
import './pet.css'

// Throttle interval for drag move IPC calls (ms)
const DRAG_THROTTLE_MS = 16 // ~60fps

// Hook to pause animations when window is not visible
function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(!document.hidden)

  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(!document.hidden)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return isVisible
}

// Static style to avoid recreation on each render
const containerStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  // @ts-expect-error - WebkitAppRegion is a non-standard property for Electron
  WebkitAppRegion: 'no-drag',
}

export function PetWindow(): JSX.Element {
  const state = usePetState()
  const settings = usePetSettings()
  const isVisible = usePageVisibility()
  const isDraggingRef = useRef(false)
  const lastPositionRef = useRef({ x: 0, y: 0 })
  const lastDragTimeRef = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    lastPositionRef.current = { x: e.screenX, y: e.screenY }
    lastDragTimeRef.current = 0
    window.electron.petStartDrag()

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return

      // Throttle IPC calls to reduce overhead
      const now = Date.now()
      if (now - lastDragTimeRef.current < DRAG_THROTTLE_MS) return
      lastDragTimeRef.current = now

      const deltaX = e.screenX - lastPositionRef.current.x
      const deltaY = e.screenY - lastPositionRef.current.y
      lastPositionRef.current = { x: e.screenX, y: e.screenY }

      window.electron.petDragMove({ deltaX, deltaY })
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
      window.electron.petEndDrag()
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  const containerClass = `pet-container pet-state-${state.state}${isVisible ? '' : ' paused'}`

  return (
    <div
      className={containerClass}
      onMouseDown={handleMouseDown}
      style={containerStyle}
    >
      <PetSprite state={state.state} character={settings.character} />
      <PetTooltip state={state} />
      <div className={`pet-status-indicator pet-status-${state.state}`} />
    </div>
  )
}
