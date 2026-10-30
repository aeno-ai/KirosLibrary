import { createClient } from '@supabase/supabase-js'

// Vite replaces import.meta.env.VITE_* with the values from .env.local at
// build time. Only VITE_-prefixed vars are exposed, and everything exposed
// ends up in the public JS bundle, which is why this is the publishable key.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Fail loudly at startup instead of with confusing network errors later.
if (!url || !key) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. ' +
      'Copy .env.example to .env.local, fill it in, then restart npm run dev.',
  )
}

export const supabase = createClient(url, key)

export const BUCKET = 'library'
