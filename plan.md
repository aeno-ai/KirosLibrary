# Kiro's Library: build the core app (phases 1–7 of the File Organizer plan)

## Context
Aeno pasted the original File Organizer plan and asked me to build it while they learn. Decisions:
- **I write the code directly**, one phase per commit. The doer-agent / HANDOFF card workflow is retired.
- **Explanations go in code comments** on the uncommon blocks only (not on obvious JSX/CSS). Each phase also ends with a short "Learn this" recap in chat (memory: teach-the-why).
- **Scope: the core app.** Love notes, the offline upload queue / TUS resumable uploads, and web push stay "later".
- **Supabase project already exists**, but it has no tables yet and `.env.local` isn't set up.

Current repo: Vite 8 + React 19, with `@supabase/supabase-js` 2.x and `react-router-dom` 7 already installed. The T2a demo strip is still uncommitted, `dist/` is tracked, and the demo assets remain. No app code exists yet.

Ground rules: no new npm dependencies (images use the browser canvas, the PWA uses a hand-written service worker). Work on a `core-app` branch with one commit per phase. Approving this plan authorizes those commits. Merge to `main` after you've tested with both accounts. Never read or commit `.env.local`.

## Phase 0: Cleanup (the old T2a-FIX)
- `git rm -r --cached dist` and `git rm src/assets/*`, then commit the already-stripped `App.jsx`/`App.css`/`index.css`.
- `.env.example` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- HANDOFF.md becomes a simple progress board. Drop the doer rules and add a note that the architect now implements directly. `plan.md` gets replaced with this roadmap and stays untracked.
- `index.html`: set the title to "Kiro's Library".

## Phase 1: Supabase (SQL by me, dashboard clicks by you)
New `supabase/schema.sql`, committed, which you paste into the SQL Editor once:
- `categories(id uuid pk default gen_random_uuid(), name text not null, parent_id uuid references categories on delete restrict, created_at timestamptz default now())`
- `files(id uuid pk, category_id uuid not null references categories on delete restrict, filename text, storage_path text, thumb_path text, file_type text, size_bytes bigint, uploader_id uuid default auth.uid() references auth.users, created_at timestamptz default now())`, plus indexes on `category_id` and `parent_id`.
- `on delete restrict`: a category can't be deleted while it still has subcategories or files. The UI says "empty it first", so storage files never get orphaned.
- RLS enabled on both tables, with policies `to authenticated using (true) with check (true)`. Only logged-in users get access, and with exactly 2 accounts that is the right rule.
- Private bucket `library` created via `insert into storage.buckets` with `file_size_limit` 25 MB and `allowed_mime_types` (images, PDF, plain text). That makes the server enforce validation as well. Add `storage.objects` policies for `authenticated` scoped to `bucket_id = 'library'`.

