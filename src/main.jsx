import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import AuthProvider from './auth/AuthProvider'

// Only in the built app: in dev the worker would cache files that Vite is
// constantly changing, and you'd keep seeing stale code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Wait for "load" so registering doesn't compete with the first render.
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'))
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
