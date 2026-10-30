import { useEffect, useRef, useState } from 'react'
import { MAX_BODY, createNote, deleteNote, moveNote, updateNote } from '../lib/notes'
import MovePicker from './MovePicker'

// Popup for writing a new note (note = null) or editing an existing one.
// onSaved(note) after create/update, onRemoved(note) after delete,
// onMoved(note, folderId) after a move.
export default function NoteEditor({ note, categoryId, onSaved, onRemoved, onMoved, onClose }) {
  const dialogRef = useRef(null)
  const [title, setTitle] = useState(note?.title ?? '')
  const [body, setBody] = useState(note?.body ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [moving, setMoving] = useState(false)

  const isNew = !note
  // "dirty" = has unsaved changes. Derived from state on every render, so it
  // never needs its own useState that could get out of sync.
  const dirty = title !== (note?.title ?? '') || body !== (note?.body ?? '')
  const empty = !title.trim() && !body.trim()

  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal()
  }, [])

  // Esc fires the dialog's "cancel" event before it closes.
  // preventDefault() keeps it open, so typed text isn't lost by accident.
  function handleCancel(e) {
    if (dirty && !window.confirm('Discard your changes?')) e.preventDefault()
  }

  function tryClose() {
    if (!dirty || window.confirm('Discard your changes?')) dialogRef.current.close()
  }

  async function handleSave(e) {
    e.preventDefault()
    if (empty) return
    setBusy(true)
    setError('')
    try {
      const saved = isNew
        ? await createNote(categoryId, { title, body })
        : await updateNote(note.id, { title, body })
      onSaved(saved)
      dialogRef.current.close()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this note? This can't be undone.")) return
    setBusy(true)
    try {
      await deleteNote(note.id)
      onRemoved(note)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="viewer note-editor" onClose={onClose} onCancel={handleCancel}>
      <form className="stack" onSubmit={handleSave}>
        <div className="row">
          <h2>{isNew ? 'New note' : 'Note'}</h2>
          <span className="spacer" />
          <button type="button" onClick={tryClose}>
            Close
          </button>
        </div>

        {moving ? (
          <MovePicker
            currentCategoryId={note.category_id}
            onMove={async (to) => {
              await moveNote(note.id, to)
              onMoved(note, to)
            }}
            onCancel={() => setMoving(false)}
          />
        ) : (
          <>
            <input
              className="note-title"
              placeholder="Title (optional)"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="note-body"
              placeholder="Write anything…"
              value={body}
              maxLength={MAX_BODY}
              autoFocus={isNew}
              onChange={(e) => setBody(e.target.value)}
            />
          </>
        )}

        {error && <p className="error">{error}</p>}

        <div className="row" hidden={moving}>
          {!isNew && (
            <span className="muted small">Edited {new Date(note.updated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
          )}
          <span className="spacer" />
          {!isNew && (
            <>
              <button type="button" onClick={() => setMoving(true)} disabled={busy}>
                Move
              </button>
              <button type="button" className="danger" onClick={handleDelete} disabled={busy}>
                Delete
              </button>
            </>
          )}
          <button type="submit" className="primary" disabled={busy || empty || !dirty}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
