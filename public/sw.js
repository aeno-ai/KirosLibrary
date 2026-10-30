// Service worker: a script the browser runs in the background, separate from
// the page. It sits between the app and the network and decides, for every
// request, whether to answer from the network or from its own cache.
// That is what lets the app open, and show things you've seen, offline.
//
// It lives in public/ so it's served from the site root (/sw.js). A service
// worker can only control pages at or below its own folder.

// Bump VERSION whenever this file's logic changes; activate() then deletes
// the old caches.
const VERSION = 'v1'
const SHELL = `shell-${VERSION}` // index.html + the built JS/CSS
const DATA = `data-${VERSION}` // Supabase API reads (category and file lists)
const MEDIA = `media-${VERSION}` // thumbnails and full images

// install: runs once when a new version of this file is found.
self.addEventListener('install', (event) => {
  // waitUntil keeps the worker alive until the promise finishes.
  event.waitUntil(precacheShell())
  // Take over right away instead of waiting for every open tab to close.
  self.skipWaiting()
})

async function precacheShell() {
  const cache = await caches.open(SHELL)
  const response = await fetch('/', { cache: 'no-cache' })
  await cache.put('/', response.clone())
  // The page that registered us already loaded its JS before we existed, so
  // those files aren't cached yet. Read index.html and cache every /assets/
  // file it references, so the very next launch already works offline.
  const html = await response.text()
  const assets = [...html.matchAll(/\/assets\/[^"']+/g)].map((m) => m[0])
  await cache.addAll(['/manifest.webmanifest', '/favicon.svg', ...assets])
}

// activate: the new version is now in charge. Clean up old versions' caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL, DATA, MEDIA]
      for (const key of await caches.keys()) {
        if (!keep.includes(key)) await caches.delete(key)
      }
      // Start controlling already-open pages without a reload.
      await self.clients.claim()
    })(),
  )
})

// fetch: fires for every request the page makes, even to other sites.
// Not calling respondWith() means "let the browser handle it normally".
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return // uploads, logins, etc. always go live
  const url = new URL(request.url)

  // Page loads (typing a URL, refresh, opening from the Home Screen). It's a
  // single-page app, so every route is the same index.html.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL, '/'))
  } else if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    // Built files have a content hash in their name (index-DjWwUsgN.js): a
    // name never changes content, so the cached copy is always right.
    event.respondWith(cacheFirst(request, SHELL, request))
  } else if (url.pathname.startsWith('/rest/v1/')) {
    // Supabase database reads: fresh when online, last copy when offline.
    event.respondWith(networkFirst(request, DATA, request))
  } else if (url.pathname.startsWith('/storage/v1/object/sign/') && !url.searchParams.has('download')) {
    event.respondWith(cachedMedia(url))
  }
})

async function networkFirst(request, cacheName, cacheKey) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(cacheKey, response.clone())
    return response
  } catch (error) {
    // fetch() only throws when there's no network at all.
    const cached = await cache.match(cacheKey)
    if (cached) return cached
    throw error
  }
}

async function cacheFirst(request, cacheName, cacheKey) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(cacheKey)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(cacheKey, response.clone())
  return response
}

// Signed URLs look like .../sign/library/thumbs/abc.webp?token=eyJ...
// The token is different every time a URL is signed, so caching by the full
// URL would never hit twice. Key by the path only (the token stripped).
// File paths are random ids that are never reused, so the path alone
// identifies the file.
async function cachedMedia(url) {
  const key = url.origin + url.pathname
  const cache = await caches.open(MEDIA)
  const cached = await cache.match(key)
  if (cached) return cached
  // mode: 'cors' gets a readable response (Supabase allows it). The default
  // for <img> would be an "opaque" response we can't check, and Chrome
  // counts each opaque entry as ~7 MB against the storage quota.
  const response = await fetch(url.href, { mode: 'cors', credentials: 'omit' })
  if (response.ok) cache.put(key, response.clone())
  return response
}
