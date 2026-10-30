import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import Gallery from '../components/Gallery'
import UploadButton from '../components/UploadButton'
import {
  childrenOf,
  createCategory,
  deleteCategory,
  pathTo,
  renameCategory,
  useCategories,
} from '../lib/categories'

// One page for both "/" (top level, no id) and "/c/:id" (inside a category).
export default function Folder() {
  const { id = null } = useParams()
  const navigate = useNavigate()
  const { categories, error: loadError, reload } = useCategories()
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // Bumped after each upload; part of the Gallery's key so it reloads.
  const [uploads, setUploads] = useState(0)

  if (loadError) return <p className="error">{loadError}</p>
  if (!categories) return <p className="muted">Loading…</p>

  const current = id ? categories.find((c) => c.id === id) : null
  if (id && !current) {
    return (
      <p>
        This category doesn't exist anymore. <Link to="/">Back to the library</Link>
      </p>
    )
  }

  const children = childrenOf(categories, id)
  const path = pathTo(categories, id)

  // Runs an action, shows its error if it fails, then refreshes the list.
  async function run(action) {
    setBusy(true)
    setError('')
    try {
      await action()
      await reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    run(async () => {
      await createCategory(newName, id)
      setNewName('')
    })
  }

  function handleRename() {
    const name = window.prompt('New name', current.name)
    if (name && name.trim() !== current.name) run(() => renameCategory(id, name))
  }

  function handleDelete() {
    if (!window.confirm(`Delete "${current.name}"?`)) return
    run(async () => {
      await deleteCategory(id)
      // The page we're on is gone, so go up one level.
      navigate(current.parent_id ? `/c/${current.parent_id}` : '/')
    })
  }

  return (
    <>
      {current && <Breadcrumbs path={path} />}

      <div className="row">
        <h1>{current ? current.name : 'Library'}</h1>
        <span className="spacer" />
        {current && (
          <>
            <button onClick={handleRename} disabled={busy}>
              Rename
            </button>
            <button className="danger" onClick={handleDelete} disabled={busy}>
              Delete
            </button>
          </>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {children.length > 0 && (
        <ul className="folders">
          {children.map((c) => (
            <li key={c.id}>
              <Link to={`/c/${c.id}`}>📁 {c.name}</Link>
            </li>
          ))}
        </ul>
      )}

      <form className="row" onSubmit={handleCreate}>
        <input
          style={{ flex: 1, width: 'auto' }}
          placeholder={current ? 'New subcategory' : 'New category'}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={100}
        />
        <button type="submit" disabled={busy || !newName.trim()}>
          Add
        </button>
      </form>

      {!current && children.length === 0 && (
        <p className="muted">No categories yet. Create one to start uploading.</p>
      )}

      {/* Files always belong to a category, so the top level has none. */}
      {current && (
        <>
          <UploadButton categoryId={id} onUploaded={() => setUploads((n) => n + 1)} />
          <Gallery key={`${id}:${uploads}`} categoryId={id} />
        </>
      )}
    </>
  )
}
