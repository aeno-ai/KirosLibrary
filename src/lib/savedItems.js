import { unwrap } from './db'
import { supabase } from './supabase'

const TYPES = new Set(['folder', 'file', 'note', 'link'])
const COLUMNS = 'item_type, item_id, is_favorite, is_pinned, created_at, updated_at'

export function savedItemKey(itemType, itemId) {
  return `${itemType}:${itemId}`
}

function requireSavedItem(itemType, itemId) {
  if (!TYPES.has(itemType) || !itemId) throw new Error('Unsupported item for Favorites or Quick Access.')
}

// RLS limits this query to auth.uid(); the browser never picks a user_id.
export async function listSavedItems() {
  return unwrap(
    await supabase
      .from('saved_items')
      .select(COLUMNS)
      .order('updated_at', { ascending: false }),
  )
}

async function setFlag(itemType, itemId, flag, value) {
  requireSavedItem(itemType, itemId)
  const { error } = await supabase.rpc('set_saved_item_flag', {
    p_item_type: itemType,
    p_item_id: itemId,
    p_flag: flag,
    p_value: value,
  })
  if (error) throw new Error(error.message)
}

export function pinItem(itemType, itemId) {
  return setFlag(itemType, itemId, 'pinned', true)
}

export function unpinItem(itemType, itemId) {
  return setFlag(itemType, itemId, 'pinned', false)
}

export function isPinned(items, itemType, itemId) {
  return Boolean(items?.find((item) => item.item_type === itemType && item.item_id === itemId)?.is_pinned)
}

async function selectSources(table, columns, ids) {
  const chunks = Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) =>
    ids.slice(index * 100, (index + 1) * 100),
  )
  try {
    const results = await Promise.all(
chunks.map(async (chunk) =>
  unwrap(
    await supabase
      .from(table)
      .select(columns)
      .in('id', chunk)
  )
),    )
    // A saved reference can outlive its source row. Keep malformed or partial
    // API results from reaching a card that expects a real source id.
    return results.flat().filter((row) => row?.id)
  } catch (error) {
    throw new Error(`Could not load saved ${table}: ${error.message}`)
  }
}

// Resolve the four source tables in batches, never once per saved card.
export async function resolveSavedItemSources(items) {
  const idsByType = Object.fromEntries([...TYPES].map((type) => [type, []]))
  const validItems = items.filter((item) => TYPES.has(item?.item_type) && item?.item_id)
  validItems.forEach((item) => idsByType[item.item_type].push(item.item_id))

  const [folders, files, notes, links] = await Promise.all([
    selectSources('categories', 'id, name, parent_id', idsByType.folder),
    selectSources('files', 'id, category_id, filename, storage_path, thumb_path, file_type, size_bytes, created_at', idsByType.file),
    selectSources('notes', 'id, category_id, title, body, created_at, updated_at', idsByType.note),
    selectSources('links', 'id, category_id, title, url, created_at, updated_at', idsByType.link),
  ])
  const sources = new Map()
  ;[
    ['folder', folders],
    ['file', files],
    ['note', notes],
    ['link', links],
  ].forEach(([type, rows]) => {
    rows.forEach((row) => {
      const sourceId = row?.id
      if (sourceId) sources.set(savedItemKey(type, sourceId), row)
    })
  })

  return validItems.map((saved) => ({
    saved,
    source: sources.get(savedItemKey(saved.item_type, saved.item_id)) ?? null,
  }))
}
