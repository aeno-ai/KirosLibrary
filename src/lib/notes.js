import { supabase } from './supabase'
import { unwrap } from './db'

// The name shown on notes you send. Stored in your own account's
// "user_metadata" (a free-form JSON field Supabase keeps per user).
export function displayName(user) {
  return user.user_metadata?.display_name || user.email.split('@')[0]
}

export async function setDisplayName(name) {
  unwrap(await supabase.auth.updateUser({ data: { display_name: name.trim() } }))
}

// Newest first.
export async function listNotes(limit = 200) {
  return unwrap(
    await supabase.from('notes').select('*').order('created_at', { ascending: false }).limit(limit),
  )
}

export async function sendNote(message, senderName) {
  return unwrap(
    await supabase
      .from('notes')
      .insert({ message: message.trim(), sender_name: senderName })
      .select()
      .single(),
  )
}

export async function markSeen(id) {
  unwrap(await supabase.from('notes').update({ seen: true }).eq('id', id))
}

// Realtime: Supabase pushes database changes to the app over a WebSocket
// (one long-lived connection) the moment they happen, instead of the app
// asking "anything new?" over and over. Returns a function that unsubscribes.
export function subscribeToNotes({ onInsert, onUpdate }) {
  const channel = supabase
    .channel('notes-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes' }, (change) =>
      onInsert(change.new),
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notes' }, (change) =>
      onUpdate(change.new),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
