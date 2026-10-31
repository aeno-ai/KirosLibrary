import { useCallback, useId, useRef, useState } from 'react'
import { useDismiss } from '../lib/useDismiss'
import Icon from './Icon'

// A "⋯" button that reveals a small list of actions underneath it.
// children are plain <button>s; choosing any of them closes the menu.
export default function ActionMenu({ label, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  // useId gives a unique id per menu, so aria-controls can point at the panel
  // even when several menus are on the same page.
  const panelId = useId()
  // useCallback keeps the same function between renders, so useDismiss
  // doesn't re-attach its listeners every time this re-renders.
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="menu-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        title={label}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="more" />
      </button>
      {open && (
        // Event delegation: one click handler on the panel catches clicks
        // that bubble up from any button inside it, so each child button
        // doesn't need to know about the menu.
        <div id={panelId} className="menu-panel" onClick={(e) => e.target.closest('button') && close()}>
          {children}
        </div>
      )}
    </div>
  )
}
