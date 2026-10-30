import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import NotesProvider from './notes/NotesProvider'
import Folder from './pages/Folder'
import Login from './pages/Login'
import Notes from './pages/Notes'
import Search from './pages/Search'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Nested routes: RequireAuth checks the login, then Layout draws the
          header, then the matching page renders inside Layout's <Outlet />. */}
      <Route element={<RequireAuth />}>
        {/* NotesProvider wraps Layout so the header badge, the banner and the
            Notes page all share one list and one Realtime connection. */}
        <Route
          element={
            <NotesProvider>
              <Layout />
            </NotesProvider>
          }
        >
          <Route index element={<Folder />} />
          {/* :id is a URL parameter, read with useParams() in Folder. */}
          <Route path="c/:id" element={<Folder />} />
          <Route path="search" element={<Search />} />
          <Route path="notes" element={<Notes />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
