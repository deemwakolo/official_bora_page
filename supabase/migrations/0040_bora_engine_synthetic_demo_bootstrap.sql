-- Align bootstrap with the 72-hour vote/seed contract and support an
-- explicitly synthetic starting fixture without impersonating a rank submitter.

alter table public.bora_engine_daily_platform_rank_snapshots
  alter column submitted_by drop not null;

alter table public.bora_engine_daily_platform_rank_snapshots
  add column is_synthetic boolean not null default false;

alter table public.bora_engine_daily_platform_rank_snapshots
  add constraint bora_engine_daily_platform_rank_synthetic_submitter_check
  check (
    (is_synthetic and submitted_by is null)
    or (not is_synthetic and submitted_by is not null)
  );

create table public.bora_engine_synthetic_demo_audit (
  fixture_id uuid primary key,
  reference_hour bigint not null,
  effective_date date not null,
  song_count integer not null check (song_count > 0),
  real_vote_event_count integer not null check (real_vote_event_count >= 0),
  synthetic_seed_hour_count integer not null check (synthetic_seed_hour_count >= 0),
  synthetic_zero_vote_hour_count integer not null check (synthetic_zero_vote_hour_count >= 0),
  synthetic_rank_snapshot_count integer not null check (synthetic_rank_snapshot_count > 0),
  superseded_coverage jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.bora_engine_synthetic_demo_audit enable row level security;
revoke all on table public.bora_engine_synthetic_demo_audit
  from public, anon, authenticated;
grant all on table public.bora_engine_synthetic_demo_audit to service_role;

do $$
declare
  v_definition text;
  v_updated text;
begin
  select pg_get_functiondef(
    'public.bora_engine_bootstrap_state(uuid,text,text,bigint,jsonb,jsonb)'::regprocedure
  )
    into v_definition;

  v_updated := replace(
    v_definition,
    '72 VOTES + 72 SEED + 168 each platform.',
    '72 VOTES + 72 SEED.'
  );
  v_updated := replace(
    v_updated,
    'v_expected_slot_count := v_active_count * 648;',
    'v_expected_slot_count := v_active_count * 144;'
  );
  v_updated := regexp_replace(
    v_updated,
    $old$
    [[:space:]]+\('SEED'::text, 71::bigint\),
    [[:space:]]+\('YOUTUBE'::text, 167::bigint\),
    [[:space:]]+\('SPOTIFY'::text, 167::bigint\),
    [[:space:]]+\('BOOMPLAY'::text, 167::bigint\)
    $old$,
    $new$
      ('SEED'::text, 71::bigint)
    $new$,
    'g'
  );

  if v_updated = v_definition
    or position('v_active_count * 648' in v_updated) > 0
    or position('167::bigint' in v_updated) > 0 then
    raise exception
      'BORA_ENGINE_BOOTSTRAP_72_HOUR_REWRITE_FAILED: unchanged=%, old_count=%, old_platform=%',
      v_updated = v_definition,
      position('v_active_count * 648' in v_updated),
      position('167::bigint' in v_updated);
  end if;

  execute v_updated;

  select pg_get_functiondef(
    'public.bora_engine_publish_eligibility(bigint)'::regprocedure
  )
    into v_definition;

  v_updated := replace(
    v_definition,
    '    where e.hour_index between p_closed_hour - 71 and p_closed_hour',
    $new$
    where e.hour_index between p_closed_hour - 71 and p_closed_hour
      and not exists (
        select 1
        from public.bora_engine_hourly_input_coverage c
        where c.song_id = inv.song_id
          and c.input_type = 'VOTES'
          and c.hour_index = inv.hour_index
          and c.status = 'COMPLETE'
          and c.currentness = 'current'
          and c.source_identity = 'secure_vote_events'
          and c.expected_source_identity = 'secure_vote_events'
          and c.revision > inv.invalidates_revision
          and c.evidence_id is not null
          and c.assessed_at is not null
      )
    $new$
  );

  if v_updated = v_definition
    or position('c.revision > inv.invalidates_revision' in v_updated) = 0 then
    raise exception 'BORA_ENGINE_VOTE_COVERAGE_RECONCILIATION_REWRITE_FAILED';
  end if;

  execute v_updated;

  select pg_get_functiondef(
    'public.bora_engine_publication_input_snapshot()'::regprocedure
  )
    into v_definition;

  v_updated := replace(
    v_definition,
    '  v_rank_snapshots jsonb;',
    '  v_rank_snapshots jsonb;
  v_is_synthetic_demo boolean;'
  );
  v_updated := replace(
    v_updated,
    '  v_rank_snapshots := jsonb_build_object(',
    $new$
  with latest_revisions as (
    select distinct on (effective_date)
      effective_date, revision, is_synthetic
    from public.bora_engine_daily_platform_rank_snapshots
    where effective_date <= v_snapshot_date
    order by effective_date desc, revision desc
  ),
  selected_demo_sources as (
    select is_synthetic
    from latest_revisions
    order by effective_date desc
    limit 7
  )
  select coalesce(bool_or(is_synthetic), false)
    into v_is_synthetic_demo
  from selected_demo_sources;

  v_rank_snapshots := jsonb_build_object(
    $new$
  );
  v_updated := replace(
    v_updated,
    $old$
    'dailyPlatformRankSnapshots', v_rank_snapshots
    $old$,
    $new$
    'dailyPlatformRankSnapshots', v_rank_snapshots,
    'isSyntheticDemo', coalesce(v_is_synthetic_demo, false)
    $new$
  );

  if v_updated = v_definition
    or position('isSyntheticDemo' in v_updated) = 0
    or position('selected_demo_sources' in v_updated) = 0 then
    raise exception 'BORA_ENGINE_DEMO_SOURCE_IDENTITY_REWRITE_FAILED';
  end if;

  execute v_updated;
end;
$$;

create function public.bora_engine_initialize_synthetic_demo()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reference_hour bigint :=
    floor(extract(epoch from clock_timestamp()) / 3600)::bigint;
  v_reference_date date;
  v_song_count bigint;
  v_real_vote_event_count bigint;
  v_bucket_mismatch_count bigint;
  v_synthetic_seed_hour_count bigint;
  v_synthetic_zero_vote_hour_count bigint;
  v_previous_coverage jsonb;
  v_snapshot jsonb;
  v_bootstrap_result jsonb;
  v_effective_date date;
  v_day_offset integer;
  v_snapshot_id uuid;
  v_request_id uuid;
  v_fixture_id uuid := gen_random_uuid();
  v_source_revision bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtext('bora-engine-synthetic-demo-bootstrap'));

  lock table public.songs in share mode;
  lock table public.bora_engine_song_state in share row exclusive mode;
  lock table public.bora_engine_vote_buckets in share row exclusive mode;
  lock table public.bora_engine_seed_hours in share row exclusive mode;
  lock table public.bora_engine_hourly_input_coverage in share row exclusive mode;
  lock table public.bora_engine_hourly_state_head in share row exclusive mode;
  lock table public.bora_engine_hourly_closures in share mode;
  lock table public.bora_engine_hourly_runs in share mode;
  lock table public.bora_engine_daily_platform_rank_snapshots in share row exclusive mode;
  lock table public.bora_engine_daily_platform_rank_entries in share row exclusive mode;
  lock table public.bora_engine_publication_source_head in share row exclusive mode;

  if exists (
    select 1 from public.bora_engine_hourly_state_head where singleton = true
  ) then
    return jsonb_build_object('status', 'already-initialized');
  end if;
  if exists (select 1 from public.bora_engine_song_state)
    or exists (select 1 from public.bora_engine_bootstrap_approvals)
    or exists (select 1 from public.bora_engine_hourly_closures)
    or exists (
      select 1 from public.bora_engine_hourly_runs where status = 'completed'
    )
    or exists (select 1 from public.bora_engine_daily_platform_rank_snapshots)
    or exists (
      select 1
      from public.bora_engine_publication_head
      where publication_id is not null
    )
    or exists (select 1 from public.bora_engine_publications)
    or exists (
      select 1 from public.bora_engine_seed_hours
      where hour_index between v_reference_hour - 71 and v_reference_hour
    ) then
    raise exception 'BORA_ENGINE_SYNTHETIC_DEMO_PRECONDITION_FAILED';
  end if;

  select count(*) into v_song_count from public.songs;
  if v_song_count = 0 then
    raise exception 'BORA_ENGINE_SYNTHETIC_DEMO_NO_SONGS';
  end if;

  v_reference_date :=
    (to_timestamp(v_reference_hour * 3600) at time zone 'Africa/Nairobi')::date;

  if exists (
    select 1
    from public.vote_events source
    where source.created_at >= to_timestamp((v_reference_hour - 71) * 3600)
      and source.created_at < to_timestamp((v_reference_hour + 1) * 3600)
      and not exists (
        select 1
        from public.bora_engine_vote_events ledger
        where ledger.source_system = 'secure_vote_events'
          and ledger.source_event_id = source.id::text
      )
  ) then
    raise exception 'BORA_ENGINE_SYNTHETIC_DEMO_PENDING_REAL_VOTE_EVENTS';
  end if;

  with expected as (
    select
      song_id,
      floor(extract(epoch from created_at) / 3600)::bigint as hour_index,
      count(*) filter (where vote_type = 'up')::numeric as upvotes,
      count(*) filter (where vote_type = 'down')::numeric as downvotes
    from public.vote_events
    where created_at >= to_timestamp((v_reference_hour - 71) * 3600)
      and created_at < to_timestamp((v_reference_hour + 1) * 3600)
    group by song_id, floor(extract(epoch from created_at) / 3600)::bigint
  ),
  actual as (
    select song_id, hour_index, upvotes, downvotes
    from public.bora_engine_vote_buckets
    where hour_index between v_reference_hour - 71 and v_reference_hour
  ),
  mismatches as (
    select expected.song_id
    from expected
    full join actual using (song_id, hour_index)
    where coalesce(expected.upvotes, 0) <> coalesce(actual.upvotes, 0)
       or coalesce(expected.downvotes, 0) <> coalesce(actual.downvotes, 0)
  )
  select count(*) into v_bucket_mismatch_count from mismatches;

  if v_bucket_mismatch_count > 0 then
    raise exception 'BORA_ENGINE_SYNTHETIC_DEMO_VOTE_BUCKET_MISMATCH';
  end if;

  select count(*) into v_real_vote_event_count
  from public.bora_engine_vote_events
  where source_system = 'secure_vote_events'
    and hour_index between v_reference_hour - 71 and v_reference_hour;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'songId', c.song_id,
        'inputType', c.input_type,
        'hourIndex', c.hour_index,
        'status', c.status,
        'currentness', c.currentness,
        'sourceIdentity', c.source_identity,
        'expectedSourceIdentity', c.expected_source_identity,
        'revision', c.revision,
        'evidenceId', c.evidence_id,
        'detail', c.detail
      )
      order by c.song_id, c.input_type, c.hour_index
    ),
    '[]'::jsonb
  )
    into v_previous_coverage
  from public.bora_engine_hourly_input_coverage c
  join public.songs s on s.id = c.song_id
  where c.input_type in ('VOTES', 'SEED')
    and c.hour_index between v_reference_hour - 71 and v_reference_hour;

  insert into public.bora_engine_song_state (
    song_id, lifecycle, k, persistent_kura, last_decay_hour
  )
  select id, 'ACTIVE', 0, 0, null
  from public.songs;

  insert into public.bora_engine_seed_hours (
    song_id, hour_index, c, source, lifecycle, version, origin_event_id
  )
  select
    ordered.id,
    hours.hour_index,
    (0.10 + ((v_song_count - ordered.position + 1) * 0.03))::numeric,
    'SEED',
    'ACTIVE',
    1,
    'synthetic-demo-v1:' || ordered.id::text || ':' || hours.hour_index::text
  from (
    select id, row_number() over (order by slot_number, id)::bigint as position
    from public.songs
  ) ordered
  cross join generate_series(
    v_reference_hour - 71,
    v_reference_hour
  ) as hours(hour_index);

  insert into public.bora_engine_vote_buckets (
    song_id, hour_index, upvotes, downvotes, phase, version
  )
  select
    ordered.id,
    hours.hour_index,
    0,
    0,
    case when hours.hour_index = v_reference_hour then 'OPEN' else 'CLOSED' end,
    1
  from (
    select id from public.songs
  ) ordered
  cross join generate_series(
    v_reference_hour - 71,
    v_reference_hour
  ) as hours(hour_index)
  on conflict (song_id, hour_index) do nothing;

  with event_hours as (
    select
      song_id,
      floor(extract(epoch from created_at) / 3600)::bigint as hour_index,
      count(*)::bigint as event_count,
      count(*) filter (where vote_type = 'up')::bigint as upvotes,
      count(*) filter (where vote_type = 'down')::bigint as downvotes,
      md5(string_agg(id::text, ',' order by id::text)) as evidence_hash
    from public.vote_events
    where created_at >= to_timestamp((v_reference_hour - 71) * 3600)
      and created_at < to_timestamp((v_reference_hour + 1) * 3600)
    group by song_id, floor(extract(epoch from created_at) / 3600)::bigint
  ),
  slots as (
    select
      s.id as song_id,
      input_types.input_type,
      hours.hour_index,
      event_hours.event_count,
      event_hours.evidence_hash
    from public.songs s
    cross join generate_series(
      v_reference_hour - 71,
      v_reference_hour
    ) as hours(hour_index)
    cross join (values ('VOTES'::text), ('SEED'::text)) as input_types(input_type)
    left join event_hours
      on event_hours.song_id = s.id
      and event_hours.hour_index = hours.hour_index
  )
  insert into public.bora_engine_hourly_input_coverage as existing (
    song_id, input_type, hour_index, status, detail, checked_at, updated_at,
    revision, currentness, source_identity, evidence_id, assessed_at,
    invalidated_reason, derived_delta, raw_value, source, source_system,
    expected_source_identity, evidence_reason
  )
  select
    slots.song_id,
    slots.input_type,
    slots.hour_index,
    'COMPLETE',
    case
      when slots.input_type = 'VOTES' and slots.event_count is not null
        then 'Reconciled against canonical vote_events and the Engine ledger.'
      else 'Synthetic demo starting input; not a measured source record.'
    end,
    now(),
    now(),
    1,
    'current',
    case
      when slots.input_type = 'VOTES' and slots.event_count is not null
        then 'secure_vote_events'
      else 'synthetic-demo-v1'
    end,
    case
      when slots.input_type = 'VOTES' and slots.event_count is not null
        then 'secure-vote-ledger:' || slots.evidence_hash
      else 'synthetic-demo-v1:' || slots.song_id::text || ':' ||
        slots.input_type || ':' || slots.hour_index::text
    end,
    now(),
    null,
    case
      when slots.input_type = 'VOTES' and slots.event_count is not null
        then slots.event_count
      else 0
    end,
    case
      when slots.input_type = 'VOTES' and slots.event_count is not null
        then slots.event_count
      else 0
    end,
    case
      when slots.input_type = 'VOTES' and slots.event_count is not null
        then 'secure_vote_events'
      else 'synthetic-demo-v1'
    end,
    case
      when slots.input_type = 'VOTES' and slots.event_count is not null
        then 'secure_vote_events'
      else 'synthetic-demo-v1'
    end,
    case
      when slots.input_type = 'VOTES' and slots.event_count is not null
        then 'secure_vote_events'
      else 'synthetic-demo-v1'
    end,
    null
  from slots
  on conflict (song_id, input_type, hour_index) do update
    set status = excluded.status,
        detail = excluded.detail,
        checked_at = excluded.checked_at,
        updated_at = excluded.updated_at,
        revision = existing.revision + 1,
        currentness = excluded.currentness,
        source_identity = excluded.source_identity,
        evidence_id = excluded.evidence_id,
        assessed_at = excluded.assessed_at,
        invalidated_reason = null,
        derived_delta = excluded.derived_delta,
        raw_value = excluded.raw_value,
        source = excluded.source,
        source_system = excluded.source_system,
        expected_source_identity = excluded.expected_source_identity,
        evidence_reason = excluded.evidence_reason;

  select count(*) into v_synthetic_seed_hour_count
  from public.bora_engine_seed_hours
  where hour_index between v_reference_hour - 71 and v_reference_hour;

  select count(*) into v_synthetic_zero_vote_hour_count
  from public.bora_engine_hourly_input_coverage c
  where c.input_type = 'VOTES'
    and c.source_identity = 'synthetic-demo-v1'
    and c.hour_index between v_reference_hour - 71 and v_reference_hour;

  for v_day_offset in 0..6 loop
    v_effective_date := v_reference_date - (6 - v_day_offset);
    v_request_id := gen_random_uuid();

    insert into public.bora_engine_daily_platform_rank_snapshots (
      request_id, effective_date, revision, submitted_by,
      evidence_references, supersedes_snapshot_id, request_payload,
      is_synthetic
    )
    values (
      v_request_id,
      v_effective_date,
      1,
      null,
      jsonb_build_object(
        'source', 'synthetic-demo-v1',
        'synthetic', true,
        'description', 'Generated starting ranks; not external chart measurements.'
      ),
      null,
      jsonb_build_object(
        'requestId', v_request_id,
        'effectiveDate', v_effective_date,
        'source', 'synthetic-demo-v1',
        'synthetic', true,
        'rankRotation', v_day_offset
      ),
      true
    )
    returning id into v_snapshot_id;

    insert into public.bora_engine_daily_platform_rank_entries (
      snapshot_id, song_id, platform, rank
    )
    select
      v_snapshot_id,
      ordered.id,
      platforms.platform,
      (
        mod(
          ordered.position - 1
            + v_day_offset * 3
            + platforms.rank_offset,
          v_song_count
        ) + 1
      )::integer
    from (
      select id, row_number() over (order by slot_number, id)::bigint as position
      from public.songs
    ) ordered
    cross join (
      values
        ('youtube'::text, 0::bigint),
        ('spotify'::text, 7::bigint),
        ('boomplay'::text, 15::bigint)
    ) as platforms(platform, rank_offset);
  end loop;

  update public.bora_engine_publication_source_head
    set revision = revision + 1,
        updated_at = now()
  where singleton = true
  returning revision into v_source_revision;
  if not found then
    raise exception 'BORA_ENGINE_PUBLICATION_SOURCE_HEAD_MISSING';
  end if;

  insert into public.bora_engine_hourly_state_head (
    singleton, reference_hour, revision
  )
  values (true, v_reference_hour, 0);

  v_snapshot := public.bora_engine_hourly_snapshot(v_reference_hour);
  if v_snapshot ->> 'status' is distinct from 'ready' then
    raise exception 'BORA_ENGINE_SYNTHETIC_DEMO_SNAPSHOT_NOT_READY: %',
      v_snapshot ->> 'reason';
  end if;

  delete from public.bora_engine_hourly_state_head
  where singleton = true;

  v_bootstrap_result := public.bora_engine_bootstrap_state(
    v_fixture_id,
    'synthetic-demo-initializer',
    'Synthetic starting inputs; canonical recent votes retained and reconciled.',
    v_reference_hour,
    v_snapshot -> 'state',
    v_snapshot -> 'coverage'
  );
  if v_bootstrap_result ->> 'status' is distinct from 'initialized' then
    raise exception 'BORA_ENGINE_SYNTHETIC_DEMO_BOOTSTRAP_FAILED: %',
      v_bootstrap_result ->> 'status';
  end if;

  insert into public.bora_engine_synthetic_demo_audit (
    fixture_id, reference_hour, effective_date, song_count,
    real_vote_event_count, synthetic_seed_hour_count,
    synthetic_zero_vote_hour_count, synthetic_rank_snapshot_count,
    superseded_coverage
  )
  values (
    v_fixture_id,
    v_reference_hour,
    v_reference_date,
    v_song_count,
    v_real_vote_event_count,
    v_synthetic_seed_hour_count,
    v_synthetic_zero_vote_hour_count,
    7,
    v_previous_coverage
  );

  return jsonb_build_object(
    'status', 'initialized',
    'fixtureId', v_fixture_id,
    'referenceHour', v_reference_hour,
    'effectiveDate', v_reference_date,
    'songCount', v_song_count,
    'realVoteEventsRetained', v_real_vote_event_count,
    'syntheticSeedHours', v_synthetic_seed_hour_count,
    'syntheticZeroVoteHours', v_synthetic_zero_vote_hour_count,
    'syntheticRankSnapshots', 7,
    'sourceRevision', v_source_revision,
    'bootstrap', v_bootstrap_result
  );
end;
$$;

revoke all on function public.bora_engine_initialize_synthetic_demo()
  from public, anon, authenticated;
grant execute on function public.bora_engine_initialize_synthetic_demo()
  to service_role;
