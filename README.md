# Kiro's Library

A private, installable library for organizing files, notes, and web links into folders. The app is a client-side React application backed by Supabase; it can be deployed as a static website.

## Features

- **Folders:** create, rename, delete, and navigate nested folders.
- **Files:** upload images, PDFs, and plain-text files; preview, download, move, and delete them.
- **Notes:** create and edit text notes displayed as yellow cards in a folder.
- **Links:** save a title and an HTTP(S) URL as a green card; select a card to open the link in a new tab, edit it, or delete it.
- **Favorites and Pins:** heart any folder, file, note, or link, and pin important items into the homepage Quick Access section. These are personal to the signed-in account; they never change the shared library item.
- **Kiro mascot:** the approved white-puppy poses appear at login, loading, upload preparation, and empty-folder states. Small transparent WebP assets and CSS-only motion keep Kiro available offline without an animation library.
- **Search:** find files and notes across folders.
- **Uploads that handle interruptions:** files are prepared in the browser, queued in IndexedDB, and uploaded resumably. The queue survives page reloads, retries after reconnecting, and shows failed uploads.
- **Offline support:** the installable PWA caches the app shell and previously viewed folder data and media. New uploads can wait in the queue until you reconnect. Sign-out clears cached private viewing data.
- **Private access:** sign in with an account created by the project owner. Supabase Auth and database Row Level Security protect app data.
- **Responsive interface:** mobile-friendly layout, dark-mode colors, and self-hosted fonts.

Uploads are limited to 25 MB per file. Supported formats are PNG, JPEG, WebP, GIF, HEIC, HEIF, PDF, and plain text. Resizable images are compressed and given thumbnails in the browser.

## Tech stack

- **Frontend:** JavaScript, React 19, React Router 7, CSS
- **Build and development:** Vite 8
- **Backend:** Supabase Auth, PostgreSQL, Row Level Security, and private Supabase Storage
- **Uploads and local persistence:** TUS resumable uploads and IndexedDB (`idb-keyval`)
- **Progressive Web App:** browser service worker and Web App Manifest
- **Code checks:** Oxlint

## Run locally

### 1. Requirements

Install Node.js and npm, then clone the repository and install dependencies:

```sh
git clone https://github.com/aeno-ai/KirosLibrary.git
cd KirosLibrary
npm install
```

### 2. Configure Supabase

Create a Supabase project. In the project dashboard, find the project URL and its **publishable key** (or legacy `anon` key). Create a `.env.local` file in the project root:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

These `VITE_` values are included in the browser app, so **never use a Supabase `service_role` or secret key here**. Access is protected by Supabase Auth and Row Level Security.

In Supabase, enable email/password sign-in, create the accounts that should have access, and disable public sign-ups if the library is intended to be private.

### 3. Create the database and storage

Run the SQL setup scripts in the Supabase **SQL Editor**, in this order:

1. `supabase/schema.sql` — folders, files, storage bucket, and access policies.
2. `supabase/02-notes.sql` — notes table and its timestamp trigger.
3. `supabase/03-links.sql` — links table and its timestamp trigger.

**Important for fresh clones:** `/supabase/` is currently ignored by this repository's `.gitignore`, so these SQL scripts are not included in Git checkouts. Obtain the scripts from the project owner, or change the ignore rule and commit the scripts if you want other developers to set up their own Supabase project from the repository. The scripts contain database setup, not credentials.

4. `supabase/04-RLS.sql` — the private-library member gate, required before the saved-items migration.
5. `supabase/05-saved-items.sql` — personal Favorites and Quick Access pins.

Run `05-saved-items.sql` manually in the Supabase SQL Editor; it is not run by the app. It creates an RLS-protected table whose rows are limited to the current `auth.uid()` and the `04-RLS.sql` member gate, so one account cannot read or change another account's favorites or pins. The migration also removes a saved-item row automatically when both states are cleared.

### 4. Start the development server

```sh
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). Development mode uses live reload and does not register the production service worker.

## Common commands

```sh
npm run dev       # Start the local development server
npm run lint      # Run Oxlint
npm run build     # Build the production app into dist/
npm run preview   # Preview the production build locally
```

Environment values are baked into the build. After changing `.env.local`, restart the development server or rebuild before deploying.

## Deploy

Run `npm run build`, then publish the **contents** of `dist/` to a static web host. Configure the host to serve `index.html` for app routes such as `/c/<folder-id>`; this SPA fallback is needed for direct links and page refreshes. The repository includes an InfinityFree `.htaccess` configuration for that host. Set the Supabase Auth site URL and allowed redirect URLs to the deployed HTTPS origin.

For the detailed InfinityFree checklist and architecture notes, see [How Kiro's Library works](docs/HOW-IT-WORKS.md).

## Making changes

The app is organized so UI and Supabase operations are separate:

- **Pages and routes:** `src/pages/` and `src/App.jsx`
- **Reusable UI:** `src/components/`
- **Supabase data access:** `src/lib/`
- **Authentication:** `src/auth/`
- **Theme, layout, and responsive styles:** `src/index.css`
- **PWA behavior and install metadata:** `public/sw.js` and `public/manifest.webmanifest`
- **Supabase database setup:** `supabase/*.sql`

To adjust a feature, find its page or component and its matching `src/lib/` module. For example, link-card UI is in `src/components/LinkDialog.jsx` and `src/components/Gallery.jsx`, link queries are in `src/lib/links.js`, and the links table is defined by `supabase/03-links.sql`. Add database changes as a new numbered SQL migration and run it against Supabase; changing frontend code alone does not update the hosted database.

After making changes, run `npm run lint` and `npm run build`. For the full walkthrough of the data flow, offline behavior, and code concepts, see [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md).
