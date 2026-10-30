import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import FileViewer from '../components/FileViewer'
import { searchFiles } from '../lib/files'

export default function Search() {
  // The search term lives in the URL (?q=...), not in state. That way Back,
  // refresh, and sharing the link all keep the same search.
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()

  const [results, setResults] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  // Bumped after a move/delete so the effect below runs the search again.
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    if (!q) return
    let ignore = false
    searchFiles(q).then(
      (rows) => {
        if (ignore) return
        setResults(rows)
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
    setRefresh((n) => n + 1)
  }

  if (!q) return <p className="muted">Type a file name in the search box.</p>

  return (
    <>
      <h1>Results for “{q}”</h1>
      {error && <p className="error">{error}</p>}
      {!results && !error && <p className="muted">Searching…</p>}
      {results?.length === 0 && <p className="muted">No files match.</p>
      
      
      }

      {results?.length > 0 && (
        <ul className="results">
          {results.map((f) => (
            <li key={f.id} className="row">
              <button className="link" onClick={() => setOpen(f)} style={{ overflowWrap: 'anywhere' }}>
                {f.filename}
              </button>
              <span className="spacer" />
              {/* f.categories comes from the join in searchFiles(). */}
              <Link to={`/c/${f.categories.id}`} className="small">
                📁 {f.categories.name}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <FileViewer
          file={open}
          onClose={() => setOpen(null)}
          onRemoved={handleChanged}
          onMoved={handleChanged}
        />
      )}
    </>
  )
}
