-- ============================================================
-- BORA MOMENT CHARTS — STEP 7 ATOMIC SAVE RPC
-- ============================================================
--
-- Security Model:
-- 1. NO direct INSERT/UPDATE/DELETE policies are added to
--    moment_chart_editions or moment_chart_entries.
-- 2. Direct table mutations by anon or authenticated remain blocked by RLS.
-- 3. The ONLY authorized write path is this SECURITY DEFINER function.
-- 4. Access is strictly granted to authenticated users; public/anon has NO execute access.
-- 5. The function runs with fixed search_path = public, pg_temp.
-- 6. song_id is NOT accepted or trusted from the caller payload.
--    Instead, the existing song_id is fetched from the database for each
--    rank and preserved.
-- 7. If any rank 1..10 is missing in the database edition, the transaction
--    aborts with an error rather than manufacturing identity.
-- ============================================================

create or replace function public.save_moment_chart_edition(
  p_edition_id uuid,
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
  v_existing_ranks integer[];
  v_existing_song_id uuid;
  v_edition record;
begin
  -- 1. AUTHENTICATION CHECK
  -- Only callers with an authenticated Supabase session may execute this RPC.
  if auth.role() <> 'authenticated' then
    raise exception 'Unauthorized: caller must be authenticated';
  end if;

  -- 2. VERIFY EDITION EXISTS
  select * into v_edition
  from public.moment_chart_editions
  where id = p_edition_id;

  if not found then
    raise exception 'Edition not found: %', p_edition_id;
  end if;

  -- 3. VERIFY EXISTING EDITION HAS EXACTLY RANKS 1..10 IN DATABASE
  select array_agg(rank order by rank)
  into v_existing_ranks
  from public.moment_chart_entries
  where edition_id = p_edition_id;

  if v_existing_ranks <> array[1,2,3,4,5,6,7,8,9,10] then
    raise exception 'Edition % has corrupted entry ranks in database; expected ranks 1 to 10', p_edition_id;
  end if;

  -- 4. VALIDATE EXACTLY 10 ENTRIES IN INCOMING PAYLOAD
  v_count := jsonb_array_length(p_entries);
  if v_count <> 10 then
    raise exception 'Expected exactly 10 entries in payload, received %', v_count;
  end if;

  -- 5. VALIDATE RANKS IN PAYLOAD ARE EXACTLY 1 TO 10 WITH NO DUPLICATES OR GAPS
  select array_agg((item->>'rank')::integer order by (item->>'rank')::integer)
  into v_ranks
  from jsonb_array_elements(p_entries) as item;

  if v_ranks <> array[1,2,3,4,5,6,7,8,9,10] then
    raise exception 'Invalid ranks in payload: entries must have unique ranks from 1 to 10';
  end if;

  -- 6. UPDATE EDITION TIMESTAMP
  update public.moment_chart_editions
  set updated_at = now()
  where id = p_edition_id;

  -- 7. ATOMICALLY UPDATE ALL 10 ENTRIES PRESERVING EXISTING SONG_ID
  for v_entry in select * from jsonb_to_recordset(p_entries) as (
    rank integer,
    movement_kind text,
    movement_delta integer,
    title_snapshot text,
    artist_snapshot text,
    feature_snapshot text,
    producer_snapshot text,
    release_date_snapshot date,
    genre_snapshot text,
    artwork_snapshot text,
    youtube_url_snapshot text,
    spotify_url_snapshot text,
    boomplay_url_snapshot text
  )
  loop
    -- Explicit validation: movement_kind must be exactly up, down, same, or new
    if v_entry.movement_kind is null or v_entry.movement_kind not in ('up', 'down', 'same', 'new') then
      raise exception 'Rank %: movement_kind must be one of up, down, same, new (received %)', v_entry.rank, v_entry.movement_kind;
    end if;

    -- Movement delta constraints
    if v_entry.movement_kind in ('same', 'new') and v_entry.movement_delta is not null then
      raise exception 'Rank %: movement_delta must be null when movement_kind is %', v_entry.rank, v_entry.movement_kind;
    end if;

    if v_entry.movement_kind in ('up', 'down') and (v_entry.movement_delta is null or v_entry.movement_delta < 1) then
      raise exception 'Rank %: movement_delta must be a positive integer when movement_kind is %', v_entry.rank, v_entry.movement_kind;
    end if;

    if coalesce(trim(v_entry.title_snapshot), '') = '' then
      raise exception 'Rank %: title_snapshot cannot be empty', v_entry.rank;
    end if;

    if coalesce(trim(v_entry.artist_snapshot), '') = '' then
      raise exception 'Rank %: artist_snapshot cannot be empty', v_entry.rank;
    end if;

    -- Retrieve authoritative existing song_id for (edition_id, rank)
    select song_id into v_existing_song_id
    from public.moment_chart_entries
    where edition_id = p_edition_id
      and rank = v_entry.rank;

    if not found then
      raise exception 'Expected existing entry for rank % not found for edition %', v_entry.rank, p_edition_id;
    end if;

    -- Update row with editable fields, preserving existing song_id
    update public.moment_chart_entries
    set
      song_id = v_existing_song_id,
      movement_kind = v_entry.movement_kind,
      movement_delta = v_entry.movement_delta,
      title_snapshot = trim(v_entry.title_snapshot),
      artist_snapshot = trim(v_entry.artist_snapshot),
      feature_snapshot = nullif(trim(v_entry.feature_snapshot), ''),
      producer_snapshot = nullif(trim(v_entry.producer_snapshot), ''),
      release_date_snapshot = v_entry.release_date_snapshot,
      genre_snapshot = nullif(trim(v_entry.genre_snapshot), ''),
      artwork_snapshot = nullif(trim(v_entry.artwork_snapshot), ''),
      youtube_url_snapshot = nullif(trim(v_entry.youtube_url_snapshot), ''),
      spotify_url_snapshot = nullif(trim(v_entry.spotify_url_snapshot), ''),
      boomplay_url_snapshot = nullif(trim(v_entry.boomplay_url_snapshot), ''),
      updated_at = now()
    where edition_id = p_edition_id
      and rank = v_entry.rank;
  end loop;

  return jsonb_build_object('success', true, 'edition_id', p_edition_id);
end;
$$;

-- Revoke all execute rights from public/anon, grant strictly to authenticated
revoke execute on function public.save_moment_chart_edition(uuid, jsonb) from public;
revoke execute on function public.save_moment_chart_edition(uuid, jsonb) from anon;
grant execute on function public.save_moment_chart_edition(uuid, jsonb) to authenticated;

