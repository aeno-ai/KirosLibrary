-- Migration 3: titled web links that live in folders, next to files and notes.
-- Run AFTER schema.sql and 02-notes.sql in Supabase > SQL Editor.
-- Safe to run again.

create table if not exists public.links (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.categories (id) on delete restrict,
  title        text not null,
  url          text not null,
  creator_id   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint links_title_not_empty check (char_length(trim(title)) > 0),
  constraint links_title_length check (char_length(title) <= 200),
  constraint links_url_length check (char_length(url) between 1 and 2048),
  constraint links_url_protocol check (url ~* '^https?://')
);

create index if not exists links_category_updated_idx
  on public.links (category_id, updated_at desc);

drop trigger if exists links_touch_updated_at on public.links;
create trigger links_touch_updated_at
  before update on public.links
  for each row execute function public.touch_updated_at();

alter table public.links enable row level security;

revoke all on public.links from anon;
grant select, insert, update, delete on public.links to authenticated;

drop policy if exists "logged in users manage links" on public.links;
create policy "logged in users manage links" on public.links
  for all to authenticated
  using (true)
  with check (true);
