import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './auth/RequireAuth'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Nested routes: RequireAuth checks the login, then Layout draws the
          header, then the matching page renders inside Layout's <Outlet />. */}
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
