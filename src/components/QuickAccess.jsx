import { Link } from 'react-router-dom'
import Icon from './Icon'
import SavedItemCards from '../saved/SavedItemCards'
import useSavedItemSources from '../saved/useSavedItemSources'
import useSavedItems from '../saved/useSavedItems'

const LIMIT = 8

export default function QuickAccess() {
  const { items } = useSavedItems()
  const { rows, loading, error, reload } = useSavedItemSources('is_pinned', LIMIT)
  const hasMore = (items?.filter((item) => item.is_pinned).length ?? 0) > LIMIT

  return (
    <section className="quick-access" aria-labelledby="quick-access-heading">
      <div className="row">
        <h2 id="quick-access-heading"><Icon name="pin" /> Quick Access</h2>
        <span className="spacer" />
        {hasMore && <Link to="/pinned" className="small">View all pinned</Link>}
      </div>
      {loading && <p className="muted small">Loading your pinned items…</p>}
      {error && <p className="error">Couldn’t load Quick Access: {error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="muted">Pin folders, files, notes, or links to keep them close by.</p>
      )}
      {rows?.length > 0 && <SavedItemCards rows={rows} onReload={reload} />}
    </section>
  )
}
