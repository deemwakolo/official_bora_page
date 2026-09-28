-- ============================================================
-- BORA UI ROOM — COMMITTED CONFIG OVERRIDE
-- ============================================================
--
-- Model (c): the checked-in `bora-ui.config.json` is the committed
-- BASELINE. This table holds an optional RUNTIME OVERRIDE that the
-- UI Room writes through Save Draft.
--
-- Boundaries:
--   Public          -> SELECT only (presentation data, non-sensitive)
--   Authenticated   -> write through save_ui_room_config(...)
--                      (SECURITY DEFINER, grants revoked from
--                      public/anon, granted to authenticated)
--
-- A missing row is the normal case: the public site then renders the
-- file baseline exactly. The table is an override, not a dependency.
-- ============================================================

create table if not exists public.ui_room_config (
  id text primary key,
  config jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.ui_room_config enable row level security;

-- Public read: the public runtime needs the committed config to
-- render before paint. This is presentation data only.
create policy "Public can read ui room config"
on public.ui_room_config
for select
to anon, authenticated
using (true);

-- 1. Write path is a controlled RPC only. No INSERT/UPDATE/DELETE
--    policy exists, so clients cannot write directly.
create or replace function public.save_ui_room_config(
  p_config jsonb,
  p_schema_version integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user text;
  v_result jsonb;
begin
  v_user := auth.uid()::text;

  if v_user is null then
    raise exception 'Unauthorized: sign in as an administrator to save UI config.';
  end if;

  insert into public.ui_room_config as t (
    id,
    config,
    schema_version,
    updated_at,
    updated_by
  )
  values (
    'committed',
    coalesce(p_config, '{}'::jsonb),
    coalesce(p_schema_version, 1),
    now(),
    v_user
  )
  on conflict (id) do update
    set config = excluded.config,
        schema_version = excluded.schema_version,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
  returning jsonb_build_object(
    'ok', true,
    'updatedAt', t.updated_at,
    'updatedBy', t.updated_by
  )
  into v_result;

  return v_result;
end;
$$;

-- 2. EXECUTE revoked from PUBLIC/anon, granted to authenticated only.
revoke execute on function public.save_ui_room_config(jsonb, integer) from public;
revoke execute on function public.save_ui_room_config(jsonb, integer) from anon;
grant execute on function public.save_ui_room_config(jsonb, integer) to authenticated;

-- 3. No delete path: clearing the override is done by resetting the
--    UI Room draft, not by deleting committed configuration.
