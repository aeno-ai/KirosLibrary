import { createContext, useContext } from 'react'

// A context lets any component read the session without passing it down
// through every level as a prop. It lives in its own file (not next to
// AuthProvider) so fast refresh keeps working: a .jsx file should only export
// components.
//
// Value: undefined = still checking, null = logged out, object = logged in.
export const SessionContext = createContext(undefined)

export function useSession() {
  return useContext(SessionContext)
}
