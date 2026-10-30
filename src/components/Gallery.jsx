import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isImage, listFiles, signedUrls } from '../lib/files'
import { listLinks } from '../lib/links'
import { listNotes, noteTitle } from '../lib/notes'
import { retryFailed } from '../lib/sync'
import { useQueue } from '../lib/useQueue'
import Cat from './Dog'
import FileViewer from './FileViewer'
import LinkDialog from './LinkDialog'
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
  const { items: queueItems, error: queueError } = useQueue()
  const folderQueueItems = useMemo(
    () => queueItems.filter((item) => item.categoryId === categoryId),
    [queueItems, categoryId],
  )
  const queueKey = folderQueueItems.map((item) => item.id).join(',')
  const queueIds = useRef(new Set())
  const [files, setFiles] = useState(null)
  const [notes, setNotes] = useState([])
  const [links, setLinks] = useState([])
  const [thumbs, setThumbs] = useState(new Map())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [retryError, setRetryError] = useState('')
  const [open, setOpen] = useState(null) // the file shown in the viewer
  const [openNote, setOpenNote] = useState(null) // the note shown in the editor
  const [openLink, setOpenLink] = useState(null) // the selected link's actions
  const fileLoadVersion = useRef(0)

  useEffect(() => {
    let ignore = false
    const request = ++fileLoadVersion.current
    // Load the folder's first file page and its small text/link rows together.
    Promise.all([loadPage(categoryId, 0), listNotes(categoryId), listLinks(categoryId)]).then(
      ([result, folderNotes, folderLinks]) => {
        if (ignore || request !== fileLoadVersion.current) return
        setFiles(result.rows)
        setThumbs(result.thumbs)
        setHasMore(result.hasMore)
        setNotes(folderNotes)
        setLinks(folderLinks)
      },
      (e) => !ignore && request === fileLoadVersion.current && setError(e.message),
    )
    return () => {
      ignore = true
    }
  }, [categoryId])

  useEffect(() => {
    const previousIds = queueIds.current
    const nextIds = new Set(queueKey ? queueKey.split(',') : [])
    queueIds.current = nextIds
    if (![...previousIds].some((id) => !nextIds.has(id))) return

    let ignore = false
    const request = ++fileLoadVersion.current
    const pages = Array.from({ length: page + 1 }, (_, index) => loadPage(categoryId, index))
    Promise.all(pages).then(
      (results) => {
        if (ignore || request !== fileLoadVersion.current) return
        setFiles(results.flatMap((result) => result.rows))
        setThumbs(new Map(results.flatMap((result) => [...result.thumbs])))
        setHasMore(results[results.length - 1].hasMore)
      },
      (e) => !ignore && request === fileLoadVersion.current && setError(e.message),
    )
    return () => {
      ignore = true
    }
  }, [categoryId, page, queueKey])

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

  function handleLinkSaved(saved) {
    setLinks((prev) => [saved, ...prev.filter((link) => link.id !== saved.id)])
  }

  function handleLinkRemoved(link) {
    setLinks((prev) => prev.filter((item) => item.id !== link.id))
    setOpenLink(null)
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

        {/* Notes and links come right after Back, then files. */}
        {notes.map((n) => (
          <button key={n.id} className="tile note-tile" onClick={() => setOpenNote(n)}>
            <strong>📝 {noteTitle(n)}</strong>
            {/* Under a real title, show the start of the text. */}
            {n.title.trim() && <span className="snippet">{n.body}</span>}
          </button>
        ))}

        {links.map((link) => (
          <button
            key={link.id}
            className="tile link-tile"
            onClick={() => setOpenLink(link)}
            title={link.title}
          >
            <strong>🔗 {link.title}</strong>
          </button>
        ))}

        {folderQueueItems.map((item) => {
          const failed = item.status === 'failed'
          const status = failed
            ? 'Failed · tap to retry'
            : item.status === 'uploading'
              ? 'Uploading…'
              : 'Waiting to upload'
          return (
            <button
              key={`queued-${item.id}`}
              className={`tile pending${failed ? ' failed' : ''}`}
              onClick={failed ? () => retryFailed().catch((e) => setRetryError(e.message)) : undefined}
              disabled={!failed}
              title={failed ? item.error : item.filename}
            >
              <span className="doc">{isImage(item) ? '🖼️' : '📄'} {item.filename}</span>
              <span className="status">{status}</span>
            </button>
          )
        })}

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

      {(queueError || retryError) && <p className="error">{queueError || retryError}</p>}

      {files.length === 0 && notes.length === 0 && links.length === 0 && folderQueueItems.length === 0 && (
        <div className="empty">
          <Cat name="sleep" size={130} label="sleeping cat" />
          <p className="muted">Nothing here yet. Add a file, note, or link!</p>
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

      {openLink && (
        <LinkDialog
          link={openLink}
          onSaved={handleLinkSaved}
          onRemoved={handleLinkRemoved}
          onClose={() => setOpenLink(null)}
        />
      )}
    </>
  )
}
