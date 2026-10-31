-- ============================================================================
-- Migration: 0032_bora_engine_rollover_648_coverage.sql
-- Description: Corrects bora_engine_load_hour and bora_engine_commit_hour
--              coverage expectation from 506 to 648 slots per active song.
--
-- Coverage contract:
--   VOTES     72 slots
--   SEED      72 slots
--   YOUTUBE   168 slots
--   SPOTIFY   168 slots
--   BOOMPLAY  168 slots
--   Total     648 slots
-- ============================================================================

-- Redefine bora_engine_load_hour with corrected 648-slot coverage expectation.
create or replace function public.bora_engine_load_hour(
  p_closed_hour bigint,
  p_lease_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.bora_engine_hourly_runs%rowtype;
  v_active_count bigint;
  v_complete_count bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  select *
    into v_run
  from public.bora_engine_hourly_runs
  where closed_hour = p_closed_hour
  for update;

  if not found
    or v_run.status <> 'processing'
    or v_run.lease_token <> p_lease_token
    or v_run.lease_expires_at <= clock_timestamp() then
    raise exception 'BORA_ENGINE_STALE_LEASE';
  end if;

  -- Readiness gate: require complete input coverage before providing a usable snapshot.
  -- Only COMPLETE coverage establishes that an empty hour was checked; missing rows
  -- are not reinterpreted as zero values.
  -- Zero active songs is a degenerate state: bootstrap explicitly rejects it
  -- (BORA_ENGINE_BOOTSTRAP_STATE_INCOMPLETE), and readiness reports it as
  -- incomplete/missing. The 0 = 0 * 648 coverage comparison would otherwise
  -- pass trivially, so reject zero active songs explicitly.
  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  if v_active_count = 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'no-active-songs',
      'closedHour', p_closed_hour,
      'expected', 0,
      'complete', 0,
      'missing', 0
    );
  end if;

  select count(*)
    into v_complete_count
  from public.bora_engine_hourly_input_coverage c
  join public.bora_engine_song_state s on s.song_id = c.song_id
  where s.lifecycle = 'ACTIVE'
    and c.status = 'COMPLETE'
    and (
      (c.input_type in ('VOTES', 'SEED')
        and c.hour_index = p_closed_hour)
      or
      (c.input_type in ('YOUTUBE', 'SPOTIFY', 'BOOMPLAY')
        and c.hour_index between p_closed_hour - 167 and p_closed_hour)
    );

  if v_complete_count <> v_active_count * 648 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'coverage-incomplete',
      'closedHour', p_closed_hour,
      'expected', v_active_count * 648,
      'complete', v_complete_count,
      'missing', greatest(v_active_count * 648 - v_complete_count, 0)
    );
  end if;

  return public.bora_engine_hourly_snapshot(p_closed_hour);
end;
$$;

