-- Kiro's Library database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, then Run.
-- It is safe to run again: every statement checks whether its object already exists.

-- =========================================================================
-- Tables
-- =========================================================================

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 1 and 40),
  -- Self-reference: a category can point at another category as its parent.
  -- null = top level. "on delete restrict" makes Postgres refuse to delete a
  -- category that still has subcategories, so nothing is orphaned by accident.
  parent_id   uuid references public.categories (id) on delete restrict,
  created_at  timestamptz not null default now(),
  -- No two folders with the same name in the same place. Normally two NULLs
  -- count as "different", which would allow duplicate top-level names.
  -- NULLS NOT DISTINCT (Postgres 15+) makes NULL = NULL for this check.
  constraint categories_unique_name unique nulls not distinct (parent_id, name)
);

create table if not exists public.files (
  id            uuid primary key default gen_random_uuid(),
  -- restrict again: a category with files in it can't be deleted.
  category_id   uuid not null references public.categories (id) on delete restrict,
  filename      text not null,
  -- The real bytes live in Storage; the database only remembers where.
  storage_path  text not null unique,
  thumb_path    text,
  file_type     text not null,
  size_bytes    bigint not null default 0,
  -- auth.uid() is the id of the logged-in user making the request, so the
  -- frontend never has to send (or fake) who uploaded the file.
  uploader_id   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

-- Indexes make "children of X" and "newest files in X" fast as the library grows.
create index if not exists categories_parent_id_idx on public.categories (parent_id);
create index if not exists files_category_created_idx on public.files (category_id, created_at desc);

-- =========================================================================
-- Row Level Security
-- With RLS on and no policy, NOBODY can read or write a table through the API.
-- Each policy below opens it up only for the "authenticated" role (= logged in).
-- Visitors using just the public key get the "anon" role and see nothing.
-- =========================================================================

alter table public.categories enable row level security;
alter table public.files enable row level security;

-- Table privileges come before RLS: a role needs GRANT to touch the table at
-- all, then RLS filters which rows. Supabase grants new tables to anon (the
-- logged-out role) by default; take that away so anon is blocked twice.
revoke all on public.categories, public.files from anon;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.files to authenticated;

drop policy if exists "logged in users manage categories" on public.categories;
create policy "logged in users manage categories" on public.categories
  for all to authenticated
  using (true)        -- which existing rows they can see/change/delete
  with check (true);  -- which new/updated rows they are allowed to write

drop policy if exists "logged in users manage files" on public.files;
create policy "logged in users manage files" on public.files
  for all to authenticated
  using (true)
  with check (true);

-- =========================================================================
-- Storage bucket
-- public = false: files can only be fetched with a login or a signed URL.
-- The size limit and MIME list are enforced by Supabase itself, so a bypassed
-- frontend still can't upload a 2 GB video or an .exe.
-- =========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'library',
  'library',
  false,
  26214400, -- 25 MB in bytes (25 * 1024 * 1024)
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
    'application/pdf', 'text/plain'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Storage objects are rows in storage.objects, protected by RLS like any table.
-- Every policy is scoped to our bucket so it can't leak into other buckets.
drop policy if exists "library read" on storage.objects;
create policy "library read" on storage.objects
  for select to authenticated using (bucket_id = 'library');

drop policy if exists "library upload" on storage.objects;
create policy "library upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'library');

drop policy if exists "library update" on storage.objects;
create policy "library update" on storage.objects
  for update to authenticated
  using (bucket_id = 'library') with check (bucket_id = 'library');

drop policy if exists "library delete" on storage.objects;
create policy "library delete" on storage.objects
  for delete to authenticated using (bucket_id = 'library');
