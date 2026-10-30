import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { isImage, listFiles, signedUrls } from '../lib/files'
import FileViewer from './FileViewer'

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
  const [thumbs, setThumbs] = useState(new Map())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null) // the file shown in the viewer

  useEffect(() => {
    let ignore = false
    loadPage(categoryId, 0).then(
      (result) => {
        if (ignore) return
        setFiles(result.rows)
        setThumbs(result.thumbs)
        setHasMore(result.hasMore)
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

  if (error) return <p className="error">{error}</p>
  if (!files) return <p className="muted">Loading files…</p>

  return (
    <>
      <div className="gallery">
        {/* Always the first card: goes up to the parent folder. No history
            needs recording; every folder knows its parent_id. */}
        <Link to={upTo} className="tile up-tile" title="Go up one folder">
          <span aria-hidden="true">⬆</span>
          <span className="small">Back</span>
        </Link>

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

      {files.length === 0 && (
        <div className="empty">
          <p className="muted">No files here yet. Tap ＋ Upload to add some!</p>
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
    </>
  )
}
