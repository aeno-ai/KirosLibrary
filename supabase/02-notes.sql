-- Migration 2: text notes that live in folders, next to files.
-- Run AFTER schema.sql: Supabase > SQL Editor > New query > paste > Run.
-- Safe to run again.
--
-- A "migration" is a numbered change to the database. Instead of editing
-- schema.sql (which already ran), each new feature gets its own file, run
-- once, in order. Reading them 01, 02, ... tells the database's history.

create table if not exists public.notes (
  id           uuid primary key default gen_random_uuid(),
  -- restrict, like files: a folder with notes in it can't be deleted.
  category_id  uuid not null references public.categories (id) on delete restrict,
  title        text not null default '',
  body         text not null default '',
  author_id    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Named constraints, so the app can tell which rule was broken (db.js).
  constraint notes_not_empty check (char_length(trim(title)) + char_length(trim(body)) > 0),
  constraint notes_title_length check (char_length(title) <= 200),
  constraint notes_body_length check (char_length(body) <= 20000)
);

-- "Newest edited first, inside one folder" is the query the app runs.
create index if not exists notes_category_updated_idx on public.notes (category_id, updated_at desc);

-- A trigger: a function Postgres runs automatically on every UPDATE of a
-- note, stamping updated_at. The app can't forget to set it, and can't fake it.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = '' -- don't let a look-alike function in another schema be picked up
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();

-- Same security as categories and files: logged-in users only, anon blocked.
alter table public.notes enable row level security;

revoke all on public.notes from anon;
grant select, insert, update, delete on public.notes to authenticated;

drop policy if exists "logged in users manage notes" on public.notes;
create policy "logged in users manage notes" on public.notes
  for all to authenticated
  using (true)
  with check (true);
