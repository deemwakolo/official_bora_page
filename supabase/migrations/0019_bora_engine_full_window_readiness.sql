-- ============================================================
-- BORA ENGINE — STAGE 02: FULL-WINDOW READINESS PREDICATE FIX
-- ============================================================
-- Additive forward-only SQL. Updates the readiness predicate to require
-- every one of the 648 logical slots per active song.
--
-- Combined with part_001b through part_0019f via a build step.

create or replace function public.bora_engine_readiness(
  p_closed_hour bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
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
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  select reference_hour
    into v_reference_hour
  from public.bora_engine_hourly_state_head
  where singleton = true;

  if found then
    v_closed_hour := coalesce(p_closed_hour, v_reference_hour);
    select count(*), count(*) filter (where lifecycle = 'ACTIVE')
      into v_song_count, v_active_count
    from public.bora_engine_song_state;

    if v_song_count > 0
      and v_active_count > 0
      and v_reference_hour = v_closed_hour then
      v_state_status := 'ready';
    elsif v_song_count = 0 then
      v_state_status := 'missing';
    else
      v_state_status := 'incomplete';
    end if;
  else
    v_closed_hour := p_closed_hour;
  end if;

    -- Seed hours: full 72-hour window [R-71, R]
    select jsonb_build_object(
      'status', case when count(*) filter (where c.status = 'COMPLETE') = v_active_count * 72
        then 'ready' else 'incomplete' end,
      'expected', v_active_count * 72,
      'complete', count(*) filter (where c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 72 - count(c.song_id), 0),
      'unavailable', count(*) filter (where c.status = 'UNAVAILABLE'),
      'failed', count(*) filter (where c.status = 'FAILED'),
      'records', (
        select count(*)
        from public.bora_engine_seed_hours sh
        where sh.hour_index = v_closed_hour
          and sh.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        select count(*)
        from public.bora_engine_seed_hours sh
        where sh.hour_index = v_closed_hour
          and sh.c = 0
          and sh.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      )
    )
      into v_seed
    from public.bora_engine_hourly_input_coverage c
    join public.bora_engine_song_state s on s.song_id = c.song_id
    where s.lifecycle = 'ACTIVE'
      and c.input_type = 'SEED'
      and c.hour_index between v_closed_hour - 71 and v_closed_hour;

    -- Platform observations: full 168-hour window [R-167, R]
    select jsonb_build_object(
      'status', case when count(*) filter (where c.status = 'COMPLETE') = v_active_count * 168
        then 'ready' else 'incomplete' end,
      'expected', v_active_count * 168,
      'complete', count(*) filter (where c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 168 - count(c.song_id), 0),
      'unavailable', count(*) filter (where c.status = 'UNAVAILABLE'),
      'failed', count(*) filter (where c.status = 'FAILED'),
      'records', (
        select count(*)
        from public.bora_engine_platform_observations p
        where p.platform = 'youtube'
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        select count(*)
        from public.bora_engine_platform_observations p
        where p.platform = 'youtube'
          and p.value = 0
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      )
    )
      into v_youtube
    from public.bora_engine_hourly_input_coverage c
    join public.bora_engine_song_state s on s.song_id = c.song_id
    where s.lifecycle = 'ACTIVE'
      and c.input_type = 'YOUTUBE'
      and c.hour_index between v_closed_hour - 167 and v_closed_hour;

    select jsonb_build_object(
      'status', case when count(*) filter (where c.status = 'COMPLETE') = v_active_count * 168
        then 'ready' else 'incomplete' end,
      'expected', v_active_count * 168,
      'complete', count(*) filter (where c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 168 - count(c.song_id), 0),
      'unavailable', count(*) filter (where c.status = 'UNAVAILABLE'),
      'failed', count(*) filter (where c.status = 'FAILED'),
      'records', (
        select count(*)
        from public.bora_engine_platform_observations p
        where p.platform = 'spotify'
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        select count(*)
        from public.bora_engine_platform_observations p
        where p.platform = 'spotify'
          and p.value = 0
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      )
    )
      into v_spotify
    from public.bora_engine_hourly_input_coverage c
    join public.bora_engine_song_state s on s.song_id = c.song_id
    where s.lifecycle = 'ACTIVE'
      and c.input_type = 'SPOTIFY'
      and c.hour_index between v_closed_hour - 167 and v_closed_hour;

    select jsonb_build_object(
      'status', case when count(*) filter (where c.status = 'COMPLETE') = v_active_count * 168
        then 'ready' else 'incomplete' end,
      'expected', v_active_count * 168,
      'complete', count(*) filter (where c.status = 'COMPLETE'),
      'missing', greatest(v_active_count * 168 - count(c.song_id), 0),
      'unavailable', count(*) filter (where c.status = 'UNAVAILABLE'),
      'failed', count(*) filter (where c.status = 'FAILED'),
      'records', (
        select count(*)
        from public.bora_engine_platform_observations p
        where p.platform = 'boomplay'
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      ),
      'zeroRecords', (
        select count(*)
        from public.bora_engine_platform_observations p
        where p.platform = 'boomplay'
          and p.value = 0
          and p.hour_index between v_closed_hour - 167 and v_closed_hour
          and p.song_id in (
            select song_id
            from public.bora_engine_song_state
            where lifecycle = 'ACTIVE'
          )
      )
    )
      into v_boomplay
    from public.bora_engine_hourly_input_coverage c
    join public.bora_engine_song_state s on s.song_id = c.song_id
    where s.lifecycle = 'ACTIVE'
      and c.input_type = 'BOOMPLAY'
      and c.hour_index between v_closed_hour - 167 and v_closed_hour;
  else
    v_vote := jsonb_build_object(
      'status', 'incomplete', 'expected', 1, 'complete', 0, 'missing', 1,
      'unavailable', 0, 'failed', 0, 'records', 0, 'zeroRecords', 0,
      'acceptedEvents', 0
    );
    v_seed := v_vote;
    v_youtube := jsonb_build_object(
      'status', 'incomplete', 'expected', 168, 'complete', 0, 'missing', 168,
      'unavailable', 0, 'failed', 0, 'records', 0, 'zeroRecords', 0
    );
    v_spotify := v_youtube;
    v_boomplay := v_youtube;
  end if;

  v_ready := v_state_status = 'ready'
    and v_vote ->> 'status' = 'ready'
    and v_seed ->> 'status' = 'ready'
    and v_youtube ->> 'status' = 'ready'
    and v_spotify ->> 'status' = 'ready'
    and v_boomplay ->> 'status' = 'ready';

  return jsonb_build_object(
    'status', case when v_ready then 'ready' else 'not-ready' end,
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
end;
$$;

revoke all on function public.bora_engine_readiness(bigint)
  from public, anon, authenticated;

grant execute on function public.bora_engine_readiness(bigint)
  to service_role;

