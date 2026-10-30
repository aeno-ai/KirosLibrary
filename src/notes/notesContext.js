import { createContext, useContext } from 'react'

// Shared by the header badge, the banner and the Notes page, so all three
// see the same list and update together. (Same split as auth/session.js.)
export const NotesContext = createContext(null)

export function useNotes() {
  return useContext(NotesContext)
}
