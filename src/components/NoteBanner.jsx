import { useLocation } from 'react-router-dom'
import { useNotes } from '../notes/notesContext'
import Cat from './Dog'

// A sticky note under the header showing the newest note you haven't seen.
export default function NoteBanner() {
  const { unseen, markSeen } = useNotes()
  const { pathname } = useLocation()

  // unseen is newest-first, so [0] is the latest. The Notes page shows them
  // all anyway, so the banner stays out of the way there.
  const note = unseen[0]
  if (!note || pathname === '/notes') return null

  return (
    // role="status": screen readers announce it when it appears.
    <div className="note-banner" role="status">
      <Cat name="love" size={56} label="" />
      <p>
        <strong>{note.sender_name || 'Your love'}:</strong> {note.message}
      </p>
      <span className="spacer" />
      <button onClick={() => markSeen(note)}>💗 Aww</button>
    </div>
  )
}
