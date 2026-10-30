import { useEffect, useRef, useState } from 'react'

// A themed "Are you sure?" popup, used instead of the browser's plain
// window.confirm(). onConfirm may be async; the button shows it's busy.
export default function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onClose }) {
  const dialogRef = useRef(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal()
  }, [])

  async function handleConfirm() {
    setBusy(true)
    await onConfirm()
    // onConfirm may have unmounted us (e.g. signing out leaves the page),
    // so only close if the dialog is still on screen.
    if (dialogRef.current?.open) dialogRef.current.close()
  }

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <div className="stack">
        <h2>{title}</h2>
        {message && <p className="muted" style={{ margin: 0 }}>{message}</p>}
        <div className="row">
          <button onClick={() => dialogRef.current.close()} disabled={busy}>
            Cancel
          </button>
          <span className="spacer" />
          <button className={danger ? 'danger' : 'primary'} onClick={handleConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
