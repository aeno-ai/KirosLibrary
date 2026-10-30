-- Migration 2: love notes + web push subscriptions.
-- Run AFTER schema.sql: Supabase > SQL Editor > New query > paste > Run.
-- Safe to run again.
--
-- A "migration" is a numbered change to the database. Instead of editing
-- schema.sql (which already ran), each new feature gets its own file, run
-- once, in order. Reading them 01, 02, ... tells the database's history.

-- =========================================================================
-- Love notes
-- =========================================================================

create table if not exists public.notes (
  id           uuid primary key default gen_random_uuid(),
  message      text not null check (char_length(trim(message)) between 1 and 500),
  sender_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Copied from the sender's profile when sending, so showing a note never
  -- needs to look up the other person's account (which the browser can't).
  sender_name  text not null default '',
  created_at   timestamptz not null default now(),
  seen         boolean not null default false
);

create index if not exists notes_created_idx on public.notes (created_at desc);

alter table public.notes enable row level security;

-- Column-level privileges: logged-in users may read and add notes, but the
-- ONLY column they may ever update is "seen". Even with a bug in the app,
-- nobody can edit the text of a note after it was sent.
revoke all on public.notes from anon, authenticated;
grant select, insert on public.notes to authenticated;
grant update (seen) on public.notes to authenticated;

drop policy if exists "read notes" on public.notes;
create policy "read notes" on public.notes
  for select to authenticated using (true);

-- You can only send notes as yourself, and they start unseen.
drop policy if exists "send own notes" on public.notes;
create policy "send own notes" on public.notes
  for insert to authenticated
  with check (sender_id = auth.uid() and seen = false);

-- Only the RECEIVER marks a note as seen (not the person who wrote it).
drop policy if exists "receiver marks seen" on public.notes;
create policy "receiver marks seen" on public.notes
  for update to authenticated
  using (sender_id <> auth.uid())
  with check (sender_id <> auth.uid());

-- Realtime: add the table to the publication Supabase Realtime listens to,
-- so open apps get new notes instantly. RLS still applies to what each
-- listener receives. The DO block skips the error if it was already added.
do $$
begin
  alter publication supabase_realtime add table public.notes;
exception
  when duplicate_object then null;
end
$$;

-- =========================================================================
-- Web push subscriptions
-- Each phone/browser that allows notifications gets one row: the address of
-- its push service (endpoint) plus the keys used to encrypt messages to it.
-- =========================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Each person sees and manages only their own devices. The Edge Function that
-- sends pushes uses the service-role key, which bypasses RLS, to read the
-- other person's devices; that key only ever lives on Supabase's servers.
drop policy if exists "own push subscriptions" on public.push_subscriptions;
create policy "own push subscriptions" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
