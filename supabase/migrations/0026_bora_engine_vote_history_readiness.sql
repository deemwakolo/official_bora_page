-- BORA ENGINE — Migration 0026
-- Fix vote-history readiness for the complete 72-hour window.
-- Forward-only: do not edit or replay older migrations.

CREATE OR REPLACE FUNCTION public.bora_engine_readiness(
  p_closed_hour bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_reference_hour bigint;
  v_closed_hour bigint;
  v_song_count bigint := 0;
  v_active_count bigint := 0;
  v_state_status text := 'missing';
  v_vote jsonb;
  v_seed jsonb;
  v_youtube jsonb;
  v_spotify jsonb;
  v_boomplay jsonb;
  v_ready boolean;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'BORA_ENGINE_WORKER_REQUIRED';
  END IF;

  SELECT reference_hour
    INTO v_reference_hour
  FROM public.bora_engine_hourly_state_head
  WHERE singleton = true;

  IF FOUND THEN
    v_closed_hour := coalesce(p_closed_hour, v_reference_hour);

    SELECT count(*),
           count(*) FILTER (WHERE lifecycle = 'ACTIVE')
      INTO v_song_count, v_active_count
    FROM public.bora_engine_song_state;

    IF v_song_count > 0
       AND v_active_count > 0
       AND v_reference_hour = v_closed_hour THEN
      v_state_status := 'ready';
    ELSIF v_song_count = 0 THEN
      v_state_status := 'missing';
    ELSE
      v_state_status := 'incomplete';
    END IF;

    -- Vote history: require one and only one COMPLETE VOTES slot
    -- for every active song and every hour in [R-71, R].
    WITH active_songs AS (
      SELECT song_id
      FROM public.bora_engine_song_state
      WHERE lifecycle = 'ACTIVE'
    ),
    expected_slots AS (
      SELECT a.song_id, h.hour_index
      FROM active_songs a
      CROSS JOIN generate_series(
        v_closed_hour - 71,
        v_closed_hour
      ) AS h(hour_index)
    ),
    vote_slot_counts AS (
      SELECT
        c.song_id,
        c.hour_index,
        count(*) AS row_count,
        count(*) FILTER (WHERE c.status = 'COMPLETE') AS complete_count,
        count(*) FILTER (WHERE c.status = 'FAILED') AS failed_count,
        count(*) FILTER (WHERE c.status = 'UNAVAILABLE') AS unavailable_count
      FROM public.bora_engine_hourly_input_coverage c
      JOIN active_songs a ON a.song_id = c.song_id
      WHERE c.input_type = 'VOTES'
        AND c.hour_index BETWEEN v_closed_hour - 71 AND v_closed_hour
      GROUP BY c.song_id, c.hour_index
    ),
    slot_audit AS (
      SELECT
        e.song_id,
        e.hour_index,
        coalesce(v.row_count, 0) AS row_count,
        coalesce(v.complete_count, 0) AS complete_count,
        coalesce(v.failed_count, 0) AS failed_count,
        coalesce(v.unavailable_count, 0) AS unavailable_count
      FROM expected_slots e
      LEFT JOIN vote_slot_counts v
        ON v.song_id = e.song_id
       AND v.hour_index = e.hour_index
    )
    SELECT jsonb_build_object(
      'status',
        CASE
          WHEN count(*) > 0
           AND count(*) FILTER (
             WHERE row_count = 1 AND complete_count = 1
           ) = count(*)
           AND count(*) FILTER (WHERE row_count > 1) = 0
           AND count(*) FILTER (WHERE failed_count > 0) = 0
           AND count(*) FILTER (WHERE unavailable_count > 0) = 0
          THEN 'ready'
          ELSE 'incomplete'
        END,
      'expected', count(*),
      'complete', count(*) FILTER (
        WHERE row_count = 1 AND complete_count = 1
      ),
      'missing', count(*) FILTER (WHERE row_count = 0),
      'failed', count(*) FILTER (WHERE failed_count > 0),
      'unavailable', count(*) FILTER (WHERE unavailable_count > 0),
      'duplicates', count(*) FILTER (WHERE row_count > 1),
      'records', coalesce(sum(row_count), 0),
      'acceptedEvents', 0
    )
    INTO v_vote
    FROM slot_audit;

    -- Seed history: full 72-hour window [R-71, R].
    SELECT jsonb_build_object(
      'status', CASE
        WHEN count(*) FILTER (WHERE c.status = 'COMPLETE') = v_active_count * 72
        THEN 'ready' ELSE 'incomplete' END,
      'expected', v_active_count * 72,
      'complete', count(*) FILTER (WHERE c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 72 - count(c.song_id), 0),
      'unavailable', count(*) FILTER (WHERE c.status = 'UNAVAILABLE'),
      'failed', count(*) FILTER (WHERE c.status = 'FAILED'),
      'records', (
        SELECT count(*)
        FROM public.bora_engine_seed_hours sh
        WHERE sh.hour_index = v_closed_hour
          AND sh.song_id IN (
            SELECT song_id FROM public.bora_engine_song_state
            WHERE lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        SELECT count(*)
        FROM public.bora_engine_seed_hours sh
        WHERE sh.hour_index = v_closed_hour
          AND sh.c = 0
          AND sh.song_id IN (
            SELECT song_id FROM public.bora_engine_song_state
            WHERE lifecycle = 'ACTIVE'
          )
      )
    )
    INTO v_seed
    FROM public.bora_engine_hourly_input_coverage c
    JOIN public.bora_engine_song_state s ON s.song_id = c.song_id
    WHERE s.lifecycle = 'ACTIVE'
      AND c.input_type = 'SEED'
      AND c.hour_index BETWEEN v_closed_hour - 71 AND v_closed_hour;

    -- YouTube: full 168-hour window [R-167, R].
    SELECT jsonb_build_object(
      'status', CASE
        WHEN count(*) FILTER (WHERE c.status = 'COMPLETE') = v_active_count * 168
        THEN 'ready' ELSE 'incomplete' END,
      'expected', v_active_count * 168,
      'complete', count(*) FILTER (WHERE c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 168 - count(c.song_id), 0),
      'unavailable', count(*) FILTER (WHERE c.status = 'UNAVAILABLE'),
      'failed', count(*) FILTER (WHERE c.status = 'FAILED'),
      'records', (
        SELECT count(*) FROM public.bora_engine_platform_observations p
        WHERE p.platform = 'youtube'
          AND p.hour_index BETWEEN v_closed_hour - 167 AND v_closed_hour
          AND p.song_id IN (
            SELECT song_id FROM public.bora_engine_song_state
            WHERE lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        SELECT count(*) FROM public.bora_engine_platform_observations p
        WHERE p.platform = 'youtube' AND p.value = 0
          AND p.hour_index BETWEEN v_closed_hour - 167 AND v_closed_hour
          AND p.song_id IN (
            SELECT song_id FROM public.bora_engine_song_state
            WHERE lifecycle = 'ACTIVE'
          )
      )
    )
    INTO v_youtube
    FROM public.bora_engine_hourly_input_coverage c
    JOIN public.bora_engine_song_state s ON s.song_id = c.song_id
    WHERE s.lifecycle = 'ACTIVE'
      AND c.input_type = 'YOUTUBE'
      AND c.hour_index BETWEEN v_closed_hour - 167 AND v_closed_hour;

    -- Spotify: full 168-hour window [R-167, R].
    SELECT jsonb_build_object(
      'status', CASE
        WHEN count(*) FILTER (WHERE c.status = 'COMPLETE') = v_active_count * 168
        THEN 'ready' ELSE 'incomplete' END,
      'expected', v_active_count * 168,
      'complete', count(*) FILTER (WHERE c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 168 - count(c.song_id), 0),
      'unavailable', count(*) FILTER (WHERE c.status = 'UNAVAILABLE'),
      'failed', count(*) FILTER (WHERE c.status = 'FAILED'),
      'records', (
        SELECT count(*) FROM public.bora_engine_platform_observations p
        WHERE p.platform = 'spotify'
          AND p.hour_index BETWEEN v_closed_hour - 167 AND v_closed_hour
          AND p.song_id IN (
            SELECT song_id FROM public.bora_engine_song_state
            WHERE lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        SELECT count(*) FROM public.bora_engine_platform_observations p
        WHERE p.platform = 'spotify' AND p.value = 0
          AND p.hour_index BETWEEN v_closed_hour - 167 AND v_closed_hour
          AND p.song_id IN (
            SELECT song_id FROM public.bora_engine_song_state
            WHERE lifecycle = 'ACTIVE'
          )
      )
    )
    INTO v_spotify
    FROM public.bora_engine_hourly_input_coverage c
    JOIN public.bora_engine_song_state s ON s.song_id = c.song_id
    WHERE s.lifecycle = 'ACTIVE'
      AND c.input_type = 'SPOTIFY'
      AND c.hour_index BETWEEN v_closed_hour - 167 AND v_closed_hour;

    -- Boomplay: full 168-hour window [R-167, R].
    SELECT jsonb_build_object(
      'status', CASE
        WHEN count(*) FILTER (WHERE c.status = 'COMPLETE') = v_active_count * 168
        THEN 'ready' ELSE 'incomplete' END,
      'expected', v_active_count * 168,
      'complete', count(*) FILTER (WHERE c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 168 - count(c.song_id), 0),
      'unavailable', count(*) FILTER (WHERE c.status = 'UNAVAILABLE'),
      'failed', count(*) FILTER (WHERE c.status = 'FAILED'),
      'records', (
        SELECT count(*) FROM public.bora_engine_platform_observations p
        WHERE p.platform = 'boomplay'
          AND p.hour_index BETWEEN v_closed_hour - 167 AND v_closed_hour
          AND p.song_id IN (
            SELECT song_id FROM public.bora_engine_song_state
            WHERE lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        SELECT count(*) FROM public.bora_engine_platform_observations p
        WHERE p.platform = 'boomplay' AND p.value = 0
          AND p.hour_index BETWEEN v_closed_hour - 167 AND v_closed_hour
          AND p.song_id IN (
            SELECT song_id FROM public.bora_engine_song_state
            WHERE lifecycle = 'ACTIVE'
          )
      )
    )
    INTO v_boomplay
    FROM public.bora_engine_hourly_input_coverage c
    JOIN public.bora_engine_song_state s ON s.song_id = c.song_id
    WHERE s.lifecycle = 'ACTIVE'
      AND c.input_type = 'BOOMPLAY'
      AND c.hour_index BETWEEN v_closed_hour - 167 AND v_closed_hour;

  ELSE
    v_closed_hour := p_closed_hour;
    v_vote := jsonb_build_object(
      'status', 'incomplete', 'expected', 0, 'complete', 0, 'missing', 0,
      'failed', 0, 'unavailable', 0, 'duplicates', 0, 'records', 0,
      'acceptedEvents', 0
    );
    v_seed := jsonb_build_object(
      'status', 'incomplete', 'expected', 0, 'complete', 0, 'missing', 0,
      'unavailable', 0, 'failed', 0, 'records', 0, 'zeroRecords', 0
    );
    v_youtube := jsonb_build_object(
      'status', 'incomplete', 'expected', 0, 'complete', 0, 'missing', 0,
      'unavailable', 0, 'failed', 0, 'records', 0, 'zeroRecords', 0
    );
    v_spotify := v_youtube;
    v_boomplay := v_youtube;
  END IF;

  v_ready := v_state_status = 'ready'
    AND v_vote ->> 'status' = 'ready'
    AND v_seed ->> 'status' = 'ready'
    AND v_youtube ->> 'status' = 'ready'
    AND v_spotify ->> 'status' = 'ready'
    AND v_boomplay ->> 'status' = 'ready';

  RETURN jsonb_build_object(
    'status', CASE WHEN v_ready THEN 'ready' ELSE 'not-ready' END,
    'closedHour', v_closed_hour,
    'checks', jsonb_build_object(
      'initialState', jsonb_build_object(
        'status', v_state_status,
        'songCount', v_song_count,
        'referenceHour', v_reference_hour
      ),
      'voteHistory', v_vote,
      'seedHours', v_seed,
      'youtube', v_youtube,
      'spotify', v_spotify,
      'boomplay', v_boomplay
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.bora_engine_readiness(bigint)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.bora_engine_readiness(bigint)
  TO service_role;
