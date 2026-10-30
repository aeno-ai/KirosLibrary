import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Self-hosted fonts (from npm, not Google's servers): they get bundled with the
// app, so the service worker caches them and they still work offline.
// Only the Latin character set and the weights we actually use.
import '@fontsource/nunito/latin-400.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
import '@fontsource/fredoka/latin-600.css'
import '@fontsource/fredoka/latin-700.css'
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
