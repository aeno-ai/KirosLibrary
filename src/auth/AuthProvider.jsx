import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { SessionContext } from './session'

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    // Fires once right away with the saved session (event INITIAL_SESSION,
    // read from localStorage), then again on every sign in, sign out and
    // token refresh. So this one listener covers "am I logged in?" for good.
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    // Cleanup: stop listening when the component unmounts. Without this, dev
    // mode (StrictMode mounts twice) would leave a duplicate listener behind.
    return () => data.subscription.unsubscribe()
  }, [])

  // React 19: a context object can be rendered directly as its own provider.
  return <SessionContext value={session}>{children}</SessionContext>
}
