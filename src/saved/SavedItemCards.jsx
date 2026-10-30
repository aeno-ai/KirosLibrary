import { useState } from 'react'
import { Link } from 'react-router-dom'
import { noteTitle } from '../lib/notes'
import FileViewer from '../components/FileViewer'
import Icon from '../components/Icon'
import LinkDialog from '../components/LinkDialog'
import NoteEditor from '../components/NoteEditor'
import SavedItemActions from './SavedItemActions'

function sourceLabel(itemType, source) {
  if (!source?.id) return `Deleted ${itemType}`
  if (itemType === 'folder') return source.name
  if (itemType === 'file') return source.filename
  if (itemType === 'note') return noteTitle(source)
  return source.title
}

function typeIcon(itemType) {
  return { folder: 'folder', file: 'document', note: 'note', link: 'link' }[itemType]
}

// Cards are deliberately not links themselves: their open control and the
// heart/pin buttons remain siblings, never nested interactive elements.
export default function SavedItemCards({ rows, onReload }) {
  const [openFile, setOpenFile] = useState(null)
  const [openNote, setOpenNote] = useState(null)
  const [openLink, setOpenLink] = useState(null)

  return (
    <>
      <div className="saved-items-grid">
        {rows.map(({ saved, source }) => {
          const label = sourceLabel(saved.item_type, source)
          const missing = !source?.id
          const itemLabel = `${saved.item_type} “${label}”`
          return (
            <article key={`${saved.item_type}-${saved.item_id}`} className={`saved-item-card${missing ? ' missing' : ''}`}>
              <span className="saved-item-type"><Icon name={typeIcon(saved.item_type)} /> {saved.item_type}</span>
              {missing ? (
                <span className="saved-item-open muted">This item no longer exists.</span>
              ) : saved.item_type === 'folder' ? (
                <Link to={`/c/${source.id}`} className="saved-item-open">{label}</Link>
              ) : (
                <button
                  type="button"
                  className="saved-item-open"
                  onClick={() => {
                    if (saved.item_type === 'file') setOpenFile(source)
                    if (saved.item_type === 'note') setOpenNote(source)
                    if (saved.item_type === 'link') setOpenLink(source)
                  }}
                >
                  {label}
                </button>
              )}
              <SavedItemActions itemType={saved.item_type} itemId={saved.item_id} label={itemLabel} />
            </article>
          )
        })}
      </div>

      {openFile && (
        <FileViewer
          file={openFile}
          onClose={() => setOpenFile(null)}
          onRemoved={() => {
            setOpenFile(null)
            onReload()
          }}
          onMoved={() => {
            setOpenFile(null)
            onReload()
          }}
        />
      )}
      {openNote && (
        <NoteEditor
          note={openNote}
          onSaved={onReload}
          onRemoved={() => {
            setOpenNote(null)
            onReload()
          }}
          onMoved={() => {
            setOpenNote(null)
            onReload()
          }}
          onClose={() => setOpenNote(null)}
        />
      )}
      {openLink && (
        <LinkDialog
          link={openLink}
          onSaved={onReload}
          onRemoved={() => {
            setOpenLink(null)
            onReload()
          }}
          onClose={() => setOpenLink(null)}
        />
      )}
    </>
  )
}
