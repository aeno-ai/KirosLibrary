import { useState } from 'react'
import { childrenOf, pathTo, useCategories } from '../lib/categories'
import Icon from './Icon'
import Loading from './Loading'

// Folder browser used by the file viewer and the note editor. You drill into
// folders like a file explorer, then press "Move here". It doesn't know what
// is being moved: it just calls onMove(folderId), and the caller does the rest.
export default function MovePicker({ currentCategoryId, onMove, onCancel }) {
  const { categories, error: loadError } = useCategories()
  const [at, setAt] = useState(currentCategoryId) // folder currently browsed
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loadError) return <p className="error">{loadError}</p>
  if (!categories) return <Loading />

  const path = pathTo(categories, at)
  const here = path.at(-1) // .at(-1) = last item of the array
  const children = childrenOf(categories, at)

  async function handleMove() {
    setBusy(true)
    try {
      await onMove(at)
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
            <button type="button" onClick={() => setAt(here.parent_id)}>
              <Icon name="arrowUp" /> Up
            </button>
          </li>
        )}
        {children.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setAt(c.id)}>
              <Icon name="folder" /> {c.name}
            </button>
          </li>
        ))}
        {children.length === 0 && <li className="muted small">No folders inside.</li>}
      </ul>

      {error && <p className="error">{error}</p>}

      <div className="row">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <span className="spacer" />
        {/* Everything must live in a folder, and moving to the same place is pointless. */}
        <button
          type="button"
          className="primary"
          onClick={handleMove}
          disabled={busy || !at || at === currentCategoryId}
        >
          Move here
        </button>
      </div>
    </div>
  )
}
