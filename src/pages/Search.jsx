import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import FileViewer from '../components/FileViewer'
import Loading from '../components/Loading'
import NoteEditor from '../components/NoteEditor'
import { searchFiles } from '../lib/files'
import { noteTitle, searchNotes } from '../lib/notes'

export default function Search() {
  // The search term lives in the URL (?q=...), not in state. That way Back,
  // refresh, and sharing the link all keep the same search.
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()

  const [results, setResults] = useState(null) // { files, notes }
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null) // file in the viewer
  const [openNote, setOpenNote] = useState(null) // note in the editor
  // Bumped after an edit/move/delete so the effect below runs the search again.
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!q) return
    let ignore = false
    Promise.all([searchFiles(q), searchNotes(q)]).then(
      ([files, notes]) => {
        if (ignore) return
        setResults({ files, notes })
        setError('')
      },
      (e) => !ignore && setError(e.message),
    )
    return () => {
      ignore = true
    }
  }, [q, refresh])

  function handleChanged() {
    setOpen(null)
    setOpenNote(null)
    setRefresh((n) => n + 1)
  }

  if (!q) return <p className="muted">Type something in the search box.</p>

  const total = results ? results.files.length + results.notes.length : 0

  return (
    <>
      <h1>Results for “{q}”</h1>
      {error && <p className="error">{error}</p>}
      {!results && !error && <Loading text="Searching…" />}
      {results && total === 0 && <p className="muted">Nothing matches.</p>}

      {total > 0 && (
        <ul className="results">
          {results.notes.map((n) => (
            <li key={`note-${n.id}`} className="row">
              <button className="link" onClick={() => setOpenNote(n)} style={{ overflowWrap: 'anywhere' }}>
                📝 {noteTitle(n)}
              </button>
              <span className="spacer" />
              <FolderLink folder={n.categories} />
            </li>
          ))}
          {results.files.map((f) => (
            <li key={`file-${f.id}`} className="row">
              <button className="link" onClick={() => setOpen(f)} style={{ overflowWrap: 'anywhere' }}>
                {f.file_type.startsWith('image/') ? '🖼️' : '📄'} {f.filename}
              </button>
              <span className="spacer" />
              <FolderLink folder={f.categories} />
            </li>
          ))}
        </ul>
      )}

      {open && (
        <FileViewer file={open} onClose={() => setOpen(null)} onRemoved={handleChanged} onMoved={handleChanged} />
      )}
      {openNote && (
        <NoteEditor
          note={openNote}
          onSaved={handleChanged}
          onRemoved={handleChanged}
          onMoved={handleChanged}
          onClose={() => setOpenNote(null)}
        />
      )}
    </>
  )
}

// "categories" on each result comes from the join in searchFiles/searchNotes.
function FolderLink({ folder }) {
  return (
    <Link to={`/c/${folder.id}`} className="small">
      🌸 {folder.name}
    </Link>
  )
}
