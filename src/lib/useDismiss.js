import { useEffect } from 'react'

// Closes a popup (menu, speed dial) when you tap anywhere outside `ref` or
// press Esc. The listeners only exist while the popup is open, so a closed
// menu costs nothing.
export function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return
    // pointerdown (not click) fires for mouse, touch, and pen, and fires
    // before focus moves, so the menu is gone by the time the tap lands.
    function handlePointer(e) {
      if (!ref.current?.contains(e.target)) onClose()
    }
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [ref, open, onClose])
}
