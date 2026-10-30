import { supabase } from './supabase'
import { escapeLike, unwrap } from './db'

const COLUMNS = 'id, category_id, title, body, created_at, updated_at'
export const MAX_BODY = 20000

// What to show when a note has no title: its first line.
export function noteTitle(note) {
  return note.title.trim() || note.body.trim().split('\n')[0].slice(0, 80) || 'Untitled note'
}

// All notes in a folder, most recently edited first. Notes are small text
// rows, so a folder's notes load in one go (no paging like files).
export async function listNotes(categoryId) {
  return unwrap(
    await supabase
      .from('notes')
      .select(COLUMNS)
      .eq('category_id', categoryId)
      .order('updated_at', { ascending: false }),
  )
}

export async function createNote(categoryId, { title, body }) {
  return unwrap(
    await supabase
      .from('notes')
      .insert({ category_id: categoryId, title: title.trim(), body })
      .select(COLUMNS)
      .single(),
  )
}

// updated_at isn't sent: a database trigger stamps it (supabase/02-notes.sql).
export async function updateNote(id, { title, body }) {
  return unwrap(
    await supabase
      .from('notes')
      .update({ title: title.trim(), body })
      .eq('id', id)
      .select(COLUMNS)
      .single(),
  )
}

export async function deleteNote(id) {
  unwrap(await supabase.from('notes').delete().eq('id', id))
}

export async function moveNote(id, categoryId) {
  unwrap(await supabase.from('notes').update({ category_id: categoryId }).eq('id', id))
}

// Matches the title OR the text. Two simple queries merged in the browser,
// instead of one .or() filter string, where commas or brackets typed into
// the search box would break the filter syntax.
export async function searchNotes(term) {
  const pattern = `%${escapeLike(term)}%`
  const query = (column) =>
    supabase
      .from('notes')
      .select(`${COLUMNS}, categories(id, name)`)
      .ilike(column, pattern)
      .order('updated_at', { ascending: false })
      .limit(50)
  const [byTitle, byBody] = await Promise.all([query('title'), query('body')])
  // A note matching both would appear twice; a Map keyed by id keeps one.
  const merged = new Map([...unwrap(byTitle), ...unwrap(byBody)].map((n) => [n.id, n]))
  return [...merged.values()].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}
