import { useRef, useCallback, useState, useEffect, useMemo } from 'react'
import { usePetState } from './hooks/usePetState'
import { usePetSettings } from './hooks/usePetSettings'
import { usePanelSide } from './hooks/usePanelSide'
import { PetSprite } from './components/PetSprite'
import { PetTooltip } from './components/PetTooltip'
import { PetDetailPanel } from './components/PetDetailPanel'
import { PET_SIZE_PIXELS } from '@/../electron/shared/pet-types'
import './pet.css'

// Throttle interval for drag move IPC calls (ms)
const DRAG_THROTTLE_MS = 16 // ~60fps

// How long to show the bubble after a state change (ms)
const BUBBLE_DISPLAY_MS = 4000
// How long to show the bubble for errors (longer so user can read)
const BUBBLE_ERROR_DISPLAY_MS = 6000

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
  userSelect: 'none',
  WebkitUserSelect: 'none',
  // @ts-expect-error - WebkitAppRegion is a non-standard property for Electron
  WebkitAppRegion: 'no-drag',
}

// Minimum pixels moved to consider it a drag, not a click
const DRAG_THRESHOLD = 5

export function PetWindow(): JSX.Element {
  const state = usePetState()
  const settings = usePetSettings()
  const panelSide = usePanelSide()
  const isVisible = usePageVisibility()
  const isDraggingRef = useRef(false)
  const hasDraggedRef = useRef(false) // Track if mouse actually moved (drag vs click)
  const lastPositionRef = useRef({ x: 0, y: 0 })
  const startPositionRef = useRef({ x: 0, y: 0 })
  const lastDragTimeRef = useRef(0)

  // Bubble visibility state
  const [isBubbleVisible, setIsBubbleVisible] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isPanelVisible, setIsPanelVisible] = useState(false)
  const prevStateRef = useRef(state.state)
  const prevToolRef = useRef(state.toolName)
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-show bubble on state or tool changes
  useEffect(() => {
    const stateChanged = state.state !== prevStateRef.current
    const toolChanged = state.state === 'working' && state.toolName !== prevToolRef.current

    prevStateRef.current = state.state
    prevToolRef.current = state.toolName

    // Show bubble on state change or tool change while working
    if (stateChanged || toolChanged) {
      // Clear any existing timer
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current)
      }

      setIsBubbleVisible(true)

      // Don't auto-hide while actively working (tool is running)
      // But do auto-hide for idle, completed, and error states
      if (state.state !== 'working') {
        const displayTime = state.state === 'error' ? BUBBLE_ERROR_DISPLAY_MS : BUBBLE_DISPLAY_MS
        bubbleTimerRef.current = setTimeout(() => {
          setIsBubbleVisible(false)
        }, displayTime)
      }
    }

    return () => {
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current)
      }
    }
  }, [state.state, state.toolName])

  const handleMouseEnter = useCallback(() => {
    window.electron.petMouseEnter()
    setIsHovering(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (!isDraggingRef.current) {
      window.electron.petMouseLeave()
    }
    setIsHovering(false)
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    hasDraggedRef.current = false
    lastPositionRef.current = { x: e.screenX, y: e.screenY }
    startPositionRef.current = { x: e.screenX, y: e.screenY }
    lastDragTimeRef.current = 0
    window.electron.petStartDrag()

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return

      // Check if mouse has moved enough to be considered a drag
      const totalDeltaX = Math.abs(e.screenX - startPositionRef.current.x)
      const totalDeltaY = Math.abs(e.screenY - startPositionRef.current.y)
      if (totalDeltaX > DRAG_THRESHOLD || totalDeltaY > DRAG_THRESHOLD) {
        hasDraggedRef.current = true
      }

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

      // If mouse didn't move much, treat as a click - toggle panel
      if (!hasDraggedRef.current) {
        setIsPanelVisible((prev) => !prev)
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [])

  const handleClosePanel = useCallback(() => {
    setIsPanelVisible(false)
  }, [])

  const containerClass = `pet-container pet-state-${state.state} pet-panel-${panelSide}${isVisible ? '' : ' paused'}`

  // Show bubble only when panel is not visible
  const showBubble = !isPanelVisible && (isBubbleVisible || isHovering)

  // Pet sprite size based on settings
  const petSize = PET_SIZE_PIXELS[settings.size]
  const spriteStyle = useMemo(
    () => ({ width: petSize, height: petSize }),
    [petSize]
  )

  return (
    <div
      className={containerClass}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      style={containerStyle}
    >
      {/* Pet sprite with status indicator - panel is inside for absolute positioning */}
      <div className="pet-sprite-wrapper" style={spriteStyle}>
        <PetSprite
          state={state.state}
          character={settings.character}
          customSprite={settings.customSprite}
          size={petSize}
          paused={!isVisible}
        />
        <div className={`pet-status-indicator pet-status-${state.state}`} />

        {/* Detail panel - positioned absolutely relative to sprite wrapper */}
        <PetDetailPanel state={state} isVisible={isPanelVisible} onClose={handleClosePanel} />
      </div>

      {/* Tooltip/bubble - shows on hover or state change */}
      <PetTooltip state={state} isVisible={showBubble} />
    </div>
  )
}
