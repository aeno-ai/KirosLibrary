import { useEffect, useRef, useState } from 'react'
import { createLink, deleteLink, safeLinkUrl, updateLink } from '../lib/links'
import SavedItemActions from '../saved/SavedItemActions'
import Icon from './Icon'

export default function LinkDialog({ link, categoryId, onSaved, onRemoved, onClose }) {
  const dialogRef = useRef(null)
  const [title, setTitle] = useState(link?.title ?? '')
  const [url, setUrl] = useState(link?.url ?? '')
  const [editing, setEditing] = useState(!link)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const isNew = !link
  const dirty = title !== (link?.title ?? '') || url !== (link?.url ?? '')
  const empty = !title.trim() || !url.trim()

  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal()
  }, [])

  function handleCancel(event) {
    if (editing && dirty && !window.confirm('Discard your changes?')) event.preventDefault()
  }

  function tryClose() {
    if (!editing || !dirty || window.confirm('Discard your changes?')) dialogRef.current.close()
  }

  async function handleSave(event) {
    event.preventDefault()
    if (empty) return

    setBusy(true)
    setError('')
    try {
      const saved = isNew
        ? await createLink(categoryId, { title, url })
        : await updateLink(link.id, { title, url })
      onSaved(saved)
      dialogRef.current.close()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this link? This can't be undone.")) return

    setBusy(true)
    setError('')
    try {
      await deleteLink(link.id)
      onRemoved(link)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const externalUrl = link ? safeLinkUrl(link.url) : null

  return (
    <dialog ref={dialogRef} className="viewer link-dialog" onClose={onClose} onCancel={handleCancel}>
      <form className="stack" onSubmit={handleSave}>
        <div className="row">
          <h2>{editing ? (isNew ? 'New link' : 'Edit link') : link.title}</h2>
          <span className="spacer" />
          <button type="button" onClick={tryClose}>
            Close
          </button>
        </div>

        {editing ? (
          <>
            <input
              placeholder="Link name"
              value={title}
              maxLength={200}
              required
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
            />
            <input
              type="url"
              placeholder="https://example.com"
              value={url}
              maxLength={2048}
              required
              onChange={(event) => setUrl(event.target.value)}
            />
          </>
        ) : (
          <div className="row">
            {externalUrl ? (
              <a className="primary-button" href={externalUrl} target="_blank" rel="noopener noreferrer">
                Open link in a new tab <Icon name="external" />
              </a>
            ) : (
              <p className="error">This link is not a valid http or https URL.</p>
            )}
            <span className="spacer" />
            <SavedItemActions itemType="link" itemId={link.id} label={`link ${link.title}`} />
            <button type="button" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="danger" onClick={handleDelete} disabled={busy}>
              Delete
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {editing && (
          <div className="row">
            <span className="spacer" />
            <button type="submit" className="primary" disabled={busy || empty || (!isNew && !dirty)}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </form>
    </dialog>
  )
}
