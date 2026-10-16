-- ============================================================
-- BORA ADMINISTRATOR AUTHORIZATION — DATABASE BOUNDARY (ADDITIVE)
-- ============================================================
--
-- PURPOSE
--   Enforce the site-administrator authorization policy at the
--   DATABASE boundary for the four privileged content-writing RPCs
--   (save_moment_chart_edition, save_trending_platform,
--   save_news_hub_item, save_ui_room_config), so an ordinary
--   authenticated account cannot invoke them directly and bypass the
--   server actions.
--
-- DESIGN
--   - A single, reusable, trusted helper `bora_author_is_administrator()`
--     reads the caller's verified JWT and checks the NON-caller-editable
--     `app_metadata.role = 'bora_administrator'` claim. `app_metadata`
--     is server-controlled (set only via the Supabase Admin API /
--     service role) and cannot be changed by the user through the
--     client, unlike `user_metadata`. No role table is invented.
--   - Each RPC keeps its EXACT signature, validation, integrity
--     constraints, `security definer`, fixed
--     `search_path = public, pg_temp`, and existing grants
--     (`revoke ... from public/anon`, `grant execute ... to
--     authenticated`). Only an administrator guard is added at the top
--     of each body. Public read behavior is untouched (these are write
--     RPCs; the separate public SELECT policies are not modified).
--   - Ordinary authenticated callers now receive a clear authorization
--     failure (SQLSTATE 42501, `BORA_ADMIN_REQUIRED`).
--
-- DEPLOYMENT PREREQUISITE (fail-closed by design)
--   Before applying, provision the SAME administrator identities in
--   BOTH trusted sources:
--     1. Supabase Auth: set `app_metadata.role = 'bora_administrator'`
--        on each administrator user (Admin API / service role only).
--     2. Deployment env: set the server-only `BORA_ADMIN_USER_IDS`
--        allowlist (comma-separated UUIDs) used by the server actions
--        (`lib/administrator-authorization.ts`).
--   Until the claim is provisioned, even legitimate administrators are
--   rejected by the RPCs (fail closed). Apply identity provisioning and
--   this migration together.
--
-- REVERSAL
--   Re-create the four functions from migrations 0003 / 0005 / 0006 /
--   0008 (their pre-hardening bodies) and drop the helper.
--
-- This migration is UNAPPLIED until run through the approved database
-- change workflow. It is additive and depends only on objects defined
-- by migrations 0002-0008.
-- ============================================================

