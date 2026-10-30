import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSession } from './session'

// Wraps every private route. <Outlet /> renders whichever child route matched.
export default function RequireAuth() {
  const session = useSession()
  const location = useLocation()

  if (session === undefined) return <p className="muted center">Loading…</p>

  if (!session) {
    // Remember where they were heading so Login can send them back there.
    // replace: swap the history entry, so Back doesn't bounce into this redirect.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}
