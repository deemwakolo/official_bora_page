-- ============================================================
-- BORA — HARDEN public.songs PERMISSIONS (ADDITIVE)
-- ============================================================
--
-- Removes the unconditional anonymous ALL policy, revokes direct
-- write privileges from anon/authenticated (incl. TRUNCATE),
-- preserves public reads, and moves administrator song writes to a
-- SECURITY DEFINER RPC gated by the trusted app_metadata.role claim.
-- service_role and the table owner are left intact.
--
-- INDEPENDENCE: this migration does NOT depend on 0018. It performs
-- its own administrator claim check and does not call
-- bora_author_is_administrator().
--
-- COUPLING (critical): handle_song_vote is SECURITY INVOKER and needs
-- the caller's songs UPDATE grant. After this migration, legacy
-- voting FAILS unless the frontend is already running the secure
-- path (cast_vote_secure). Deploy the flag cutover WITH this change;
-- never apply 0019 while legacy handle_song_vote is the active path.
--
-- ROLLBACK: re-grant write privileges to anon/authenticated, re-create
-- "Bora_Admin_Policy", drop admin_upsert_song, and revert the
-- updateSlot source change. Rollback re-opens the anonymous write
-- exposure; treat as incident recovery.
-- ============================================================

-- 1. Remove the permissive anonymous ALL policy.
drop policy if exists "Bora_Admin_Policy" on public.songs;

-- 2. Preserve public chart reads for anon AND authenticated.
--    (Anon read previously relied on Bora_Admin_Policy's SELECT; this
--    restores it explicitly. The existing "Songs_Read_Authenticated"
--    policy becomes redundant and is left in place.)
drop policy if exists "Public can read songs" on public.songs;
create policy "Public can read songs"
  on public.songs
  for select
  to anon, authenticated
  using (true);

-- 3. Revoke direct write privileges from client roles (keep SELECT).
--    service_role and the table owner are intentionally NOT revoked.
revoke insert, update, delete, truncate, references, trigger on public.songs from anon;
revoke insert, update, delete, truncate, references, trigger on public.songs from authenticated;

-- 4. Administrator-only song write path (SECURITY DEFINER).
--    Signature matches the finalized live `songs` column types:
--    slot_number integer, title text, artist text,
--    yt_views bigint, sp_plays bigint, momentum_score integer,
--    cover_url text.
create or replace function public.admin_upsert_song(
  p_slot_number integer,
  p_title text,
  p_artist text,
  p_yt_views bigint,
  p_sp_plays bigint,
  p_momentum_score integer,
  p_cover_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.songs%rowtype;
begin
  -- Authentication: an authenticated Supabase session is required.
  if auth.role() <> 'authenticated' then
    raise exception 'BORA_AUTH_REQUIRED: an authenticated session is required'
      using errcode = '28000';
  end if;

  -- Authorization: trusted, non-caller-editable administrator claim.
  -- (app_metadata is server-controlled; user_metadata is never trusted.)
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'bora_administrator' then
    raise exception 'BORA_ADMIN_REQUIRED: caller is not an authorized BORA administrator'
      using errcode = '42501';
  end if;

  -- Upsert on the slot_number unique key. `id` is never written here:
  -- new rows receive the database-generated UUID and existing rows keep
  -- their id (it is absent from both the column list and the SET list).
  insert into public.songs as t (
    slot_number, title, artist, yt_views, sp_plays, momentum_score, cover_url, updated_at
  )
  values (
    p_slot_number, p_title, p_artist, p_yt_views, p_sp_plays, p_momentum_score, p_cover_url, now()
  )
  on conflict (slot_number) do update
    set title = excluded.title,
        artist = excluded.artist,
        yt_views = excluded.yt_views,
        sp_plays = excluded.sp_plays,
        momentum_score = excluded.momentum_score,
        cover_url = excluded.cover_url,
        updated_at = excluded.updated_at
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- Only authenticated administrators may execute; PUBLIC and anon revoked.
revoke execute on function public.admin_upsert_song(integer, text, text, bigint, bigint, integer, text) from public;
revoke execute on function public.admin_upsert_song(integer, text, text, bigint, bigint, integer, text) from anon;
grant execute on function public.admin_upsert_song(integer, text, text, bigint, bigint, integer, text) to authenticated;
