import { useEffect, useState } from 'react'
import { listItems, subscribe } from './queue'

export function useQueue() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let version = 0

    async function refresh() {
      const request = ++version
      try {
        const nextItems = await listItems()
        if (active && request === version) {
          setItems(nextItems)
          setError('')
        }
      } catch (e) {
        if (active && request === version) setError(e.message)
      }
    }

    const unsubscribe = subscribe(refresh)
    refresh()
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return { items, error }
}
