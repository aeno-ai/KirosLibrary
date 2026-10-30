import { supabase } from './supabase'
import { unwrap } from './db'

const COLUMNS = 'id, category_id, title, url, created_at, updated_at'

export function safeLinkUrl(value) {
  try {
    const url = new URL(value.trim())
    return ['http:', 'https:'].includes(url.protocol) && url.href.length <= 2048
      ? url.href
      : null
  } catch {
    return null
  }
}

function requireLinkUrl(value) {
  const url = safeLinkUrl(value)
  if (!url) throw new Error('Enter a valid http or https link.')
  return url
}

export async function listLinks(categoryId) {
  return unwrap(
    await supabase
      .from('links')
      .select(COLUMNS)
      .eq('category_id', categoryId)
      .order('updated_at', { ascending: false }),
  )
}

export async function createLink(categoryId, { title, url }) {
  return unwrap(
    await supabase
      .from('links')
      .insert({ category_id: categoryId, title: title.trim(), url: requireLinkUrl(url) })
      .select(COLUMNS)
      .single(),
  )
}

export async function updateLink(id, { title, url }) {
  return unwrap(
    await supabase
      .from('links')
      .update({ title: title.trim(), url: requireLinkUrl(url) })
      .eq('id', id)
      .select(COLUMNS)
      .single(),
  )
}

export async function deleteLink(id) {
  unwrap(await supabase.from('links').delete().eq('id', id))
}
