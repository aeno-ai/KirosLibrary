# How Kiro's Library works

A guide for learning the codebase: what each file does, how the files talk to each other, and what happens step by step when you log in, open a folder, upload, or go offline.

The code itself has comments on the unusual parts. This doc is the map, and the comments are the street signs.

---

## 1. The big picture

```
            ┌──────────────────────────────────────────────┐
            │  Your phone / laptop (the browser)            │
            │                                              │
            │   React app (src/)  ◄──►  Service worker     │
            │        │                  (public/sw.js)     │
            └────────┼──────────────────────┼──────────────┘
                     │ HTTPS                │ caches copies
         ┌───────────┴──────────┐           │
         ▼                      ▼           ▼
  InfinityFree             Supabase (one project)
  (just a file host)       ├─ Auth      : who are you? (2 accounts)
  serves index.html,       ├─ Postgres  : categories + files tables
  JS, CSS, icons           │              guarded by RLS
  ONCE per visit           └─ Storage   : the real image/PDF bytes,
                                          private bucket "library"
```

**The key idea:** InfinityFree runs none of your code. It only hands the browser some static files. All the real work happens **in the browser**, which talks **directly to Supabase**. No PHP or Node server sits in between. That's safe only because of **Row Level Security** (RLS) in the database: the database itself checks "is this request from a logged-in user?" on every query.

---

## 2. Every file and what it does

### Root

| File | What it does |
|------|--------------|
| `index.html` | The one and only HTML page. It has an empty `<div id="root">` that React fills in, plus the PWA tags (manifest, icon, theme colour). |
| `vite.config.js` | Tells Vite (the build tool) to understand React/JSX. |
| `package.json` | The project's dependencies and scripts (`npm run dev`, `build`, `lint`, `preview`). |
| `.env` (not in git) | Your Supabase URL and publishable key. Vite injects anything starting with `VITE_` into the code at build time. |
| `.env.example` | A template showing which variables `.env` needs. Committed, but holds no real values. |
| `.gitignore` | Keeps `node_modules`, `dist`, and `.env` files out of git. |
| `HANDOFF.md` | The phase progress board. |
| `supabase/schema.sql` | The database setup: tables, indexes, RLS policies, storage bucket. You paste it into Supabase once. |

### `src/` is the React app

**Startup**

| File | What it does |
|------|--------------|
| `main.jsx` | The entry point. It registers the service worker (production only) and renders `<App>` wrapped in the router and the auth provider. |
| `App.jsx` | The route table: which URL shows which page, and which pages need a login. |
| `index.css` | All the styling: colours (with dark mode), layout, gallery grid, dialogs. |

**`src/lib/` holds the "talk to Supabase" layer (no UI here)**

| File | What it does |
|------|--------------|
| `supabase.js` | Creates the single Supabase client that every other file imports. It fails loudly if `.env` is missing. |
| `db.js` | `unwrap()` turns Supabase's `{ data, error }` replies into normal values or thrown errors, and translates Postgres error codes into friendly messages. |
| `categories.js` | Category CRUD, plus the helpers `childrenOf()` and `pathTo()` and the `useCategories()` hook. |
| `files.js` | Upload (with a worker pool), list with paging, signed URLs, move, search, delete. |
| `images.js` | Compresses images and makes thumbnails in the browser using a `<canvas>`. |

**`src/auth/` decides who is logged in**

| File | What it does |
|------|--------------|
| `session.js` | The `SessionContext` and the `useSession()` hook any component can call. |
| `AuthProvider.jsx` | Listens to Supabase for login/logout and puts the current session into the context. |
| `RequireAuth.jsx` | A guard around private routes. Not logged in → redirect to `/login`. |

**`src/pages/` holds the full screens (one per route)**

