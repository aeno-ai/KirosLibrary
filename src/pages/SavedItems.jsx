import { useState } from 'react'
import SavedItemCards from '../saved/SavedItemCards'
import useSavedItemSources from '../saved/useSavedItemSources'

const FILTERS = [
  ['all', 'All'],
  ['folder', 'Folders'],
  ['file', 'Files'],
  ['note', 'Notes'],
  ['link', 'Links'],
]

export default function SavedItems({ mode = 'favorites' }) {
  const [filter, setFilter] = useState('all')
  const flag = mode === 'pins' ? 'is_pinned' : 'is_favorite'
  const { rows, loading, error, reload } = useSavedItemSources(flag)
  const visible = rows?.filter(({ saved }) => filter === 'all' || saved.item_type === filter)
  const heading = mode === 'pins' ? 'Pinned items' : 'Favorites'
  const empty = mode === 'pins'
    ? 'Pin folders, files, notes, or links from their controls to find them here.'
    : 'Tap a heart on any folder, file, note, or link to make it a favorite.'

  return (
    <section className="saved-items-page" aria-labelledby="saved-items-heading">
      <h1 id="saved-items-heading">{heading}</h1>
      <div className="saved-item-filters" aria-label={`Filter ${heading.toLowerCase()}`}>
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? 'active' : ''}
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
          >
            {label}
          </button>
        ))}
      </div>
      {loading && <p className="muted">Loading {heading.toLowerCase()}…</p>}
      {error && <p className="error">Couldn’t load {heading.toLowerCase()}: {error}</p>}
      {!loading && !error && visible.length === 0 && <p className="empty saved-items-empty">{empty}</p>}
      {visible?.length > 0 && <SavedItemCards rows={visible} onReload={reload} />}
    </section>
  )
}
