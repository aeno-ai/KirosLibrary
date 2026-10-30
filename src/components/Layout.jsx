import { Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../auth/session'

export default function Layout() {
  const session = useSession()
  const navigate = useNavigate()
  const [params] = useSearchParams()

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
          Kiro's Library
        </Link>
        <form onSubmit={handleSearch} role="search" style={{ flex: 1, maxWidth: 320 }}>
          <input
            name="q"
            type="search"
            placeholder="Search files"
            // defaultValue (not value): the browser owns the text, React only
            // sets the starting value. Fine here since we only read it on submit.
            defaultValue={params.get('q') ?? ''}
          />
        </form>
        <button className="link" onClick={handleSignOut} title={session.user.email}>
          Sign out
        </button>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
