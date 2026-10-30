import { useContext } from 'react'
import { SavedItemsContext } from './context'

export default function useSavedItems() {
  const context = useContext(SavedItemsContext)
  if (!context) throw new Error('SavedItemsProvider is missing.')
  return context
}
