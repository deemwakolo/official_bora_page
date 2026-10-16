-- ============================================================
-- BORA ENGINE — ATOMIC HOURLY CLAIM AND ROLLOVER OPERATIONS
-- ============================================================
--
-- Additive, unapplied proposal. Requires 0012 and 0013 to have been applied.
-- All RPCs are restricted to service_role: the cookie/anon server client is
-- deliberately not authorized to claim hours or mutate Engine state.
--
-- The state head is intentionally not initialized here. Production state
-- bootstrap is a separate trusted operation; without it, loading returns
-- not-ready rather than inventing a starting reference hour.
-- ============================================================

alter table public.bora_engine_hourly_runs
  add column claim_request_id uuid,
  add constraint bora_engine_hourly_runs_claim_request_check
    check ((status = 'processing') = (claim_request_id is not null));

create unique index bora_engine_hourly_runs_claim_request_uk
  on public.bora_engine_hourly_runs (claim_request_id)
  where claim_request_id is not null;

create unique index bora_engine_hourly_runs_lease_token_uk
  on public.bora_engine_hourly_runs (lease_token)
  where lease_token is not null;

create table public.bora_engine_hourly_state_head (
  singleton boolean primary key default true
    check (singleton),
  reference_hour bigint not null,
  revision bigint not null default 0
    check (revision >= 0),
  updated_at timestamptz not null default now()
);

alter table public.bora_engine_hourly_state_head
  enable row level security;

revoke all on table public.bora_engine_hourly_state_head
  from anon, authenticated;

