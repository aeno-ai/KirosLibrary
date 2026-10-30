import { useState } from 'react'
import SavedItemCards from '../saved/SavedItemCards'
import useSavedItemSources from '../saved/useSavedItemSources'

// Filters for different types of pinned items.
const FILTERS = [
  ['all', 'All'],
  ['folder', 'Folders'],
  ['file', 'Files'],
  ['note', 'Notes'],
  ['link', 'Links'],
]

export default function SavedItems() {
  const [filter, setFilter] = useState('all')

  // Fetch ONLY pinned items.
  const { rows, loading, error, reload } = useSavedItemSources('is_pinned')

  // Filter pinned items based on their type.
  const visible = (rows ?? []).filter(
    ({ saved }) =>
      filter === 'all' || saved.item_type === filter
  )

  return (
    <section
      className="saved-items-page"
      aria-labelledby="saved-items-heading"
    >
      {/* Page title */}
      <h1 id="saved-items-heading">
        Pinned Items
      </h1>

      {/* Category filters */}
      <div
        className="saved-item-filters"
        aria-label="Filter pinned items"
      >
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

      {/* Loading state */}
      {loading && (
        <p className="muted">
          Loading pinned items…
        </p>
      )}

      {/* Error state */}
      {error && (
        <p className="error">
          Couldn’t load pinned items: {error}
        </p>
      )}

      {/* Empty state */}
      {!loading && !error && visible.length === 0 && (
        <p className="empty saved-items-empty">
          Nothing pinned yet! Pin folders, files, notes,
          or links to find them here.
        </p>
      )}

      {/* Display pinned items */}
      {!loading && !error && visible.length > 0 && (
        <SavedItemCards
          rows={visible}
          onReload={reload}
        />
      )}
    </section>
  )
}