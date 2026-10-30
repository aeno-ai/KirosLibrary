import { useState } from 'react'
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../auth/session'
import { useNotes } from '../notes/notesContext'
import Cat from './Dog'
import ConfirmDialog from './ConfirmDialog'
import NoteBanner from './NoteBanner'

export default function Layout() {
  const session = useSession()
  const { unseen } = useNotes()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)

  async function handleSignOut() {
    // Wipe the offline copies of lists and images kept by the service worker
    // (public/sw.js), so nothing private stays on the device after logging out.
    // The app shell cache is kept; it contains no personal data.
    if ('caches' in window) {
      for (const key of await caches.keys()) {
        if (key.startsWith('data-') || key.startsWith('media-')) await caches.delete(key)
      }
    }
    await supabase.auth.signOut()
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
            placeholder="🔍 Search files"
            // defaultValue (not value): the browser owns the text, React only
            // sets the starting value. Fine here since we only read it on submit.
            defaultValue={params.get('q') ?? ''}
          />
        </form>
        <div className="actions">
          <Link to="/notes" className="icon-link" aria-label={`Love notes, ${unseen.length} new`}>
            💌
            {unseen.length > 0 && <span className="badge">{unseen.length}</span>}
          </Link>
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
        <NoteBanner />
        <Outlet />
      </main>

      {confirmingSignOut && (
        <ConfirmDialog
          title="Sign out?"
          message={`You're signed in as ${session.user.email}. Pictures saved for offline viewing will be cleared from this device.`}
          confirmLabel="Sign out"
          onConfirm={handleSignOut}
          onClose={() => setConfirmingSignOut(false)}
        />
      )}
    </>
  )
}