create function public.bora_engine_hourly_snapshot(
  p_closed_hour bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reference_hour bigint;
  v_revision bigint;
  v_snapshot jsonb;
  v_active_count bigint;
  v_complete_count bigint;
begin
  select reference_hour, revision
    into v_reference_hour, v_revision
  from public.bora_engine_hourly_state_head
  where singleton = true;

  if not found then
    return jsonb_build_object(
      'status', 'not-ready',
      'gaps', jsonb_build_array(jsonb_build_object(
        'hourIndex', p_closed_hour,
        'reason', 'empty-state'
      ))
    );
  end if;

  if v_reference_hour <> p_closed_hour then
    return jsonb_build_object(
      'status', 'not-ready',
      'gaps', jsonb_build_array(jsonb_build_object(
        'hourIndex', p_closed_hour,
        'reason', 'state-hour-mismatch'
      ))
    );
  end if;

  -- Coverage readiness gate: require complete input coverage before reporting ready.
  -- COMPLETE coverage with zero value rows means a verified empty hour; missing,
  -- UNAVAILABLE, or FAILED rows must not be reinterpreted as zero.
  -- Zero active songs is a degenerate state: bootstrap explicitly rejects it
  -- (BORA_ENGINE_BOOTSTRAP_STATE_INCOMPLETE), and readiness reports it as
  -- incomplete/missing. The 0 = 0 * 506 coverage comparison would otherwise
  -- pass trivially, so reject zero active songs explicitly.
  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  if v_active_count = 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'gaps', jsonb_build_array(jsonb_build_object(
        'hourIndex', p_closed_hour,
        'reason', 'no-active-songs'
      ))
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

  if v_complete_count <> v_active_count * 506 then
    return jsonb_build_object(
      'status', 'not-ready',
      'gaps', jsonb_build_array(jsonb_build_object(
        'hourIndex', p_closed_hour,
        'reason', 'coverage-incomplete',
        'expected', v_active_count * 506,
        'complete', v_complete_count,
        'missing', greatest(v_active_count * 506 - v_complete_count, 0)
      ))
    );
  end if;

  select jsonb_build_object(
    'status', 'ready',
    'stateRevision', v_revision,
    'state', jsonb_build_object(
      'referenceHour', v_reference_hour,
      'songs', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'songId', s.song_id::text,
            'lifecycle', s.lifecycle,
            'k', s.k,
            'persistentKura', s.persistent_kura,
            'buckets', coalesce((
              select jsonb_agg(jsonb_build_object(
                'hourIndex', b.hour_index,
                'upvotes', b.upvotes,
                'downvotes', b.downvotes,
                'phase', b.phase,
                'version', b.version
              ) order by b.hour_index)
              from public.bora_engine_vote_buckets b
              where b.song_id = s.song_id
            ), '[]'::jsonb),
            'seedHours', coalesce((
              select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                'hourIndex', sh.hour_index,
                'c', sh.c,
                'source', sh.source,
                'lifecycle', sh.lifecycle,
                'version', sh.version,
                'originEventId', sh.origin_event_id
              )) order by sh.hour_index)
              from public.bora_engine_seed_hours sh
              where sh.song_id = s.song_id
            ), '[]'::jsonb),
            'platform', jsonb_build_object(
              'youtube', coalesce((
                select jsonb_agg(jsonb_build_object(
                  'hourIndex', p.hour_index,
                  'platform', p.platform,
                  'value', p.value,
                  'source', p.source,
                  'lifecycle', p.lifecycle,
                  'version', p.version
                ) order by p.hour_index)
                from public.bora_engine_platform_observations p
                where p.song_id = s.song_id and p.platform = 'youtube'
              ), '[]'::jsonb),
              'spotify', coalesce((
                select jsonb_agg(jsonb_build_object(
                  'hourIndex', p.hour_index,
                  'platform', p.platform,
                  'value', p.value,
                  'source', p.source,
                  'lifecycle', p.lifecycle,
                  'version', p.version
                ) order by p.hour_index)
                from public.bora_engine_platform_observations p
                where p.song_id = s.song_id and p.platform = 'spotify'
              ), '[]'::jsonb),
              'boomplay', coalesce((
                select jsonb_agg(jsonb_build_object(
                  'hourIndex', p.hour_index,
                  'platform', p.platform,
                  'value', p.value,
                  'source', p.source,
                  'lifecycle', p.lifecycle,
                  'version', p.version
                ) order by p.hour_index)
                from public.bora_engine_platform_observations p
                where p.song_id = s.song_id and p.platform = 'boomplay'
              ), '[]'::jsonb)
            )
          ) order by s.song_id
        )
        from public.bora_engine_song_state s
      ), '[]'::jsonb)
    ),
    'coverage', coalesce((
      select jsonb_agg(jsonb_build_object(
        'songId', c.song_id::text,
        'inputType', c.input_type,
        'hourIndex', c.hour_index,
        'status', c.status
      ) order by c.song_id, c.input_type, c.hour_index)
      from public.bora_engine_hourly_input_coverage c
      join public.bora_engine_song_state s on s.song_id = c.song_id
      where
        (c.input_type in ('VOTES', 'SEED')
          and c.hour_index = p_closed_hour)
        or
        (c.input_type in ('YOUTUBE', 'SPOTIFY', 'BOOMPLAY')
          and c.hour_index between p_closed_hour - 167 and p_closed_hour)
    ), '[]'::jsonb)
  )
    into v_snapshot;

  if jsonb_array_length(v_snapshot #> '{state,songs}') = 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'gaps', jsonb_build_array(jsonb_build_object(
        'hourIndex', p_closed_hour,
        'reason', 'empty-state'
      ))
    );
  end if;

  return v_snapshot;
end;
$$;

