# HANDOFF

Progress board for Kiro's Library. The doer-agent workflow is retired: the architect (Claude) now implements each phase directly on the `core-app` branch, one commit per phase, and Aeno reviews every edit. Uncommon code is explained in comments inside the files.

## Rules
1. One commit per phase. The message starts with the phase ID, like "P2: auth and routing".
2. No new npm dependencies unless agreed first.
3. Never commit `.env.local` or any key. Only the publishable key may appear in frontend code.

## Status values
TODO, IN PROGRESS, DONE (code committed), REVIEWED (Aeno tested it)

## Phases
| ID | Phase | Status |
|----|-------|--------|
| P0 | Cleanup: commit demo strip, .env.example, untrack dist, remove demo assets | DONE |
| P1 | Supabase: tables, bucket, RLS (supabase/schema.sql + dashboard steps) | DONE (SQL written; Aeno runs it in the dashboard) |
| P2 | Supabase client, login, auth gate, routing | DONE |
| P3 | Categories: create, rename, delete, nesting, breadcrumbs | DONE |
| P4 | Upload, gallery, thumbnails | DONE |
| P5 | Move and search files | DONE |
| P6 | PWA: manifest, icons, service worker | DONE |
| P7 | Deploy prep: .htaccess, InfinityFree upload steps | DONE |
| P8 | Carnation pink theme, responsive layout, New folder dialog, Back tile, sign-out confirm | DONE |
| P9 | Lottie cats (component file is Dog.jsx) | DONE |
| P10 | Love notes: built, then removed at Aeno's request (reverted) | DROPPED |
| P10b | Notes in folders: add, edit, move, delete, search (run supabase/02-notes.sql) | DONE |
| P11 | Offline-first upload queue + resumable (TUS) uploads | TODO |
| P12 | Web push for notes | DROPPED (no notes) |
| P13 | Docs update | TODO |