Your manual steps (I'll walk you through them):
1. Auth → Sign In / Providers: turn off "Allow new users to sign up".
2. Auth → Users → Add user ×2, with auto-confirm on.
3. Run `schema.sql`.
4. Settings → API Keys: copy the URL and publishable key into `.env.local`.

## Phase 2: Client, auth, routing
- `src/lib/supabase.js`: `createClient` from `import.meta.env`. It throws a clear error if either var is missing.
- `src/auth/AuthProvider.jsx`: React context holding the `session`. It uses `getSession()` on mount and `onAuthStateChange` (with cleanup).
- `src/auth/RequireAuth.jsx`: redirects to `/login` and remembers where you were.
- `src/pages/Login.jsx`: email + password with `signInWithPassword`. There is no sign-up form.
- `src/main.jsx`: wrap the app in `BrowserRouter` + `AuthProvider`.
- `src/App.jsx`: routes `/login`, `/` (top level), `/c/:id` (a category), `/search`, plus a header with search and sign-out.

## Phase 3: Categories
- `src/lib/categories.js`: `listChildren(parentId)` (uses `.is('parent_id', null)` for the top level, since `.eq` can't match null), `getCategory`, `getPath(id)` (walks up `parent_id` for breadcrumbs), `create`, `rename`, `remove` (turns the Postgres FK error `23503` into a friendly "not empty" message).
- `src/pages/Home.jsx` and `src/pages/Category.jsx`: subcategory list, new/rename/delete, and `src/components/Breadcrumbs.jsx`.

## Phase 4: Upload, gallery, thumbnails
- `src/lib/images.js`: `createImageBitmap` → canvas → `toBlob('image/webp')`. This produces (a) a compressed full image (max 2560px, quality 0.9, keeps the original if that comes out smaller; GIF/SVG pass through untouched) and (b) a 400px thumbnail.
- `src/lib/files.js`:
  - Validation: type allow-list and a 25 MB limit, the same as the bucket.
  - Storage paths are `${uuid}.${ext}` and `thumbs/${uuid}.webp`. They don't depend on the category, so moving a file is just a DB update.
  - `uploadMany(files, categoryId, onProgress)`: a small worker pool runs 3 uploads at a time. Each file does compress → upload the full image → upload the thumbnail → insert the row. If the row insert fails, it removes the uploaded objects again.
  - Paging `listFiles(categoryId, page)` via `.range()` in pages of 48, plus `signedUrls(paths)` using one batched `createSignedUrls` call (1-hour expiry).
- `src/components/UploadButton.jsx`: multi-select `<input type=file>` with a "3 / 10 uploaded" progress bar and per-file errors.
- `src/components/Gallery.jsx`: thumbnail grid with `loading="lazy"` and a "Load more" button.
- `src/components/FileViewer.jsx`: full image on click (non-images get a download link) and delete.

## Phase 5: Move and search
- `src/components/MoveDialog.jsx`: a category picker that drills into folders, then updates `category_id`.
- `src/pages/Search.jsx`: `ilike('filename', %q%)` across all files, with the category name shown for each result. The `q` term is escaped for `%` and `_`.

## Phase 6: PWA
- `public/manifest.webmanifest` (name, `display: standalone`, theme colour, icons) and `<link rel=manifest>` / `apple-touch-icon` in `index.html`.
- `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`: placeholder PNGs made by a throwaway Node `zlib` script in the scratchpad. Swap them for real art anytime.
- `public/sw.js`, hand-written:
  - The precached app shell is `/` and `index.html`.
  - Hashed `/assets/*` files are cache-first, since their names change whenever their content does.
  - Page navigations are network-first, falling back to the cached `index.html`.
  - Supabase signed thumbnail/image URLs are cache-first, **keyed by the URL with the `?token=` stripped**, because the token changes on every visit.
  - Old caches are versioned and cleaned up on `activate`.
- `src/main.jsx` registers the SW only in production builds (`import.meta.env.PROD`).

## Phase 7: Deploy prep (InfinityFree)
- `public/.htaccess` (Vite copies it into `dist/`) does two things. It forces HTTPS with a 301 redirect, and it sends any request that isn't a real file to `index.html` so refreshing `/c/123` works. It also sets `Cache-Control: no-cache` on `sw.js`.
- You upload the contents of `dist/` to `htdocs/` (I'll give you exact steps) and add the InfinityFree domain to Supabase Auth → URL Configuration.
- Note: the free Supabase tier pauses a project after about a week of inactivity, and the dashboard can restore it.

## Styling
`src/index.css`: small, mobile-first, light/dark via `color-scheme`, and a CSS grid gallery (`repeat(auto-fill, minmax(110px, 1fr))`). `App.css` gets deleted if it ends up unused.

## Verification
- After every phase: `npm run lint` (0 errors) and `npm run build` pass.
- Phases 2–5 (needs your `.env.local`): `npm run dev`, then
  - log in with each account
  - create nested categories, rename them, and confirm deleting a non-empty one is refused
  - upload 5+ screenshots at once and watch progress and thumbnails
  - open a full image, move a file, search for it, delete it
  - log out and confirm the routes redirect to `/login`
- RLS check: a `curl` against `/rest/v1/categories` with only the publishable key (not logged in) returns `[]`.
- PWA: `npm run build && npm run preview`. In DevTools → Application, the manifest is valid and the SW is active. Tick "Offline" and reload: the app opens and viewed thumbnails still show.
- Deploy: `http://` redirects to `https://`, refreshing a deep link works, and the app can be installed on the iPhone via Add to Home Screen.