create function public.bora_engine_claim_hour(
  p_closed_hour bigint,
  p_claim_request_id uuid,
  p_lease_duration_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_run public.bora_engine_hourly_runs%rowtype;
  v_eligible_at timestamptz;
  v_now timestamptz := clock_timestamp();
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;
  if p_closed_hour is null
    or p_claim_request_id is null
    or p_lease_duration_ms is null
    or p_lease_duration_ms <= 0 then
    raise exception 'BORA_ENGINE_INVALID_CLAIM';
  end if;

  v_eligible_at := to_timestamp(
    ((p_closed_hour::numeric + 1) * 3600 + 600)::double precision
  );

  select *
    into v_run
  from public.bora_engine_hourly_runs
  where closed_hour = p_closed_hour
  for update;

  v_now := clock_timestamp();

  if found and v_run.status = 'completed' then
    return jsonb_build_object('status', 'already-completed');
  end if;

  if v_now < v_eligible_at then
    return jsonb_build_object(
      'status', 'not-eligible',
      'eligibleAtMs', floor(extract(epoch from v_eligible_at) * 1000)::bigint
    );
  end if;

  insert into public.bora_engine_hourly_runs (closed_hour)
  values (p_closed_hour)
  on conflict (closed_hour) do nothing;

  select *
    into v_run
  from public.bora_engine_hourly_runs
  where closed_hour = p_closed_hour
  for update;

  v_now := clock_timestamp();

  if v_run.status = 'completed' then
    return jsonb_build_object('status', 'already-completed');
  end if;

  if v_now < v_eligible_at then
    return jsonb_build_object(
      'status', 'not-eligible',
      'eligibleAtMs', floor(extract(epoch from v_eligible_at) * 1000)::bigint
    );
  end if;

  if v_run.status = 'processing'
    and v_run.lease_expires_at > v_now then
    if v_run.claim_request_id = p_claim_request_id then
      return jsonb_build_object(
        'status', 'claimed',
        'leaseToken', v_run.lease_token
      );
    end if;
    return jsonb_build_object('status', 'already-claimed');
  end if;

  update public.bora_engine_hourly_runs
  set status = 'processing',
      attempt_count = attempt_count + 1,
      lease_token = gen_random_uuid(),
      claim_request_id = p_claim_request_id,
      lease_expires_at = v_now
        + make_interval(secs => p_lease_duration_ms / 1000.0),
      started_at = v_now,
      completed_at = null,
      last_error_code = null,
      last_error_message = null,
      updated_at = v_now
  where closed_hour = p_closed_hour
  returning * into v_run;

  return jsonb_build_object(
    'status', 'claimed',
    'leaseToken', v_run.lease_token
  );
end;
$$;

create function public.bora_engine_load_hour(
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
  -- incomplete/missing. The 0 = 0 * 506 coverage comparison would otherwise
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

  if v_complete_count <> v_active_count * 506 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'coverage-incomplete',
      'closedHour', p_closed_hour,
      'expected', v_active_count * 506,
      'complete', v_complete_count,
      'missing', greatest(v_active_count * 506 - v_complete_count, 0)
    );
  end if;

  return public.bora_engine_hourly_snapshot(p_closed_hour);
end;
$$;

create function public.bora_engine_release_hour(
  p_closed_hour bigint,
  p_lease_token uuid,
  p_error_code text,
  p_retryable boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  update public.bora_engine_hourly_runs
  set status = case when p_retryable then 'failed' else 'pending' end,
      lease_token = null,
      claim_request_id = null,
      lease_expires_at = null,
      last_error_code = case when p_retryable then p_error_code else null end,
      last_error_message = null,
      updated_at = clock_timestamp()
  where closed_hour = p_closed_hour
    and status = 'processing'
    and lease_token = p_lease_token
    and lease_expires_at > clock_timestamp();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create function public.bora_engine_commit_hour(
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

  -- Prevent concurrent ingestion from changing the loaded source snapshot
  -- while it is compared and committed. The state head is locked first so two
  -- hour commits cannot deadlock while acquiring these table locks.
  lock table public.bora_engine_song_state in share mode;
  lock table public.bora_engine_vote_buckets in share mode;
  lock table public.bora_engine_seed_hours in share mode;
  lock table public.bora_engine_platform_observations in share mode;
  lock table public.bora_engine_hourly_input_coverage in share mode;
  lock table public.bora_engine_hourly_closures in share mode;

  -- Independent readiness enforcement inside the transaction: coverage must be
  -- complete before commit. Do not rely on the worker having called readiness
  -- beforehand. Tables are locked in share mode above so ingestion cannot change
  -- validated coverage before commit; lock order matches existing convention
  -- (state head first, then data tables) to avoid deadlocks.
  -- Zero active songs is a degenerate state: bootstrap explicitly rejects it
  -- (BORA_ENGINE_BOOTSTRAP_STATE_INCOMPLETE), and readiness reports it as
  -- incomplete/missing. The 0 = 0 * 506 coverage comparison would otherwise
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

  if v_complete_count <> v_active_count * 506 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'coverage-incomplete',
      'closedHour', p_closed_hour,
      'expected', v_active_count * 506,
      'complete', v_complete_count,
      'missing', greatest(v_active_count * 506 - v_complete_count, 0)
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
    from public.bora_engine_song_state s
    where s.lifecycle = 'ACTIVE'
      and not exists (
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
        join jsonb_array_elements(p_next_state -> 'songs') as n(value)
          on n.value ->> 'songId' = x."songId"
        where x."songId" = s.song_id::text
          and x."hourClosed" = p_closed_hour
          and x."persistentBefore" = s.persistent_kura
          and x."persistentAfter" = (n.value ->> 'persistentKura')::numeric
      )
  ) then
    raise exception 'BORA_ENGINE_INVALID_ROLLOVER_TRACE';
  end if;

  -- Reconcile every rollover step with the authoritative persisted input for
  -- the closed hour. Engine contract (resolveHourC, rollover.ts):
  --   * an ACTUAL bucket at (song, closed hour) takes precedence, even when it
  --     resolves to C 0 — bucket existence decides, never bucket value;
  --   * otherwise a persisted SEED record stands in; an ARCHIVED seed resolves
  --     to 0 (expiry is selection, never deletion);
  --   * otherwise the hour has no input and C is exactly 0.
  -- ACTUAL C is calculateHourlyC from the Engine's vote-threshold module
  -- (Contract 9): C_U = 0/1/2 and C_D = 0/0.5/1 at the 0/5-vote boundaries,
  -- C = max(0, C_U - C_D). The caller-supplied closedHourC must equal that
  -- resolution; it is never trusted on its own. The vote/seed tables are
  -- already locked in share mode above, so the versions recorded in the
  -- closure rows describe exactly the input validated here.
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
    where x."hourClosed" = p_closed_hour
      and (
        x."closedHourC" is null
        or x."closedHourC" < 0
        or x."closedHourC" > 2
        or x."freshInjected" is null
        or x."freshInjected" < 0
        or x."decayRate" is null
        or x."decayRate" < 0
        or x."decayRate" > 0.0025
        or x."persistentBefore" is null
        or x."persistentBefore" < 0
        or x."persistentAfter" is null
        or x."persistentAfter" < 0
      )
  ) then
    raise exception 'BORA_ENGINE_INVALID_ROLLOVER_STEP';
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
  end if;

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

revoke all on function public.bora_engine_hourly_snapshot(bigint)
  from public, anon, authenticated;
revoke all on function public.bora_engine_claim_hour(bigint, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.bora_engine_load_hour(bigint, uuid)
  from public, anon, authenticated;
revoke all on function public.bora_engine_release_hour(bigint, uuid, text, boolean)
  from public, anon, authenticated;
revoke all on function public.bora_engine_commit_hour(
  bigint, uuid, bigint, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;

grant execute on function public.bora_engine_hourly_snapshot(bigint)
  to service_role;
grant execute on function public.bora_engine_claim_hour(bigint, uuid, integer)
  to service_role;
grant execute on function public.bora_engine_load_hour(bigint, uuid)
  to service_role;
grant execute on function public.bora_engine_release_hour(bigint, uuid, text, boolean)
  to service_role;
grant execute on function public.bora_engine_commit_hour(
  bigint, uuid, bigint, jsonb, jsonb, jsonb, jsonb
) to service_role;
