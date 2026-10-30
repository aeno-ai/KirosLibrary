import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from '../auth/session'
import {
  isPinned,
  listSavedItems,
  pinItem,
  savedItemKey,
  unpinItem,
} from '../lib/savedItems'
import { SavedItemsContext } from './context'

const EMPTY_ITEMS = []

// Only show pinned items.
// Old favorite-only records may still exist in Supabase.
function onlyPinned(rows) {
  return rows.filter((item) => item.is_pinned)
}

export function SavedItemsProvider({ children }) {
  const session = useSession()
  const userId = session?.user?.id ?? null

  const activeUserRef = useRef(userId)
  const pendingRef = useRef(new Set())
  const requestRef = useRef(0)

  const [savedState, setSavedState] = useState({
    userId: null,
    items: [],
  })

  const [pending, setPending] = useState(new Set())
  const [operationErrors, setOperationErrors] = useState(new Map())

  // Prevent saved items from one account appearing in another.
  const { items, error } = useMemo(() => (
    savedState.userId === userId
      ? {
          items: savedState.items,
          error: savedState.error ?? '',
        }
      : {
          items: userId ? null : EMPTY_ITEMS,
          error: '',
        }
  ), [savedState, userId])

  useEffect(() => {
    activeUserRef.current = userId
  }, [userId])

  // Reload pinned items from Supabase.
  const reload = useCallback(async () => {
    if (!userId) return

    const request = ++requestRef.current

    try {
      const rows = await listSavedItems()

      if (
        request === requestRef.current &&
        activeUserRef.current === userId
      ) {
        setSavedState({
          userId,
          items: onlyPinned(rows),
          error: '',
        })
      }
    } catch (err) {
      if (
        request === requestRef.current &&
        activeUserRef.current === userId
      ) {
        setSavedState({
          userId,
          items: null,
          error: err.message,
        })
      }
    }
  }, [userId])

  // Load pinned items whenever the signed-in account changes.
  useEffect(() => {
    const request = ++requestRef.current
    let ignore = false

    if (!userId) return undefined

    listSavedItems().then(
      (rows) => {
        if (
          !ignore &&
          request === requestRef.current &&
          activeUserRef.current === userId
        ) {
          setSavedState({
            userId,
            items: onlyPinned(rows),
            error: '',
          })
        }
      },
      (err) => {
        if (
          !ignore &&
          request === requestRef.current &&
          activeUserRef.current === userId
        ) {
          setSavedState({
            userId,
            items: null,
            error: err.message,
          })
        }
      },
    )

    return () => {
      ignore = true
    }
  }, [userId])

  // Pin or unpin an item.
  const changePinned = useCallback(async (itemType, itemId, value) => {
    if (!userId || !items) {
      throw new Error('Pinned items are still loading. Try again in a moment.')
    }

    const itemKey = savedItemKey(itemType, itemId)
    const operationKey = `${userId}:${itemKey}:pinned`

    // Prevent duplicate operations for the same item.
    if (pendingRef.current.has(operationKey)) return

    pendingRef.current.add(operationKey)

    setPending((previous) =>
      new Set(previous).add(operationKey)
    )

    setOperationErrors((previous) => {
      const next = new Map(previous)
      next.delete(operationKey)
      return next
    })

    try {
      // Save the change to Supabase first.
      if (value) {
        await pinItem(itemType, itemId)
      } else {
        await unpinItem(itemType, itemId)
      }

      // Only update the currently signed-in account's state.
      if (activeUserRef.current === userId) {
        setSavedState((previous) => {
          if (previous.userId !== userId) return previous

          const list = previous.items ?? []

          const current = list.find(
            (item) =>
              item.item_type === itemType &&
              item.item_id === itemId
          )

          // Remove an unpinned item from the visible list.
          if (!value) {
            return {
              ...previous,
              items: list.filter((item) => item !== current),
            }
          }

          // Add or update the pinned item.
          const next = {
            ...(current ?? {
              item_type: itemType,
              item_id: itemId,
            }),
            is_pinned: true,
            updated_at: new Date().toISOString(),
          }

          return {
            ...previous,
            items: [
              next,
              ...list.filter((item) => item !== current),
            ],
          }
        })
      }
    } catch (err) {
      if (activeUserRef.current === userId) {
        setOperationErrors((previous) =>
          new Map(previous).set(operationKey, err.message)
        )
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

  // Provide pin-related functions to other components.
  const value = useMemo(() => ({
    items,
    loading: items === null,
    error,
    reload,

    isPinned: (itemType, itemId) =>
      isPinned(items, itemType, itemId),

    // Keep the optional flag argument for existing components.
    isPending: (itemType, itemId, flag = 'pinned') =>
      pending.has(
        `${userId}:${savedItemKey(itemType, itemId)}:${flag}`
      ),

    operationError: (itemType, itemId, flag = 'pinned') =>
      operationErrors.get(
        `${userId}:${savedItemKey(itemType, itemId)}:${flag}`
      ) ?? '',

    setPinned: (itemType, itemId, value) =>
      changePinned(itemType, itemId, value),

  }), [
    changePinned,
    error,
    items,
    operationErrors,
    pending,
    reload,
    userId,
  ])

  return (
    <SavedItemsContext value={value}>
      {children}
    </SavedItemsContext>
  )
}