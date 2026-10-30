import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { unwrap } from './db'

export async function listCategories() {
  return unwrap(await supabase.from('categories').select('id, name, parent_id'))
}

export async function createCategory(name, parentId) {
  return unwrap(
    await supabase
      .from('categories')
      .insert({ name: name.trim(), parent_id: parentId })
      // insert() returns nothing by default; select() asks for the new row back.
      .select('id, name, parent_id')
      .single(),
  )
}

export async function renameCategory(id, name) {
  unwrap(await supabase.from('categories').update({ name: name.trim() }).eq('id', id))
}

export async function deleteCategory(id) {
  unwrap(await supabase.from('categories').delete().eq('id', id))
}

// Children of a folder, A to Z. parentId null = top level.
export function childrenOf(categories, parentId) {
  return categories
    .filter((c) => c.parent_id === parentId)
    // localeCompare with numeric: true sorts "Week 2" before "Week 10".
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
}

// Walks parent_id links upward and returns [top level, ..., current].
export function pathTo(categories, id) {
  const byId = new Map(categories.map((c) => [c.id, c]))
  const path = []
  let current = byId.get(id)
  // The seen-set guards against a loop (A -> B -> A) ever hanging the page.
  const seen = new Set()
  while (current && !seen.has(current.id)) {
    seen.add(current.id)
    path.unshift(current)
    current = byId.get(current.parent_id)
  }
  return path
}

// A custom hook: a reusable bundle of state + effects. Any page calling
// useCategories() gets the full list and a reload() to call after changes.
export function useCategories() {
  const [categories, setCategories] = useState(null)
  const [error, setError] = useState('')

  // First load. The "ignore" flag is React's standard guard for fetching in
  // an effect: if the component unmounts before the response arrives, the
  // cleanup flips the flag and the late response is thrown away.
  useEffect(() => {
    let ignore = false
    listCategories().then(
      (data) => !ignore && setCategories(data),
      (e) => !ignore && setError(e.message),
    )
    return () => {
      ignore = true
    }
  }, [])

  // Called by event handlers (after create/rename/delete), not by an effect.
  // useCallback keeps the same function between renders.
  const reload = useCallback(async () => {
    try {
      setCategories(await listCategories())
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [])

  return { categories, error, reload }
}