| File | Route | What it does |
|------|-------|--------------|
| `Login.jsx` | `/login` | Email + password form. There is no sign-up form on purpose. |
| `Folder.jsx` | `/` and `/c/:id` | One page for both the top level and inside a category: subfolders, add/rename/delete, upload, gallery. |
| `Search.jsx` | `/search?q=…` | Finds files by name across all categories. |

**`src/components/` holds the pieces used inside pages**

| File | Used by | What it does |
|------|---------|--------------|
| `Layout.jsx` | App routes | Top bar (title, search box, sign out) around every private page. |
| `Breadcrumbs.jsx` | Folder | "Library / Screenshots / 2026" links. |
| `UploadButton.jsx` | Folder | File picker, progress bar, failure list. |
| `Gallery.jsx` | Folder | Thumbnail grid, "Load more", opens the viewer. |
| `FileViewer.jsx` | Gallery, Search | Popup with the full image, download, move, delete. |
| `MovePicker.jsx` | FileViewer | Folder browser for choosing where to move a file. |

### `public/` holds files copied into the build as-is

| File | What it does |
|------|--------------|
| `sw.js` | The **service worker**: caches the app and what you've viewed so it works offline. |
| `manifest.webmanifest` | Makes the site installable as an app (name, icon, full-screen mode). |
| `icons/*.png` | App icons (placeholders, so replace them anytime with the same file names and sizes). |
| `.htaccess` | Apache settings for InfinityFree: force HTTPS and send every route to `index.html`. |
| `favicon.svg` | The browser tab icon. |

---

## 3. Who imports whom

Arrows mean "imports / uses".

```
main.jsx
 ├─► AuthProvider.jsx ──► lib/supabase.js
 │        └─► auth/session.js  (provides the session)
 └─► App.jsx
      ├─► pages/Login.jsx ─────────────► lib/supabase.js, auth/session.js
      └─► auth/RequireAuth.jsx ────────► auth/session.js
           └─► components/Layout.jsx ──► lib/supabase.js, auth/session.js
                ├─► pages/Folder.jsx ──► lib/categories.js
                │    ├─► Breadcrumbs.jsx
                │    ├─► UploadButton.jsx ──► lib/files.js
                │    └─► Gallery.jsx ───────► lib/files.js
                │         └─► FileViewer.jsx ──► lib/files.js
                │              └─► MovePicker.jsx ──► lib/categories.js, lib/files.js
                └─► pages/Search.jsx ──► lib/files.js
                     └─► FileViewer.jsx

lib/categories.js ─► lib/db.js, lib/supabase.js
lib/files.js ──────► lib/db.js, lib/supabase.js, lib/images.js
```

**The rule this follows:** components never call `supabase` for data directly. They call a function in `src/lib/`, which does the Supabase call. (Login and sign-out are the two small exceptions, since they *are* the auth calls.) So if Supabase changes its API, you fix `lib/`, not 10 components.

---

## 4. What happens when…

### …you open the app

1. The browser downloads `index.html` from InfinityFree. (The `.htaccess` file makes `/c/123` serve `index.html` too.)
2. `index.html` loads the built JS, which runs `main.jsx`.
3. `AuthProvider` subscribes to `supabase.auth.onAuthStateChange`. It fires right away with the session saved in `localStorage` (or `null`).
4. While the session is `undefined` (not known yet), `RequireAuth` shows "Loading…".
5. If the session is `null`, you're redirected to `/login`, and the page you wanted is remembered in `location.state`. If you're logged in, `Layout` and the right page render.

### …you log in

1. `Login.jsx` calls `supabase.auth.signInWithPassword()`.
2. Supabase checks the password and returns a session (an access token, a JWT, plus a refresh token). supabase-js saves it in `localStorage`.
3. That fires `onAuthStateChange`. `AuthProvider` stores the new session, and every component using `useSession()` re-renders.
4. `Login` now sees a session and renders `<Navigate>` to where you were going.

You never pass the token around yourself: supabase-js attaches it to every later request automatically. That token is how RLS knows you're `authenticated`.

