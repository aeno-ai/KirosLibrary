import { useEffect, useRef, useState } from 'react'
import { deleteFile, fileUrl, isImage, moveFile } from '../lib/files'
import MovePicker from './MovePicker'

// onRemoved(file) after a delete, onMoved(file, newCategoryId) after a move.
export default function FileViewer({ file, onClose, onRemoved, onMoved }) {
  const dialogRef = useRef(null)
  const [url, setUrl] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [moving, setMoving] = useState(false)

  // <dialog> is the browser's built-in modal: showModal() dims the page,
  // traps focus inside, and closes on Esc. A ref gives us the real DOM
  // element so we can call that method on it. The .open check matters in dev:
  // StrictMode runs effects twice, and opening an open dialog throws.
  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal()
  }, [])

  useEffect(() => {
    let ignore = false
    Promise.all([fileUrl(file), fileUrl(file, { download: true })]).then(
      ([view, download]) => {
        if (ignore) return
        setUrl(view)
        setDownloadUrl(download)
      },
      (e) => !ignore && setError(e.message),
    )
    return () => {
      ignore = true
    }
  }, [file])

  async function handleDelete() {
    if (!window.confirm(`Delete "${file.filename}"? This can't be undone.`)) return
    setBusy(true)
    try {
      await deleteFile(file)
      onRemoved(file)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    // onClose fires for Esc too, so the parent's state always stays in sync.
    <dialog ref={dialogRef} className="viewer" onClose={onClose}>
      <div className="stack">
        <div className="row">
          <strong style={{ overflowWrap: 'anywhere' }}>{file.filename}</strong>
          <span className="spacer" />
          <button onClick={() => dialogRef.current.close()}>Close</button>
        </div>

        {error && <p className="error">{error}</p>}

        {moving ? (
          <MovePicker
            currentCategoryId={file.category_id}
            onMove={async (to) => {
              await moveFile(file, to)
              onMoved(file, to)
            }}
            onCancel={() => setMoving(false)}
          />
        ) : (
          <>
            {url && isImage(file) && <img src={url} alt={file.filename} />}
            {url && !isImage(file) && (
              <a href={url} target="_blank" rel="noreferrer">
                Open {file.filename}
              </a>
            )}
          </>
        )}

        <div className="row" hidden={moving}>
          <span className="muted small">
            {(file.size_bytes / 1024 / 1024).toFixed(1)} MB ·{' '}
            {new Date(file.created_at).toLocaleDateString()}
          </span>
          <span className="spacer" />
          {downloadUrl && (
            <a href={downloadUrl} download>
              Download
            </a>
          )}
          <button onClick={() => setMoving(true)} disabled={busy}>
            Move
          </button>
          <button className="danger" onClick={handleDelete} disabled={busy}>
            Delete
          </button>
        </div>
      </div>
    </dialog>
  )
}
