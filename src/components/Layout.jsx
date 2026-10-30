import { Link, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../auth/session'

export default function Layout() {
  const session = useSession()

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">
          Kiro's Library
        </Link>
        <span className="muted small">{session.user.email}</span>
        <button className="link" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