### …you open a category (`/c/abc-123`)

1. React Router matches `c/:id`, and `Folder` reads `id` with `useParams()`.
2. `useCategories()` fetches **all** categories in one query, and the page computes the subfolders (`childrenOf`) and breadcrumbs (`pathTo`) in the browser.
3. `Gallery` (rendered with `key={id + upload count}`) calls `listFiles(id, 0)`. That fetches 49 rows, shows 48, and uses the 49th to know there's a "Load more".
4. The bucket is private, so `signedUrls()` asks Supabase for temporary links (1 hour) for all thumbnails in **one** request.
5. The `<img loading="lazy">` tags download thumbnails as you scroll.

```
Folder ──listCategories()──► Supabase DB  (RLS: logged in? ✓)
Gallery ─listFiles()───────► Supabase DB
Gallery ─signedUrls()──────► Supabase Storage → returns ?token=… links
<img src=signed link> ─────► Supabase Storage (through sw.js, which caches it)
```

### …you upload 10 screenshots

1. `UploadButton` gets the files from the `<input type="file" multiple>`.
2. `uploadMany()` starts **3 workers**. Each one pulls the next file from the queue until the queue is empty.
3. For each file, `uploadOne()`:
   1. `validate()` checks the type and the 25 MB limit.
   2. `prepareFile()` (images.js) decodes the image, makes a 400 px thumbnail, and makes a compressed copy (max 2560 px). It keeps the original if that's smaller.
   3. It uploads the full file to `library/<random-id>.webp`.
   4. It uploads the thumbnail to `library/thumbs/<random-id>.webp`.
   5. It inserts a row in `files`, and the database fills in `uploader_id`.
   6. If any step fails, it deletes what was already uploaded, so no orphan files are left.
4. After each file, `onProgress` updates the progress bar.
5. When all are done, `Folder` bumps its upload counter. That changes the Gallery's `key`, so React mounts a fresh Gallery that loads the new files.

### …you move or delete a file

- **Move** only updates `files.category_id`. The stored file never moves, because its path is a random id rather than the folder name.
- **Delete** removes the database row **first**, then the stored bytes. If the second step fails, you only waste a little space. Doing it the other way round could leave a row pointing at nothing.
- **Deleting a category** that still has things in it is refused **by the database** (`on delete restrict`). `db.js` turns the error code `23503` into "This category isn't empty…".

### …you're offline

`public/sw.js` handles requests differently depending on what they are:

| Request | Strategy | Why |
|---------|----------|-----|
| Opening any page | Network first, else cached `index.html` | You get the newest app when online and still get an app when offline. |
| `/assets/index-XXXX.js` | Cache first | The hash in the name changes whenever the content changes, so a cached copy is never stale. |
| Supabase `/rest/v1/…` (lists) | Network first, else cache | Fresh data online, last-seen data offline. |
| Supabase signed images | Cache first, **keyed without the token** | The token is different on every visit, so the cache key ignores it. |
| Anything else (logins, uploads) | Not touched | Writes must really reach the server. |

Offline, `files.js` can't get new signed URLs, so it builds token-less URLs (`offlineUrl`). Supabase would reject those, but the service worker answers them from its cache first. **Result:** folders and images you've viewed before still show offline. Signing out deletes those cached copies.

---

## 5. Concepts to learn from this codebase