-- Redefine bora_engine_commit_hour with corrected 648-slot coverage expectation.
create or replace function public.bora_engine_commit_hour(
  p_closed_hour bigint,
  p_lease_token uuid,
  p_expected_state_revision bigint,
  p_expected_state jsonb,
  p_expected_coverage jsonb,
  p_next_state jsonb,
  p_steps jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.bora_engine_hourly_runs%rowtype;
  v_head public.bora_engine_hourly_state_head%rowtype;
  v_snapshot jsonb;
  v_step_count integer;
  v_song_count integer;
  v_active_count integer;
  v_complete_count integer;
  v_updated integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;
  if jsonb_typeof(p_expected_state) is distinct from 'object'
    or jsonb_typeof(p_expected_coverage) is distinct from 'array'
    or jsonb_typeof(p_next_state) is distinct from 'object'
    or jsonb_typeof(p_next_state -> 'songs') is distinct from 'array'
    or jsonb_typeof(p_steps) is distinct from 'array'
    or p_closed_hour is null
    or p_lease_token is null
    or p_expected_state_revision is null
    or p_expected_state_revision < 0
    or p_next_state ->> 'referenceHour' is null
    or (p_next_state ->> 'referenceHour')::bigint <> p_closed_hour + 1 then
    raise exception 'BORA_ENGINE_INVALID_COMMIT';
  end if;

  select *
    into v_run
  from public.bora_engine_hourly_runs
  where closed_hour = p_closed_hour
  for update;

  if not found then
    return jsonb_build_object('status', 'stale-lease');
  end if;
  if v_run.status = 'completed' then
    return jsonb_build_object('status', 'already-completed');
  end if;
  if v_run.status <> 'processing'
    or v_run.lease_token <> p_lease_token
    or v_run.lease_expires_at <= clock_timestamp() then
    return jsonb_build_object('status', 'stale-lease');
  end if;

  select *
    into v_head
  from public.bora_engine_hourly_state_head
  where singleton = true
  for update;

  if not found
    or v_head.reference_hour <> p_closed_hour
    or v_head.revision <> p_expected_state_revision then
    return jsonb_build_object('status', 'stale-state');
  end if;

  lock table public.bora_engine_song_state in share mode;
  lock table public.bora_engine_vote_buckets in share mode;
  lock table public.bora_engine_seed_hours in share mode;
  lock table public.bora_engine_platform_observations in share mode;
  lock table public.bora_engine_hourly_input_coverage in share mode;
  lock table public.bora_engine_hourly_closures in share mode;

  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  if v_active_count = 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'no-active-songs',
      'closedHour', p_closed_hour,
      'expected', 0,
      'complete', 0,
      'missing', 0
    );
  end if;

  select count(*)
    into v_complete_count
  from public.bora_engine_hourly_input_coverage c
  join public.bora_engine_song_state s on s.song_id = c.song_id
  where s.lifecycle = 'ACTIVE'
    and c.status = 'COMPLETE'
    and (
      (c.input_type in ('VOTES', 'SEED')
        and c.hour_index = p_closed_hour)
      or
      (c.input_type in ('YOUTUBE', 'SPOTIFY', 'BOOMPLAY')
        and c.hour_index between p_closed_hour - 167 and p_closed_hour)
    );

  if v_complete_count <> v_active_count * 648 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'coverage-incomplete',
      'closedHour', p_closed_hour,
      'expected', v_active_count * 648,
      'complete', v_complete_count,
      'missing', greatest(v_active_count * 648 - v_complete_count, 0)
    );
  end if;

  v_snapshot := public.bora_engine_hourly_snapshot(p_closed_hour);
  if v_snapshot ->> 'status' <> 'ready'
    or (v_snapshot ->> 'stateRevision')::bigint
      <> p_expected_state_revision
    or v_snapshot -> 'state' <> p_expected_state
    or v_snapshot -> 'coverage' <> p_expected_coverage then
    return jsonb_build_object('status', 'stale-state');
  end if;

  select count(*)
    into v_song_count
  from jsonb_array_elements(p_next_state -> 'songs');

  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  select count(*)
    into v_step_count
  from jsonb_to_recordset(p_steps) as x(
    "songId" text,
    "hourClosed" bigint,
    "closedHourC" numeric,
    "freshInjected" numeric,
    "decayRate" numeric,
    "persistentBefore" numeric,
    "persistentAfter" numeric
  );

  if v_song_count <> (select count(*) from public.bora_engine_song_state)
    or v_song_count <> (
      select count(distinct value ->> 'songId')
      from jsonb_array_elements(p_next_state -> 'songs')
    )
    or v_step_count <> v_active_count
    or v_step_count <> (
      select count(distinct x."songId")
      from jsonb_to_recordset(p_steps) as x(
        "songId" text,
        "hourClosed" bigint,
        "closedHourC" numeric,
        "freshInjected" numeric,
        "decayRate" numeric,
        "persistentBefore" numeric,
        "persistentAfter" numeric
      )
    ) then
    raise exception 'BORA_ENGINE_INVALID_COMMIT_SHAPE';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_next_state -> 'songs') as n(value)
    left join public.bora_engine_song_state s
      on s.song_id::text = n.value ->> 'songId'
    where n.value ->> 'songId' is null
      or n.value ->> 'lifecycle' is null
      or n.value ->> 'k' is null
      or n.value ->> 'persistentKura' is null
      or s.song_id is null
      or s.lifecycle <> n.value ->> 'lifecycle'
      or s.k <> (n.value ->> 'k')::numeric
      or (
        s.lifecycle = 'VAULT'
        and s.persistent_kura <> (n.value ->> 'persistentKura')::numeric
      )
  ) then
    raise exception 'BORA_ENGINE_INVALID_NEXT_STATE';
  end if;

  if exists (
    select 1
    from public.bora_engine_song_state s
    where s.lifecycle = 'ACTIVE'
      and s.last_decay_hour is not null
      and s.last_decay_hour >= p_closed_hour
  ) then
    raise exception 'BORA_ENGINE_HOUR_ALREADY_DECAYED';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_steps) as x(
      "songId" text,
      "hourClosed" bigint,
      "closedHourC" numeric,
      "freshInjected" numeric,
      "decayRate" numeric,
      "persistentBefore" numeric,
      "persistentAfter" numeric
    )
    join public.bora_engine_song_state s
      on s.song_id::text = x."songId" and s.lifecycle = 'ACTIVE'
    left join public.bora_engine_vote_buckets b
      on b.song_id = s.song_id and b.hour_index = p_closed_hour
    left join public.bora_engine_seed_hours sh
      on sh.song_id = s.song_id and sh.hour_index = p_closed_hour
    where x."hourClosed" = p_closed_hour
      and x."closedHourC" is distinct from case
        when b.song_id is not null then greatest(
          (case
            when b.upvotes = 0 then 0
            when b.upvotes < 5 then 1
            else 2
          end)
          - (case
            when b.downvotes = 0 then 0
            when b.downvotes < 5 then 0.5
            else 1
          end),
          0
        )
        when sh.song_id is not null then case
          when sh.lifecycle = 'ARCHIVED' then 0
          else sh.c
        end
        else 0
      end
  ) then
    raise exception 'BORA_ENGINE_ROLLOVER_INPUT_MISMATCH';

  insert into public.bora_engine_hourly_closures (
    closed_hour,
    song_id,
    c,
    c_source,
    source_bucket_version,
    source_seed_version,
    fresh_injected,
    decay_rate,
    persistent_before,
    persistent_after
  )
  select
    p_closed_hour,
    s.song_id,
    x."closedHourC",
    case
      when b.song_id is not null then 'ACTUAL'
      when sh.song_id is not null then 'SEED'
      else 'NONE'
    end,
    b.version,
    case when b.song_id is null then sh.version else null end,
    x."freshInjected",
    x."decayRate",
    x."persistentBefore",
    x."persistentAfter"
  from jsonb_to_recordset(p_steps) as x(
    "songId" text,
    "hourClosed" bigint,
    "closedHourC" numeric,
    "freshInjected" numeric,
    "decayRate" numeric,
    "persistentBefore" numeric,
    "persistentAfter" numeric
  )
  join public.bora_engine_song_state s
    on s.song_id::text = x."songId" and s.lifecycle = 'ACTIVE'
  left join public.bora_engine_vote_buckets b
    on b.song_id = s.song_id and b.hour_index = p_closed_hour
  left join public.bora_engine_seed_hours sh
    on sh.song_id = s.song_id and sh.hour_index = p_closed_hour
  where x."hourClosed" = p_closed_hour;

  get diagnostics v_updated = row_count;
  if v_updated <> v_active_count then
    raise exception 'BORA_ENGINE_INCOMPLETE_CLOSURE_TRACE';
  end if;

  update public.bora_engine_song_state s
  set persistent_kura = (n.value ->> 'persistentKura')::numeric,
      last_decay_hour = p_closed_hour,
      updated_at = clock_timestamp()
  from jsonb_array_elements(p_next_state -> 'songs') as n(value)
  where s.song_id::text = n.value ->> 'songId'
    and s.lifecycle = 'ACTIVE';

  update public.bora_engine_hourly_state_head
  set reference_hour = p_closed_hour + 1,
      revision = revision + 1,
      updated_at = clock_timestamp()
  where singleton = true
    and reference_hour = p_closed_hour
    and revision = p_expected_state_revision;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'BORA_ENGINE_STATE_HEAD_CONFLICT';
  end if;

  update public.bora_engine_hourly_runs
  set status = 'completed',
      lease_token = null,
      claim_request_id = null,
      lease_expires_at = null,
      completed_at = clock_timestamp(),
      last_error_code = null,
      last_error_message = null,
      updated_at = clock_timestamp()
  where closed_hour = p_closed_hour
    and status = 'processing'
    and lease_token = p_lease_token
    and lease_expires_at > clock_timestamp();

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'BORA_ENGINE_STALE_LEASE';
  end if;

  return jsonb_build_object('status', 'completed');
end;
$$;

revoke all on function public.bora_engine_load_hour(bigint, uuid)
  from public, anon, authenticated;
revoke all on function public.bora_engine_commit_hour(
  bigint, uuid, bigint, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.bora_engine_load_hour(bigint, uuid)
  to service_role;
grant execute on function public.bora_engine_commit_hour(
  bigint, uuid, bigint, jsonb, jsonb, jsonb, jsonb
) to service_role;
  end if;