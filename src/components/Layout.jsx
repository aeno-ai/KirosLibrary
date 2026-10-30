import { useEffect, useState } from 'react'
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../auth/session'
import { useQueue } from '../lib/useQueue'
import { retryFailed, startSync } from '../lib/sync'
import Cat from './Dog'
import ConfirmDialog from './ConfirmDialog'

export default function Layout() {
  const session = useSession()
  const { items, error: queueError } = useQueue()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [syncError, setSyncError] = useState('')

  useEffect(() => startSync(), [])

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])

  const failedCount = items.filter((item) => item.status === 'failed').length
  const uploadingCount = items.filter((item) => item.status === 'uploading').length
  const syncStatus = queueError || syncError
    ? 'Sync issue'
    : !online
      ? `Offline · ${items.length} queued`
      : uploadingCount
        ? `Syncing ${uploadingCount}`
        : items.length
          ? `${items.length} queued`
          : 'All synced'

  async function handleSignOut() {
    // Wipe the offline copies of lists and images kept by the service worker
    // (public/sw.js), so nothing private stays on the device after logging out.
    // The app shell cache is kept; it contains no personal data.
    if ('caches' in window) {
      for (const key of await caches.keys()) {
        if (key.startsWith('data-') || key.startsWith('media-')) await caches.delete(key)
      }
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }

  async function handleRetry() {
    setSyncError('')
    try {
      await retryFailed()
    } catch (error) {
      setSyncError(error.message)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    // FormData reads the form's inputs by their name attribute, so the input
    // doesn't need its own state just to be submitted.
    const q = new FormData(e.currentTarget).get('q').trim()
    // encodeURIComponent makes spaces, &, # etc. safe inside a URL.
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          <Cat name="peek" size={36} label="" />
          Kiro's Library
        </Link>
        {/* className="search"/"actions" place these in the header grid
            (see .topbar in index.css): one row on wide screens, two on phones. */}
        <form className="search" onSubmit={handleSearch} role="search">
          <input
            name="q"
            type="search"
            placeholder="🔍 Search files & notes"
            // defaultValue (not value): the browser owns the text, React only
            // sets the starting value. Fine here since we only read it on submit.
            defaultValue={params.get('q') ?? ''}
          />
        </form>
        <div className="actions">
          {failedCount && online && !queueError && !syncError ? (
            <button className="sync-pill" onClick={handleRetry}>Retry {failedCount} failed</button>
          ) : (
            <span className="sync-pill" role="status" aria-live="polite">{syncStatus}</span>
          )}
          {/* On phones only the 💗 shows; aria-label keeps it readable for
              screen readers, which don't see what CSS hides visually. */}
          <button
            className="link icon-link"
            onClick={() => setConfirmingSignOut(true)}
            title={session.user.email}
            aria-label="Sign out"
          >
            💗<span className="wide-only small"> Sign out</span>
          </button>
        </div>
      </header>
      <main className="page">
        {(queueError || syncError) && <p className="error">{queueError || syncError}</p>}
        <Outlet />
      </main>

      {confirmingSignOut && (
        <ConfirmDialog
          title={items.length ? 'Sign out with uploads waiting?' : 'Sign out?'}
          message={`You're signed in as ${session.user.email}. Pictures saved for offline viewing will be cleared from this device.${
            items.length
              ? ` ${items.length} unsynced upload${items.length === 1 ? '' : 's'} will remain saved in this browser and resume after you sign in again.`
              : ''
          }`}
          confirmLabel={items.length ? 'Sign out anyway' : 'Sign out'}
          danger
          onConfirm={handleSignOut}
          onClose={() => setConfirmingSignOut(false)}
        />
      )}
    </>
  )
}
