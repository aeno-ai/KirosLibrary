import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import Folder from './pages/Folder'
import Login from './pages/Login'
import Search from './pages/Search'
import { SavedItemsProvider } from './saved/SavedItemsProvider'
import SavedItems from './pages/SavedItems'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Nested routes: RequireAuth checks the login, then Layout draws the
          header, then the matching page renders inside Layout's <Outlet />. */}
      <Route element={<RequireAuth />}>
        <Route element={<SavedItemsProvider><Layout /></SavedItemsProvider>}>
          <Route index element={<Folder />} />
          {/* :id is a URL parameter, read with useParams() in Folder. */}
          <Route path="c/:id" element={<Folder />} />
          <Route path="search" element={<Search />} />
          <Route path="pinned" element={<SavedItems />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
