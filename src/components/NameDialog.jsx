import { useEffect, useRef, useState } from 'react'

// A small popup asking for a name. Used for "New folder" and "Rename".
// onSubmit(name) may throw; the error is shown inside the popup and it stays
// open so the name can be fixed.
export default function NameDialog({ title, initial = '', submitLabel, onSubmit, onClose }) {
  const dialogRef = useRef(null)
  const [name, setName] = useState(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Same pattern as FileViewer: open the native <dialog> as a modal on mount.
  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    setError('')
    try {
      await onSubmit(trimmed)
      dialogRef.current.close() // fires onClose, which unmounts this component
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <dialog ref={dialogRef} onClose={onClose}>
      <form className="stack" onSubmit={handleSubmit}>
        <h2>{title}</h2>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="Name"
        />
        {error && <p className="error">{error}</p>}
        <div className="row">
          <button type="button" onClick={() => dialogRef.current.close()}>
            Cancel
          </button>
          <span className="spacer" />
          <button type="submit" className="primary" disabled={busy || !name.trim()}>
            {submitLabel}
          </button>
        </div>
      </form>
    </dialog>
  )
}
