# HANDOFF

## Rules for the doer agent (read this FIRST every session)
1. Do only the task in "Current task". Edit only the files listed in it, plus this file.
2. Do not refactor, rename, or add dependencies unless the task says so.
3. When finished, run the task's "Done when" check and paste the output in the report below.
4. Then set the task's row to DONE and fill in the report. Do not set REVIEWED. Only the architect's PASS leads to that.
5. One commit per task. The commit message starts with the task ID, like "T2: strip demo code".
6. If the card is unclear, wrong, or you are stuck, STOP. Set the row to BLOCKED and write why in the report. Do not guess.
7. Never commit .env files or keys.

## Status values
TODO, IN PROGRESS, BLOCKED, DONE (doer finished), REVIEWED (architect said PASS)

## Task board
| ID | Task | Status | Commit |
|----|------|--------|--------|
| T0 | Add HANDOFF.md | IN PROGRESS | |
| T1 | Scaffold Vite + React, add supabase-js and react-router-dom | REVIEWED | |
| T1-FIX | .gitignore: ignore .env files and graphify-out | TODO | |
| T2 | Strip demo code, add .env.example, create src/lib/supabase.js | TODO | |
| T3 | Supabase setup: tables, bucket, RLS (manual, SQL from architect) | TODO | |
| T4 | Login page and auth gate | TODO | |
| T5 | Categories: create, rename, delete, nesting | TODO | |
| T6 | File upload, gallery, thumbnails | TODO | |
| T7 | Move and search files | TODO | |
| T8 | PWA, then deploy to InfinityFree | TODO | |

## Current task
T0: Add HANDOFF.md

## Doer report (overwrite for each task)
- Task ID:
- Files changed:
- "Done when" output:
- Problems or deviations: