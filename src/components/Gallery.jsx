import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isImage, listFiles, signedUrls } from '../lib/files'
import { listNotes, noteTitle } from '../lib/notes'
import Cat from './Dog'
import FileViewer from './FileViewer'
import Loading from './Loading'
import NoteEditor from './NoteEditor'

// Loads one page of files plus signed URLs for their thumbnails.
async function loadPage(categoryId, page) {
  const { rows, hasMore } = await listFiles(categoryId, page)
  const thumbs = await signedUrls(rows.map((f) => f.thumb_path))
  return { rows, hasMore, thumbs }
}

// The parent renders this with key={categoryId + upload count}. A new key
// makes React throw this component away and mount a fresh one, so all the
// state below resets without any manual "clear everything" code.
// upTo: the URL of the parent folder, for the "Up" card.
export default function Gallery({ categoryId, upTo }) {
  const [files, setFiles] = useState(null)
  const [notes, setNotes] = useState([])
  const [thumbs, setThumbs] = useState(new Map())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null) // the file shown in the viewer
  const [openNote, setOpenNote] = useState(null) // the note shown in the editor

  useEffect(() => {
    let ignore = false
    // Promise.all runs both requests at the same time and waits for both.
    Promise.all([loadPage(categoryId, 0), listNotes(categoryId)]).then(
      ([result, folderNotes]) => {
        if (ignore) return
        setFiles(result.rows)
        setThumbs(result.thumbs)
        setHasMore(result.hasMore)
        setNotes(folderNotes)
      },
      (e) => !ignore && setError(e.message),
    )
    return () => {
      ignore = true
    }
  }, [categoryId])

  async function loadMore() {
    try {
      const result = await loadPage(categoryId, page + 1)
      setFiles((prev) => [...prev, ...result.rows])
      // new Map([...a, ...b]) merges two Maps into a fresh one. React needs a
      // new object to notice the change; mutating the old Map wouldn't re-render.
      setThumbs((prev) => new Map([...prev, ...result.thumbs]))
      setHasMore(result.hasMore)
      setPage(page + 1)
    } catch (e) {
      setError(e.message)
    }
  }

  // Called by the viewer after a delete or move: drop the file from this list.
  function handleRemoved(file) {
    setFiles((prev) => prev.filter((f) => f.id !== file.id))
    setOpen(null)
  }

  function handleNoteSaved(saved) {
    // Replace the old version and put it first (it's now the latest edited).
    setNotes((prev) => [saved, ...prev.filter((n) => n.id !== saved.id)])
  }

  function handleNoteRemoved(note) {
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
    setOpenNote(null)
  }

  if (error) return <p className="error">{error}</p>
  if (!files) return <Loading text="Fetching your files…" />

  return (
    <>
      <div className="gallery">
        {/* Always the first card: goes up to the parent folder. No history
            needs recording; every folder knows its parent_id. */}
        <Link to={upTo} className="tile up-tile" title="Go up one folder">
          <span aria-hidden="true">⬆</span>
          <span className="small">Back</span>
        </Link>

        {/* Notes come right after Back, then files. */}
        {notes.map((n) => (
          <button key={n.id} className="tile note-tile" onClick={() => setOpenNote(n)}>
            <strong>📝 {noteTitle(n)}</strong>
            {/* Under a real title, show the start of the text. */}
            {n.title.trim() && <span className="snippet">{n.body}</span>}
          </button>
        ))}

        {files.map((f) => (
          <button key={f.id} className="tile" onClick={() => setOpen(f)} title={f.filename}>
            {thumbs.get(f.thumb_path) ? (
              // loading="lazy": the browser only downloads thumbnails that
              // are close to being scrolled into view.
              <img src={thumbs.get(f.thumb_path)} alt={f.filename} loading="lazy" />
            ) : (
              <span className="doc">
                {isImage(f) ? '🖼️' : '📄'} {f.filename}
              </span>
            )}
          </button>
        ))}
      </div>

      {files.length === 0 && notes.length === 0 && (
        <div className="empty">
          <Cat name="sleep" size={130} label="sleeping cat" />
          <p className="muted">Nothing here yet. Upload some files or write a note!</p>
        </div>
      )}

      {hasMore && <button onClick={loadMore}>Load more</button>}

      {open && (
        <FileViewer
          file={open}
          onClose={() => setOpen(null)}
          onRemoved={handleRemoved}
          // A moved file no longer belongs in this folder, same as a deleted one.
          onMoved={handleRemoved}
        />
      )}

      {openNote && (
        <NoteEditor
          note={openNote}
          onSaved={handleNoteSaved}
          onRemoved={handleNoteRemoved}
          onMoved={handleNoteRemoved}
          onClose={() => setOpenNote(null)}
        />
      )}
    </>
  )
}
