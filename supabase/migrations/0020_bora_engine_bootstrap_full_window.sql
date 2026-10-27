-- ============================================================
-- BORA ENGINE — STAGE 02: BOOTSTRAP FULL-WINDOW PREDICATE
-- ============================================================
-- Additive forward-only SQL. Updates the bootstrap hourly claim predicate
-- to require the full 648-slot evaluation window per active song, not the
-- narrow 506-row constant.
--
-- Per active song the predicate now requires:
--   - VOTES (`vote-history`): COMPLETE for [R-71, R] (72 slots)
--   - SEED (`seed-history`):   COMPLETE for [R-71, R] (72 slots)
--   - YOUTUBE/SPOTIFY/BOOMPLAY: COMPLETE for [R-167, R] (168 each)
--   - Total: 648 satisfied slots.

create or replace function public.bora_engine_check_hour(
  p_closed_hour bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_reference_hour bigint;
  v_active_count bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  select status
    into v_status
  from public.bora_engine_hourly_runs
  where closed_hour = p_closed_hour
  for share;

  if not found then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'missing-hourly-run'
    );
  end if;

  if v_status = 'completed' then
    return jsonb_build_object('status', 'already-completed');
  end if;

  if v_status not in ('pending', 'processing', 'failed') then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'ineligible-run-status'
    );
  end if;

  select reference_hour
    into v_reference_hour
  from public.bora_engine_hourly_state_head
  where singleton = true;

  if not found then
    return jsonb_build_object('status', 'bootstrap-required');
  end if;
  if v_reference_hour <> p_closed_hour then
    return jsonb_build_object('status', 'reference-hour-mismatch');
  end if;

  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  if v_active_count = 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'no-active-songs'
    );
  end if;

  -- Full 648-slot window:
  --   72 vote-hours + 72 seed-hours + 3 x 168 platform-hours.
  declare
    v_complete_count bigint;
    v_observation_slots bigint;
    v_vote_slots bigint;
    v_seed_slots bigint;
  begin
    v_vote_slots := v_active_count * 72;
    v_seed_slots := v_active_count * 72;
    v_observation_slots := v_active_count * 168 * 3;

    select
      count(*)
    into v_complete_count
    from public.bora_engine_hourly_input_coverage c
    where c.status = 'COMPLETE'
      and exists (
        select 1
        from public.bora_engine_song_state s
        where s.song_id = c.song_id
          and s.lifecycle = 'ACTIVE'
      )
      and (
        (c.input_type in ('VOTES', 'SEED')
          and c.hour_index between p_closed_hour - 71 and p_closed_hour)
        or
        (c.input_type = 'platform-observation-history'
          and c.hour_index between p_closed_hour - 167 and p_closed_hour)
      );

    if v_complete_count <> v_vote_slots + v_seed_slots + v_observation_slots then
      return jsonb_build_object(
        'status', 'not-ready',
        'reason', 'coverage-incomplete',
        'closedHour', p_closed_hour,
        'expected', v_vote_slots + v_seed_slots + v_observation_slots,
        'complete', v_complete_count,
        'missing', greatest(
          v_vote_slots + v_seed_slots + v_observation_slots - v_complete_count, 0
        )
      );
    end if;
  end;

  return jsonb_build_object(
    'status', 'ready',
    'closedHour', p_closed_hour,
    'expectedSlots', v_vote_slots + v_seed_slots + v_observation_slots
  );
end;
$$;

revoke all on function public.bora_engine_check_hour(bigint)
  from public, anon, authenticated;

grant execute on function public.bora_engine_check_hour(bigint)
  to service_role;
