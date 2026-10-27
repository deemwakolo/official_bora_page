-- ============================================================
-- BORA Engine — Stage 03: Add YouTube ID mapping to public.songs
-- ============================================================

-- 1. Add youtube_id column if not already present
alter table public.songs 
  add column if not exists youtube_id text;

-- 2. Create or replace the administrator song-write RPC with youtube_id support
create or replace function public.admin_upsert_song(
  p_slot_number integer,
  p_title text,
  p_artist text,
  p_yt_views bigint,
  p_sp_plays bigint,
  p_momentum_score integer,
  p_cover_url text,
  p_youtube_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.songs%rowtype;
begin
  -- Authentication check
  if auth.role() <> 'authenticated' then
    raise exception 'BORA_AUTH_REQUIRED: an authenticated session is required'
      using errcode = '28000';
  end if;

  -- Authorization check for administrator role
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'bora_administrator' then
    raise exception 'BORA_ADMIN_REQUIRED: caller is not an authorized BORA administrator'
      using errcode = '42501';
  end if;

  -- Upsert song record
  insert into public.songs as t (
    slot_number, title, artist, yt_views, sp_plays, momentum_score, cover_url, youtube_id, updated_at
  )
  values (
    p_slot_number, p_title, p_artist, p_yt_views, p_sp_plays, p_momentum_score, p_cover_url, p_youtube_id, now()
  )
  on conflict (slot_number) do update
    set title = excluded.title,
        artist = excluded.artist,
        yt_views = excluded.yt_views,
        sp_plays = excluded.sp_plays,
        momentum_score = excluded.momentum_score,
        cover_url = excluded.cover_url,
        youtube_id = excluded.youtube_id,
        updated_at = excluded.updated_at
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- Secure execute grants
revoke execute on function public.admin_upsert_song(integer, text, text, bigint, bigint, integer, text, text) from public;
revoke execute on function public.admin_upsert_song(integer, text, text, bigint, bigint, integer, text, text) from anon;
grant execute on function public.admin_upsert_song(integer, text, text, bigint, bigint, integer, text, text) to authenticated;
