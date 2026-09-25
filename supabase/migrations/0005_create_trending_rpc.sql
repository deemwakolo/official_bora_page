-- ============================================================
-- BORA TRENDING — ATOMIC SAVE RPC
-- ============================================================
--
-- Security Model (same shape as 0003 Moment Charts):
-- 1. NO table-level INSERT/UPDATE/DELETE policies exist. This
--    function is the only write boundary.
-- 2. auth.role() = 'authenticated' is enforced explicitly.
-- 3. search_path is fixed.
-- 4. EXECUTE revoked from PUBLIC/anon, granted to authenticated only.
-- 5. song_id is NOT accepted from the caller payload. The existing
--    song_id for (platform, rank) is read from the database and
--    preserved, exactly like 0003.
-- 6. Only the platform being saved is touched. Other platforms are
--    never read for update and never deleted.
-- 7. The payload must match the expected structure for that platform
--    exactly: 10 rows (ranks 1-10) for youtube/spotify, 8 rows
--    (ranks 1-8) for artist.
-- ============================================================

create or replace function public.save_trending_platform(
  p_platform text,
  p_entries jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry record;
  v_count integer;
  v_ranks integer[];
  v_expected integer;
  v_existing_song_id uuid;
begin
  -- 1. AUTHENTICATION CHECK
  if auth.role() <> 'authenticated' then
    raise exception 'Unauthorized: caller must be authenticated';
  end if;

  -- 2. PLATFORM WHITELIST + EXPECTED ROW COUNT
  if p_platform is null or p_platform not in ('youtube', 'spotify', 'artist') then
    raise exception 'Invalid platform: % (expected youtube, spotify or artist)', p_platform;
  end if;

  if p_platform = 'artist' then
    v_expected := 8;
  else
    v_expected := 10;
  end if;

  -- 3. VALIDATE EXACT ENTRY COUNT
  v_count := jsonb_array_length(p_entries);
  if v_count <> v_expected then
    raise exception 'Expected exactly % entries for platform %, received %', v_expected, p_platform, v_count;
  end if;

  -- 4. VALIDATE RANKS ARE EXACTLY 1..N WITH NO DUPLICATES OR GAPS
  select array_agg((item->>'rank')::integer order by (item->>'rank')::integer)
  into v_ranks
  from jsonb_array_elements(p_entries) as item;

  if v_ranks <> array(select generate_series(1, v_expected)) then
    raise exception 'Invalid ranks for platform %: entries must have unique ranks from 1 to %', p_platform, v_expected;
  end if;

  -- 5. ATOMICALLY UPDATE THE ROWS FOR THIS PLATFORM ONLY
  for v_entry in select * from jsonb_to_recordset(p_entries) as (
    rank integer,
    title text,
    artist text,
    movement integer,
    songs_count integer
  )
  loop
    -- Required fields
    if coalesce(trim(v_entry.title), '') = '' then
      raise exception 'Rank %: title cannot be empty', v_entry.rank;
    end if;

    if coalesce(trim(v_entry.artist), '') = '' then
      raise exception 'Rank %: artist cannot be empty', v_entry.rank;
    end if;

    -- songs_count is artist-only and must stay null elsewhere
    if p_platform = 'artist' then
      if v_entry.songs_count is null or v_entry.songs_count < 0 then
        raise exception 'Rank %: songs_count is required and must be >= 0 for artist rows', v_entry.rank;
      end if;
    elsif v_entry.songs_count is not null then
      raise exception 'Rank %: songs_count must be null for % rows', v_entry.rank, p_platform;
    end if;

    -- Retrieve authoritative existing song_id for (platform, rank)
    select song_id into v_existing_song_id
    from public.trending_entries
    where platform = p_platform
      and rank = v_entry.rank;

    if v_entry.songs_count is not null then
      update public.trending_entries
      set
        song_id = v_existing_song_id,
        title = trim(v_entry.title),
        artist = trim(v_entry.artist),
        movement = coalesce(v_entry.movement, 0),
        songs_count = v_entry.songs_count,
        updated_at = now()
      where platform = p_platform
        and rank = v_entry.rank;

      if not found then
        insert into public.trending_entries (
          platform, rank, song_id, title, artist, movement, songs_count, updated_at
        )
        values (
          p_platform, v_entry.rank, null, trim(v_entry.title), trim(v_entry.artist),
          coalesce(v_entry.movement, 0), v_entry.songs_count, now()
        );
      end if;
    else
      update public.trending_entries
      set
        song_id = v_existing_song_id,
        title = trim(v_entry.title),
        artist = trim(v_entry.artist),
        movement = coalesce(v_entry.movement, 0),
        songs_count = null,
        updated_at = now()
      where platform = p_platform
        and rank = v_entry.rank;

      if not found then
        insert into public.trending_entries (
          platform, rank, song_id, title, artist, movement, updated_at
        )
        values (
          p_platform, v_entry.rank, null, trim(v_entry.title), trim(v_entry.artist),
          coalesce(v_entry.movement, 0), now()
        );
      end if;
    end if;
  end loop;

  return jsonb_build_object('success', true, 'platform', p_platform, 'entries', v_expected);
end;
$$;

revoke execute on function public.save_trending_platform(text, jsonb) from public;
revoke execute on function public.save_trending_platform(text, jsonb) from anon;
grant execute on function public.save_trending_platform(text, jsonb) to authenticated;
