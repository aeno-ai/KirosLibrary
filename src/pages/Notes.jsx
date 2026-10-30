import { useEffect, useRef, useState } from 'react'
import Cat from '../components/Dog'
import { displayName, setDisplayName } from '../lib/notes'
import { useNotes } from '../notes/notesContext'

const MAX = 500

export default function Notes() {
  const { notes, unseen, me, error: loadError, send, markSeen } = useNotes()
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  // Opening this page counts as reading everything that's waiting.
  useEffect(() => {
    unseen.forEach((note) => markSeen(note).catch(() => {}))
  }, [unseen, markSeen])

  // Keep the newest message in view, like a chat app.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [notes.length])

  async function handleSend(e) {
    e.preventDefault()
    if (!draft.trim()) return
    setBusy(true)
    setError('')
    try {
      await send(draft)
      setDraft('')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // Ctrl/Cmd + Enter sends, plain Enter makes a new line.
  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(e)
  }

  // notes is newest-first; a chat reads oldest-first, top to bottom.
  const thread = [...notes].reverse()

  return (
    <>
      <div className="row title-row">
        <h1>Love notes 💌</h1>
      </div>

      {loadError && <p className="error">{loadError}</p>}

      {thread.length === 0 ? (
        <div className="empty">
          <Cat name="love" size={150} label="cat in love" />
          <p className="muted">No notes yet. Write the first one!</p>
        </div>
      ) : (
        <ul className="bubbles">
          {thread.map((n) => (
            <li key={n.id} className={n.sender_id === me.id ? 'bubble mine' : 'bubble'}>
              {n.message}
              <span className="meta">
                {n.sender_id === me.id ? 'You' : n.sender_name || 'Them'} ·{' '}
                {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                {n.sender_id === me.id && n.seen && ' · seen 💗'}
              </span>
            </li>
          ))}
          <li ref={endRef} aria-hidden="true" />
        </ul>
      )}

      <form className="card stack" onSubmit={handleSend}>
        <textarea
          rows={3}
          maxLength={MAX}
          placeholder="Write something sweet…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="row">
          <span className="muted small">
            {draft.length} / {MAX}
          </span>
          <span className="spacer" />
          <button type="submit" className="primary" disabled={busy || !draft.trim()}>
            {busy ? 'Sending…' : 'Send 💕'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>

      <NameSetting user={me} />
    </>
  )
}

// "Your name" shown on the notes you send.
function NameSetting({ user }) {
  const [name, setName] = useState(displayName(user))
  const [status, setStatus] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setStatus('Saving…')
    try {
      await setDisplayName(name)
      setStatus('Saved 💗')
    } catch (err) {
      setStatus(err.message)
    }
  }

  return (
    <form className="card stack" onSubmit={handleSave}>
      <h2>Your name on notes</h2>
      <div className="row">
        <input style={{ flex: 1, width: 'auto' }} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <button type="submit" disabled={!name.trim()}>
          Save
        </button>
      </div>
      {status && <p className="muted small">{status}</p>}
    </form>
  )
}
