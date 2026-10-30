import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '../auth/session'
import { displayName, listNotes, markSeen, sendNote, subscribeToNotes } from '../lib/notes'
import { NotesContext } from './notesContext'

// Adds a note to a newest-first list, or replaces it if it's already there.
// Needed because a note you send arrives twice: once from sendNote()'s reply
// and once from Realtime. Matching by id keeps a single copy.
function upsert(list, note) {
  const rest = list.filter((n) => n.id !== note.id)
  return [note, ...rest].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export default function NotesProvider({ children }) {
  const session = useSession()
  const me = session.user
  const [notes, setNotes] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    listNotes().then(
      (rows) => !ignore && setNotes(rows),
      (e) => !ignore && setError(e.message),
    )
    const unsubscribe = subscribeToNotes({
      onInsert: (note) => setNotes((list) => upsert(list, note)),
      onUpdate: (note) => setNotes((list) => upsert(list, note)),
    })
    return () => {
      ignore = true
      unsubscribe()
    }
  }, [])

  const send = useCallback(
    async (message) => {
      const note = await sendNote(message, displayName(me))
      setNotes((list) => upsert(list, note))
      return note
    },
    [me],
  )

  const seen = useCallback(async (note) => {
    // Optimistic update: hide it right away, then tell the server.
    setNotes((list) => upsert(list, { ...note, seen: true }))
    await markSeen(note.id)
  }, [])

  // useMemo: only rebuild this object when its inputs change. Every component
  // using the context re-renders whenever the value is a new object.
  const value = useMemo(() => {
    const unseen = notes.filter((n) => n.sender_id !== me.id && !n.seen)
    return { notes, unseen, me, error, send, markSeen: seen }
  }, [notes, me, error, send, seen])

  return <NotesContext value={value}>{children}</NotesContext>
}
