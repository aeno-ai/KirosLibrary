import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '../auth/session'
import {
  addFavorite,
  isFavorited,
  isPinned,
  listSavedItems,
  pinItem,
  removeFavorite,
  savedItemKey,
  unpinItem,
} from '../lib/savedItems'
import { SavedItemsContext } from './context'

const EMPTY_ITEMS = []

export function SavedItemsProvider({ children }) {
  const session = useSession()
  const userId = session?.user?.id ?? null
  const activeUserRef = useRef(userId)
  const pendingRef = useRef(new Set())
  const requestRef = useRef(0)
  const [savedState, setSavedState] = useState({ userId: null, items: [] })
  const [pending, setPending] = useState(new Set())
  const [operationErrors, setOperationErrors] = useState(new Map())
  const { items, error } = useMemo(() => (
    savedState.userId === userId
      ? { items: savedState.items, error: savedState.error ?? '' }
      : { items: userId ? null : EMPTY_ITEMS, error: '' }
  ), [savedState, userId])

  useEffect(() => {
    activeUserRef.current = userId
  }, [userId])

  const reload = useCallback(async () => {
    if (!userId) return
    const request = ++requestRef.current
    try {
      const rows = await listSavedItems()
      if (request === requestRef.current && activeUserRef.current === userId) {
        setSavedState({ userId, items: rows, error: '' })
      }
    } catch (err) {
      if (request === requestRef.current && activeUserRef.current === userId) {
        setSavedState({ userId, items: null, error: err.message })
      }
    }
  }, [userId])

  useEffect(() => {
    // Results are tagged with this account. The derived values above clear
    // immediately when it changes, while this counter ignores late requests.
    const request = ++requestRef.current
    let ignore = false
    if (!userId) return undefined

    listSavedItems().then(
      (rows) => {
        if (!ignore && request === requestRef.current && activeUserRef.current === userId) {
          setSavedState({ userId, items: rows, error: '' })
        }
      },
      (err) => {
        if (!ignore && request === requestRef.current && activeUserRef.current === userId) {
          setSavedState({ userId, items: null, error: err.message })
        }
      },
    )
    return () => {
      ignore = true
    }
  }, [userId])

  const changeFlag = useCallback(async (itemType, itemId, flag, value) => {
    if (!userId || !items) throw new Error('Saved items are still loading. Try again in a moment.')
    const itemKey = savedItemKey(itemType, itemId)
    const operationKey = `${userId}:${itemKey}:${flag}`
    if (pendingRef.current.has(operationKey)) return

    pendingRef.current.add(operationKey)
    setPending((previous) => new Set(previous).add(operationKey))
    setOperationErrors((previous) => {
      const next = new Map(previous)
      next.delete(operationKey)
      return next
    })

    try {
      if (flag === 'favorite') {
        await (value ? addFavorite(itemType, itemId) : removeFavorite(itemType, itemId))
      } else {
        await (value ? pinItem(itemType, itemId) : unpinItem(itemType, itemId))
      }

      if (activeUserRef.current === userId) {
        setSavedState((previous) => {
          if (previous.userId !== userId) return previous
          const list = previous.items ?? []
          const current = list.find((item) => item.item_type === itemType && item.item_id === itemId)
          const next = {
            ...(current ?? { item_type: itemType, item_id: itemId, is_favorite: false, is_pinned: false }),
            [flag === 'favorite' ? 'is_favorite' : 'is_pinned']: value,
            updated_at: new Date().toISOString(),
          }
          if (!next.is_favorite && !next.is_pinned) {
            return { ...previous, items: list.filter((item) => item !== current) }
          }
          return { ...previous, items: [next, ...list.filter((item) => item !== current)] }
        })
      }
    } catch (err) {
      if (activeUserRef.current === userId) {
        setOperationErrors((previous) => new Map(previous).set(operationKey, err.message))
      }
      throw err
    } finally {
      pendingRef.current.delete(operationKey)
      setPending((previous) => {
        const next = new Set(previous)
        next.delete(operationKey)
        return next
      })
    }
  }, [items, userId])

  const value = useMemo(() => ({
    items,
    loading: items === null,
    error,
    reload,
    isFavorite: (itemType, itemId) => isFavorited(items, itemType, itemId),
    isPinned: (itemType, itemId) => isPinned(items, itemType, itemId),
    isPending: (itemType, itemId, flag) => pending.has(`${userId}:${savedItemKey(itemType, itemId)}:${flag}`),
    operationError: (itemType, itemId, flag) => operationErrors.get(`${userId}:${savedItemKey(itemType, itemId)}:${flag}`) ?? '',
    setFavorite: (itemType, itemId, value) => changeFlag(itemType, itemId, 'favorite', value),
    setPinned: (itemType, itemId, value) => changeFlag(itemType, itemId, 'pinned', value),
  }), [changeFlag, error, items, operationErrors, pending, reload, userId])

  return <SavedItemsContext value={value}>{children}</SavedItemsContext>
}
