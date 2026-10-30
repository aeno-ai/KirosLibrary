import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../auth/session'
import Cat from '../components/Dog'

export default function Login() {
  const session = useSession()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // No navigate() after login: signing in fires onAuthStateChange, the
  // session updates, this component re-renders, and this redirect runs.
  if (session) {
    const from = location.state?.from
    return <Navigate to={from ? from.pathname + from.search : '/'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <main className="login card">
      <Cat name="wave" size={130} />
      <h1>Kiro's Library 💕</h1>
      <p className="muted">Welcome back, cutie</p>
      <form onSubmit={handleSubmit} className="stack">
        <label>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
