-- BORA: install the administrator song-write RPC without changing
-- existing songs table policies or grants.
-- This is a temporary compatibility stage before permissions hardening.

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
