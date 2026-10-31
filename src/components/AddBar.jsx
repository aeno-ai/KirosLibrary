import { useCallback, useRef, useState } from 'react'
import { useDismiss } from '../lib/useDismiss'
import Icon from './Icon'
import UploadButton from './UploadButton'

// The Note / Link / Upload buttons. On phones and tablets they hide behind one
// round "+" button that floats bottom-right (a "speed dial"); tapping it fans
// them out above it. On desktop the "+" is hidden and all three sit in a row.
// The switch is pure CSS (.add-bar.open in index.css); this only tracks open.
export default function AddBar({ categoryId, onNote, onLink, onUploaded }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(ref, open, close)

  return (
    <div ref={ref} className={`add-bar${open ? ' open' : ''}`}>
      <button
        className="fab note-fab add-option"
        onClick={() => {
          close()
          onNote()
        }}
      >
        <Icon name="note" /> Note
      </button>
      <button
        className="fab link-fab add-option"
        onClick={() => {
          close()
          onLink()
        }}
      >
        <Icon name="link" /> Link
      </button>
      <UploadButton categoryId={categoryId} onUploaded={onUploaded} onPick={close} />
      <button
        className="fab add-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close add menu' : 'Add a note, link, or file'}
      >
        <Icon name="plus" />
      </button>
    </div>
  )
}
