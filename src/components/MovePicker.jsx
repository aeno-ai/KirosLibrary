import { useState } from 'react'
import { childrenOf, pathTo, useCategories } from '../lib/categories'
import { moveFile } from '../lib/files'

// Shown inside the file viewer. You drill into folders like a file explorer,
// then press "Move here".
export default function MovePicker({ file, onMoved, onCancel }) {
  const { categories, error: loadError } = useCategories()
  const [at, setAt] = useState(file.category_id) // folder currently browsed
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loadError) return <p className="error">{loadError}</p>
  if (!categories) return <p className="muted">Loading…</p>

  const path = pathTo(categories, at)
  const here = path.at(-1) // .at(-1) = last item of the array
  const children = childrenOf(categories, at)

  async function handleMove() {
    setBusy(true)
    try {
      await moveFile(file, at)
      onMoved(file, at)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <p className="muted small">
        Move to: Library{path.map((c) => ` / ${c.name}`).join('')}
      </p>

      <ul className="picker">
        {at && (
          <li>
            <button onClick={() => setAt(here.parent_id)}>⬆ Up</button>
          </li>
        )}
        {children.map((c) => (
          <li key={c.id}>
            <button onClick={() => setAt(c.id)}>📁 {c.name}</button>
          </li>
        ))}
        {children.length === 0 && <li className="muted small">No subcategories.</li>}
      </ul>

      {error && <p className="error">{error}</p>}

      <div className="row">
        <button onClick={onCancel}>Cancel</button>
        <span className="spacer" />
        {/* Files must live in a category, and moving to the same place is pointless. */}
        <button
          className="primary"
          onClick={handleMove}
          disabled={busy || !at || at === file.category_id}
        >
          Move here
        </button>
      </div>
    </div>
  )
}
