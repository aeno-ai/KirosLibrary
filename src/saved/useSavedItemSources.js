import { useCallback, useEffect, useMemo, useState } from 'react'
import { resolveSavedItemSources } from '../lib/savedItems'
import useSavedItems from './useSavedItems'

// Keeps Favorites and Quick Access on the same batched source-loading path.
export default function useSavedItemSources(flag, limit) {
  const { items, loading: savedLoading, error: savedError } = useSavedItems()
  const saved = useMemo(
    () => (items ? items.filter((item) => item[flag]).slice(0, limit) : null),
    [flag, items, limit],
  )
  const [result, setResult] = useState({ key: null, rows: null, error: '' })
  const [version, setVersion] = useState(0)
  const queryKey = `${version}:${saved?.map((item) => `${item.item_type}:${item.item_id}:${item.updated_at}`).join('|') ?? 'loading'}`

  useEffect(() => {
    let ignore = false
    if (!saved) return undefined
    resolveSavedItemSources(saved).then(
      (rows) => !ignore && setResult({ key: queryKey, rows, error: '' }),
      (err) => !ignore && setResult({ key: queryKey, rows: null, error: err.message }),
    )
    return () => {
      ignore = true
    }
  }, [queryKey, saved])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  const resolved = result.key === queryKey
  return {
    rows: resolved ? result.rows : null,
    loading: (savedLoading || !resolved) && !savedError,
    error: savedError || (resolved ? result.error : ''),
    reload,
  }
}
