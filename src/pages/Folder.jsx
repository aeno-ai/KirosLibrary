import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'
import Icon from '../components/Icon'
import KiroMascot from '../components/KiroMascot'
import Loading from '../components/Loading'
import Gallery from '../components/Gallery'
import LinkDialog from '../components/LinkDialog'
import NameDialog from '../components/NameDialog'
import NoteEditor from '../components/NoteEditor'
import QuickAccess from '../components/QuickAccess'
import UploadButton from '../components/UploadButton'
import {
  childrenOf,
  createCategory,
  deleteCategory,
  pathTo,
  renameCategory,
  useCategories,
} from '../lib/categories'
import SavedItemActions from '../saved/SavedItemActions'

// One page for both "/" (top level, no id) and "/c/:id" (inside a category).
export default function Folder() {
  const { id = null } = useParams()
  const navigate = useNavigate()
  const { categories, error: loadError, reload } = useCategories()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState(null) // null | 'new' | 'rename' | 'note' | 'link'
  // Bumped after an upload or new card; part of the Gallery's key so it reloads.
  const [changes, setChanges] = useState(0)

  if (loadError) return <p className="error">{loadError}</p>
  if (!categories) return <Loading />

  const current = id ? categories.find((c) => c.id === id) : null
  if (id && !current) {
    return (
      <p>
        This folder doesn't exist anymore. <Link to="/">Back to the library</Link>
      </p>
    )
  }

  const children = childrenOf(categories, id)
  const path = pathTo(categories, id)

  // NameDialog shows any error thrown here, so no try/catch needed.
  async function handleCreate(name) {
    await createCategory(name, id)
    await reload()
  }

  async function handleRename(name) {
    if (name !== current.name) await renameCategory(id, name)
    await reload()
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${current.name}"?`)) return
    setBusy(true)
    setError('')
    try {
      await deleteCategory(id)
      await reload()
      // The page we're on is gone, so go up one level.
      navigate(current.parent_id ? `/c/${current.parent_id}` : '/')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {current && <Breadcrumbs path={path} />}

      <div className="row title-row">
        <h1>{current ? current.name : 'Our Library'}</h1>
        {current && <SavedItemActions itemType="folder" itemId={current.id} label={`folder ${current.name}`} />}
        <span className="spacer" />
        <button onClick={() => setDialog('new')} disabled={busy}>
          <Icon name="plus" /> New folder
        </button>
        {current && (
          <>
            <button onClick={() => setDialog('rename')} disabled={busy}>
              Rename
            </button>
            <button className="danger" onClick={handleDelete} disabled={busy}>
              Delete
            </button>
          </>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {!current && <QuickAccess />}

      {children.length > 0 && (
        <ul className="folders">
          {children.map((c) => (
            <li key={c.id} className="folder-card">
              <Link to={`/c/${c.id}`}><Icon name="folder" /> {c.name}</Link>
              <SavedItemActions itemType="folder" itemId={c.id} label={`folder ${c.name}`} />
            </li>
          ))}
        </ul>
      )}

      {!current && children.length === 0 && (
        <div className="empty">
          <KiroMascot mood="sleep" size={150} label="Kiro sleeping" />
          <p className="muted">No folders yet. Make one to start uploading!</p>
        </div>
      )}

      {/* Files, notes, and links belong to folders, so the top level has none. */}
      {current && (
        <>
          {/* The add buttons. On phones .add-bar floats bottom-right, within
              easy reach of a thumb; on desktop it sits in the page. */}
          <div className="add-bar">
            <button className="fab note-fab" onClick={() => setDialog('note')}>
              <Icon name="note" /> Note
            </button>
            <button className="fab link-fab" onClick={() => setDialog('link')}>
              <Icon name="link" /> Link
            </button>
            <UploadButton categoryId={id} onUploaded={() => setChanges((n) => n + 1)} />
          </div>
          <Gallery
            key={`${id}:${changes}`}
            categoryId={id}
            upTo={current.parent_id ? `/c/${current.parent_id}` : '/'}
          />
        </>
      )}

      {dialog === 'new' && (
        <NameDialog
          title={current ? `New folder in ${current.name}` : 'New folder'}
          submitLabel="Create"
          onSubmit={handleCreate}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'note' && (
        <NoteEditor
          note={null}
          categoryId={id}
          onSaved={() => setChanges((n) => n + 1)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'link' && (
        <LinkDialog
          link={null}
          categoryId={id}
          onSaved={() => setChanges((n) => n + 1)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'rename' && (
        <NameDialog
          title="Rename folder"
          initial={current.name}
          submitLabel="Save"
          onSubmit={handleRename}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  )
}
