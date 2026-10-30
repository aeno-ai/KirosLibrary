-- Migration 5: each library member's personal favorites and pins.
-- Run after schema.sql through 04-RLS.sql in Supabase > SQL Editor.
-- This file is safe to run again. Do not run it from the browser.

begin;

create table if not exists public.saved_items (
  -- This is deliberately separate from the shared library records. A member
  -- can only ever see and change their own rows, after passing the library
  -- member gate from 04-RLS.sql.
  user_id     uuid not null references auth.users (id) on delete cascade,
  item_type   text not null check (item_type in ('folder', 'file', 'note', 'link')),
  item_id     uuid not null,
  is_favorite boolean not null default false,
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, item_type, item_id),
  -- A row is useful only while it represents at least one saved state.
  constraint saved_items_has_state check (is_favorite or is_pinned)
);

-- The app reads one member's saved rows in most-recently-changed order.
create index if not exists saved_items_user_updated_idx
  on public.saved_items (user_id, updated_at desc);

drop trigger if exists saved_items_touch_updated_at on public.saved_items;
create trigger saved_items_touch_updated_at
  before update on public.saved_items
  for each row execute function public.touch_updated_at();

alter table public.saved_items enable row level security;

revoke all on public.saved_items from anon;
grant select, insert, update, delete on public.saved_items to authenticated;

drop policy if exists "saved_items_select_own" on public.saved_items;
create policy "saved_items_select_own" on public.saved_items
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    and (select public.kiros_is_member())
  );

drop policy if exists "saved_items_insert_own" on public.saved_items;
create policy "saved_items_insert_own" on public.saved_items
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.kiros_is_member())
  );

drop policy if exists "saved_items_update_own" on public.saved_items;
create policy "saved_items_update_own" on public.saved_items
  for update to authenticated
  using (
    (select auth.uid()) = user_id
    and (select public.kiros_is_member())
  )
  with check (
    (select auth.uid()) = user_id
    and (select public.kiros_is_member())
  );

drop policy if exists "saved_items_delete_own" on public.saved_items;
create policy "saved_items_delete_own" on public.saved_items
  for delete to authenticated
  using (
    (select auth.uid()) = user_id
    and (select public.kiros_is_member())
  );

-- Change exactly one flag without trusting a user id supplied by the browser.
-- It is one transaction, so changing a heart cannot remove a concurrently
-- changed pin, and a row disappears as soon as both flags are false.
-- The browser only needs success or an error, so this returns void. Returning
-- fields named is_favorite/is_pinned would collide with the table columns in
-- PL/pgSQL and can produce "column reference is_favorite is ambiguous".
drop function if exists public.set_saved_item_flag(text, uuid, text, boolean);
create function public.set_saved_item_flag(
  p_item_type text,
  p_item_id uuid,
  p_flag text,
  p_value boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_item public.saved_items%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in before saving an item.' using errcode = '42501';
  end if;

  if not (select public.kiros_is_member()) then
    raise exception 'Only library members can save items.' using errcode = '42501';
  end if;

  if p_item_type not in ('folder', 'file', 'note', 'link') then
    raise exception 'Unsupported saved item type.' using errcode = '22023';
  end if;

  if p_flag not in ('favorite', 'pinned') then
    raise exception 'Unsupported saved item flag.' using errcode = '22023';
  end if;

  if p_value then
    insert into public.saved_items as target (user_id, item_type, item_id, is_favorite, is_pinned)
    values (
      (select auth.uid()),
      p_item_type,
      p_item_id,
      p_flag = 'favorite',
      p_flag = 'pinned'
    )
    on conflict (user_id, item_type, item_id) do update
      set is_favorite = case when p_flag = 'favorite' then true else target.is_favorite end,
          is_pinned = case when p_flag = 'pinned' then true else target.is_pinned end
    returning * into saved_item;
  else
    -- Lock first so the decision to delete versus update cannot race a
    -- second browser changing the other flag. Updating both flags to false
    -- would violate saved_items_has_state before a later DELETE could run.
    select * into saved_item
      from public.saved_items
      where user_id = (select auth.uid())
        and item_type = p_item_type
        and item_id = p_item_id
      for update;

    if not found then
      return;
    end if;

    if (p_flag = 'favorite' and not saved_item.is_pinned)
      or (p_flag = 'pinned' and not saved_item.is_favorite) then
      delete from public.saved_items
        where user_id = saved_item.user_id
          and item_type = saved_item.item_type
          and item_id = saved_item.item_id;
      saved_item.is_favorite := false;
      saved_item.is_pinned := false;
    else
      update public.saved_items as target
        set is_favorite = case when p_flag = 'favorite' then false else target.is_favorite end,
            is_pinned = case when p_flag = 'pinned' then false else target.is_pinned end
        where target.user_id = saved_item.user_id
          and target.item_type = saved_item.item_type
          and target.item_id = saved_item.item_id
        returning * into saved_item;
    end if;
  end if;

  return;
end;
$$;

revoke all on function public.set_saved_item_flag(text, uuid, text, boolean) from public;
grant execute on function public.set_saved_item_flag(text, uuid, text, boolean) to authenticated;

commit;