-- 1. Trusted administrator predicate (called internally by the
--    security-definer RPCs below; runs with the CALLER's JWT).
create or replace function public.bora_author_is_administrator()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(
           auth.jwt() -> 'app_metadata' ->> 'role',
           ''
         ) = 'bora_administrator';
$$;

-- The helper is only ever called from within the definer RPCs (which
-- execute as the function owner), so no client role needs EXECUTE.
revoke execute on function public.bora_author_is_administrator()
  from public;
revoke execute on function public.bora_author_is_administrator()
  from anon;
revoke execute on function public.bora_author_is_administrator()
  from authenticated;


-- ============================================================
-- 2. save_moment_chart_edition — add administrator guard
--    (body otherwise identical to migration 0003)
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
  if auth.role() <> 'authenticated' then
    raise exception 'Unauthorized: caller must be authenticated';
  end if;

  -- 1b. ADMINISTRATOR AUTHORIZATION (database boundary).
  if not public.bora_author_is_administrator() then
    raise exception 'BORA_ADMIN_REQUIRED: caller is not an authorized BORA administrator'
      using errcode = '42501';
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
    if v_entry.movement_kind is null or v_entry.movement_kind not in ('up', 'down', 'same', 'new') then
      raise exception 'Rank %: movement_kind must be one of up, down, same, new (received %)', v_entry.rank, v_entry.movement_kind;
    end if;

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

    select song_id into v_existing_song_id
    from public.moment_chart_entries
    where edition_id = p_edition_id
      and rank = v_entry.rank;

    if not found then
      raise exception 'Expected existing entry for rank % not found for edition %', v_entry.rank, p_edition_id;
    end if;

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

revoke execute on function public.save_moment_chart_edition(uuid, jsonb) from public;
revoke execute on function public.save_moment_chart_edition(uuid, jsonb) from anon;
grant execute on function public.save_moment_chart_edition(uuid, jsonb) to authenticated;


-- ============================================================
-- 3. save_trending_platform — add administrator guard
--    (body otherwise identical to migration 0005)
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

  -- 1b. ADMINISTRATOR AUTHORIZATION (database boundary).
  if not public.bora_author_is_administrator() then
    raise exception 'BORA_ADMIN_REQUIRED: caller is not an authorized BORA administrator'
      using errcode = '42501';
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
    if coalesce(trim(v_entry.title), '') = '' then
      raise exception 'Rank %: title cannot be empty', v_entry.rank;
    end if;

    if coalesce(trim(v_entry.artist), '') = '' then
      raise exception 'Rank %: artist cannot be empty', v_entry.rank;
    end if;

    if p_platform = 'artist' then
      if v_entry.songs_count is null or v_entry.songs_count < 0 then
        raise exception 'Rank %: songs_count is required and must be >= 0 for artist rows', v_entry.rank;
      end if;
    elsif v_entry.songs_count is not null then
      raise exception 'Rank %: songs_count must be null for % rows', v_entry.rank, p_platform;
    end if;

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


-- ============================================================
-- 4. save_news_hub_item — add administrator guard
--    (body otherwise identical to migration 0006)
-- ============================================================
create or replace function public.save_news_hub_item(
  p_id      uuid,
  p_title   text,
  p_category text,
  p_excerpt text,
  p_source  text,
  p_is_hot  boolean,
  p_published_at timestamptz,
  p_content text,
  p_media_url text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row record;
begin
  -- 1. AUTHENTICATION CHECK
  if auth.role() <> 'authenticated' then
    raise exception 'Unauthorized: caller must be authenticated';
  end if;

  -- 1b. ADMINISTRATOR AUTHORIZATION (database boundary).
  if not public.bora_author_is_administrator() then
    raise exception 'BORA_ADMIN_REQUIRED: caller is not an authorized BORA administrator'
      using errcode = '42501';
  end if;

  -- 2. VALIDATE REQUIRED EDITOR FIELDS
  if coalesce(trim(p_title), '') = '' then
    raise exception 'title cannot be empty';
  end if;

  if coalesce(trim(p_category), '') = '' then
    raise exception 'category cannot be empty';
  end if;

  if coalesce(trim(p_excerpt), '') = '' then
    raise exception 'excerpt cannot be empty';
  end if;

  if coalesce(trim(p_media_url), '') = '' then
    raise exception 'media_url (image) cannot be empty';
  end if;

  -- 3. CREATE OR UPDATE
  if p_id is null then
    insert into public.news_hub (
      content, media_url, is_insta, created_at,
      title, category, excerpt, source, is_hot, published_at
    )
    values (
      nullif(trim(p_content), ''),
      trim(p_media_url),
      false,
      now(),
      trim(p_title),
      trim(p_category),
      nullif(trim(p_excerpt), ''),
      nullif(trim(p_source), ''),
      coalesce(p_is_hot, false),
      p_published_at
    )
    returning * into v_row;
  else
    update public.news_hub
    set
      content = nullif(trim(p_content), ''),
      media_url = trim(p_media_url),
      title = trim(p_title),
      category = trim(p_category),
      excerpt = nullif(trim(p_excerpt), ''),
      source = nullif(trim(p_source), ''),
      is_hot = coalesce(p_is_hot, false),
      published_at = p_published_at
    where id = p_id
    returning * into v_row;

    if not found then
      raise exception 'News item not found: %', p_id;
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'id', v_row.id,
    'created', p_id is null
  );
end;
$$;

revoke execute on function public.save_news_hub_item(uuid, text, text, text, text, boolean, timestamptz, text, text) from public;
revoke execute on function public.save_news_hub_item(uuid, text, text, text, text, boolean, timestamptz, text, text) from anon;
grant execute on function public.save_news_hub_item(uuid, text, text, text, text, boolean, timestamptz, text, text) to authenticated;


-- ============================================================
-- 5. save_ui_room_config — add administrator guard
--    (body otherwise identical to migration 0008)
-- ============================================================
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

  -- 1b. ADMINISTRATOR AUTHORIZATION (database boundary).
  if not public.bora_author_is_administrator() then
    raise exception 'BORA_ADMIN_REQUIRED: caller is not an authorized BORA administrator'
      using errcode = '42501';
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

revoke execute on function public.save_ui_room_config(jsonb, integer) from public;
revoke execute on function public.save_ui_room_config(jsonb, integer) from anon;
grant execute on function public.save_ui_room_config(jsonb, integer) to authenticated;