| Concept | Where to see it | One-line explanation |
|---------|-----------------|----------------------|
| Row Level Security | `supabase/schema.sql` | The database checks permissions on every row, so a public key is safe. |
| Foreign keys + `restrict` | `schema.sql` | Postgres refuses to delete a parent that still has children. |
| `NULLS NOT DISTINCT` | `schema.sql` | Makes "no duplicate names at the top level" work, because NULL normally ≠ NULL. |
| Signed URLs | `files.js` | Temporary links to private files. |
| Context + custom hook | `session.js`, `useCategories()` | Share data without passing props through every level. |
| Effect with `ignore` flag | `categories.js`, `Gallery.jsx`, `Search.jsx` | Throws away responses that arrive after the component is gone or the input changed. |
| `key` to reset a component | `Folder.jsx` → `Gallery` | A new key gives a brand-new component with fresh state. |
| Worker pool | `uploadMany()` in `files.js` | N async workers sharing one queue = limited parallelism. |
| Canvas image processing | `images.js` | Resize/re-encode in the browser, with no server needed. |
| Native `<dialog>` | `FileViewer.jsx` | A built-in modal with Esc, focus trap, and backdrop for free. |
| URL as state | `Search.jsx` | `?q=` survives refresh and Back. |
| Service worker caching | `public/sw.js` | A programmable proxy inside the browser. |
| SPA rewrite | `public/.htaccess` | Every unknown path → `index.html`, and React Router takes over. |
| Build-time env vars | `supabase.js` | `import.meta.env.VITE_*` is replaced with real text at build time. |

**A real bug from building this:** before `.env` existed, `npm run build` made a tiny bundle that only threw an error. Vite had replaced the missing env vars with `undefined`, so `if (!url) throw` became an unconditional throw, and the bundler deleted all the code after it as unreachable. Lesson: env vars are baked into the build, so **rebuild after changing `.env`**.

---

## 6. Setup and deploy checklist

### Supabase (once)
1. **Project Settings → API Keys:** the URL in `.env` must look like `https://<project-ref>.supabase.co`. That's the *API* URL, not the dashboard page address.
2. **SQL Editor → New query:** paste all of `supabase/schema.sql` → Run.
3. **Authentication → Sign In / Providers:** turn **off** "Allow new users to sign up".
4. **Authentication → Users → Add user** twice (one per person), with "Auto Confirm User" ticked.
5. After deploying: **Authentication → URL Configuration**, set Site URL to your InfinityFree `https://` address.

### Run locally
```
npm run dev       # http://localhost:5173, with live reload, and no service worker
npm run build     # makes dist/
npm run preview   # serves dist/ like production, with the service worker
npm run lint      # code checks
```

### Deploy to InfinityFree
1. `npm run build`.
2. In the InfinityFree control panel, open the **File Manager** (or use FTP with FileZilla) and go into `htdocs/`.
3. Delete the default `index2.html` if it's there. Upload **the contents of** `dist/` (not the `dist` folder itself), including the hidden `.htaccess`.
4. Turn on the free SSL certificate in the control panel, and wait until it's active.
5. Test: `http://` should redirect to `https://`, refreshing `/c/<id>` should still work, and on iPhone use Safari → Share → **Add to Home Screen**.

For every later update, run `npm run build` and re-upload `dist/`. The service worker picks up the new version on the next launch.

### Watch out for
- **Free Supabase projects pause** after about a week with no activity. Restore from the dashboard.
- Free-tier storage is limited, so watch Storage usage in the dashboard. Compression and thumbnails help a lot.

---

## 7. Try it yourself

1. **See RLS work:** while logged out, open `https://<project-ref>.supabase.co/rest/v1/categories?apikey=<your publishable key>` in a browser. You get an empty list or "permission denied", never your data.
2. **Watch the worker pool:** open DevTools → Network, upload 6 images, and see that only ~3 uploads run at once.
3. **Watch compression:** upload a big PNG screenshot, then compare its size in Supabase Storage with the original.
4. **Go offline:** `npm run build && npm run preview`, open a folder, then DevTools → Network → "Offline" → reload. The folder and its thumbnails still appear.
5. **Break it on purpose:** in `Folder.jsx`, remove `key={…}` from `<Gallery>`, upload a file, and notice the gallery doesn't refresh. Then put it back.
6. **Read the service worker live:** DevTools → Application → Service Workers and Cache Storage show the three caches filling up.
