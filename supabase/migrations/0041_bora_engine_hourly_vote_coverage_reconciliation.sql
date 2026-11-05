create function public.bora_engine_reconcile_hour_coverage(
  p_closed_hour bigint,
  p_cutover_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_head public.bora_engine_hourly_state_head%rowtype;
  v_active_count bigint;
  v_mismatch_count bigint;
  v_vote_event_count bigint;
  v_now timestamptz := clock_timestamp();
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;
  if p_closed_hour is null
    or p_closed_hour < 0
    or p_cutover_at is null
    or p_cutover_at > v_now
    or p_closed_hour >= floor(extract(epoch from v_now) / 3600)::bigint then
    raise exception 'BORA_ENGINE_INVALID_COVERAGE_RECONCILIATION_REQUEST';
  end if;

  select *
    into v_head
  from public.bora_engine_hourly_state_head
  where singleton = true
  for update;
  if not found then
    return jsonb_build_object('status', 'not-ready', 'reason', 'no-active-songs');
  end if;
  if v_head.reference_hour <> p_closed_hour then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'reference-hour-mismatch',
      'referenceHour', v_head.reference_hour
    );
  end if;

  lock table public.vote_events in share mode;
  lock table public.bora_engine_vote_events in share mode;
  lock table public.bora_engine_song_state in share mode;
  lock table public.bora_engine_vote_buckets in share mode;
  lock table public.bora_engine_seed_hours in share mode;
  lock table public.bora_engine_hourly_input_coverage in share mode;

  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';
  if v_active_count = 0 then
    return jsonb_build_object('status', 'not-ready', 'reason', 'no-active-songs');
  end if;

  select count(*)
    into v_mismatch_count
  from public.vote_events s
  left join public.bora_engine_vote_events e
    on e.source_system = 'secure_vote_events'
    and e.source_event_id = s.id::text
  where s.created_at >= p_cutover_at
    and floor(extract(epoch from s.created_at) / 3600)::bigint = p_closed_hour
    and (
      e.id is null
      or e.song_id is distinct from s.song_id
      or e.vote_type is distinct from s.vote_type
      or e.occurred_at is distinct from s.created_at
      or e.voter_ref is distinct from s.voter_ref
      or e.identity_method is distinct from s.identity_method
      or e.identity_version is distinct from s.identity_version
      or e.idempotency_key is distinct from s.idempotency_key
      or e.hour_index is distinct from p_closed_hour
    );

  select v_mismatch_count + count(*)
    into v_mismatch_count
  from public.bora_engine_vote_events e
  where e.source_system = 'secure_vote_events'
    and e.occurred_at >= p_cutover_at
    and e.hour_index = p_closed_hour
    and not exists (
      select 1
      from public.vote_events s
      where s.id::text = e.source_event_id
        and s.song_id = e.song_id
        and s.vote_type = e.vote_type
        and s.created_at = e.occurred_at
        and s.voter_ref = e.voter_ref
        and s.identity_method = e.identity_method
        and s.identity_version = e.identity_version
        and s.idempotency_key = e.idempotency_key
    );

  if v_mismatch_count > 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'unreconciled-votes',
      'mismatchCount', v_mismatch_count
    );
  end if;

  with ledger_counts as (
    select
      song_id,
      count(*) filter (where vote_type = 'up') as upvotes,
      count(*) filter (where vote_type = 'down') as downvotes
    from public.bora_engine_vote_events
    where source_system = 'secure_vote_events'
      and hour_index = p_closed_hour
    group by song_id
  )
  select count(*)
    into v_mismatch_count
  from public.bora_engine_song_state s
  left join ledger_counts e on e.song_id = s.song_id
  left join public.bora_engine_vote_buckets b
    on b.song_id = s.song_id
    and b.hour_index = p_closed_hour
  where s.lifecycle = 'ACTIVE'
    and (
      coalesce(e.upvotes, 0) <> coalesce(b.upvotes, 0)
      or coalesce(e.downvotes, 0) <> coalesce(b.downvotes, 0)
    );
  if v_mismatch_count > 0 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'vote-bucket-mismatch',
      'mismatchCount', v_mismatch_count
    );
  end if;

  select count(*)
    into v_vote_event_count
  from public.vote_events
  where created_at >= p_cutover_at
    and floor(extract(epoch from created_at) / 3600)::bigint = p_closed_hour;

  insert into public.bora_engine_hourly_input_coverage as existing (
    song_id, input_type, hour_index, status, detail, checked_at, updated_at,
    revision, currentness, source_identity, evidence_id, assessed_at,
    invalidated_reason, derived_delta, raw_value, source, source_system,
    expected_source_identity, evidence_reason
  )
  select
    s.song_id,
    'VOTES',
    p_closed_hour,
    'COMPLETE',
    case when counts.event_count = 0
      then 'Verified no accepted votes in the canonical source for this UTC hour.'
      else 'Verified canonical accepted votes match the immutable Engine ledger.'
    end,
    v_now,
    v_now,
    greatest(
      coalesce(prior.revision, 0),
      coalesce(invalidations.last_invalidated_revision, -1)
    ) + 1,
    'current',
    'secure_vote_events',
    'secure-vote-ledger:' || counts.evidence_hash,
    v_now,
    null,
    counts.event_count,
    counts.event_count,
    'secure_vote_events',
    'secure_vote_events',
    'secure_vote_events',
    null
  from public.bora_engine_song_state s
  left join public.bora_engine_hourly_input_coverage prior
    on prior.song_id = s.song_id
    and prior.input_type = 'VOTES'
    and prior.hour_index = p_closed_hour
  left join lateral (
    select
      count(*)::bigint as event_count,
      md5(coalesce(
        string_agg(
          concat_ws(
            ':',
            e.id::text,
            e.song_id::text,
            e.vote_type,
            e.created_at::text,
            e.voter_ref::text,
            e.identity_method,
            e.identity_version::text,
            e.idempotency_key
          ),
          '|' order by e.id::text
        ),
        ''
      )) as evidence_hash
    from public.vote_events e
    where e.song_id = s.song_id
      and e.created_at >= p_cutover_at
      and floor(extract(epoch from e.created_at) / 3600)::bigint = p_closed_hour
  ) counts on true
  left join lateral (
    select max(i.invalidates_revision) as last_invalidated_revision
    from public.bora_engine_vote_coverage_invalidation i
    where i.song_id = s.song_id
      and i.hour_index = p_closed_hour
  ) invalidations on true
  where s.lifecycle = 'ACTIVE'
  on conflict (song_id, input_type, hour_index) do update
    set status = excluded.status,
        detail = excluded.detail,
        checked_at = excluded.checked_at,
        updated_at = excluded.updated_at,
        revision = excluded.revision,
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
        evidence_reason = null;

  insert into public.bora_engine_hourly_input_coverage as existing (
    song_id, input_type, hour_index, status, detail, checked_at, updated_at,
    revision, currentness, source_identity, evidence_id, assessed_at,
    invalidated_reason, derived_delta, raw_value, source, source_system,
    expected_source_identity, evidence_reason
  )
  select
    s.song_id,
    'SEED',
    p_closed_hour,
    'COMPLETE',
    case
      when sh.song_id is null
        then 'Verified no seed record in the Engine seed-hour source.'
      when sh.origin_event_id like 'synthetic-demo%'
        then 'Verified synthetic seed record; retained as explicitly synthetic input.'
      else 'Verified seed record in the Engine seed-hour source.'
    end,
    v_now,
    v_now,
    coalesce(prior.revision, 0) + 1,
    'current',
    case
      when sh.origin_event_id like 'synthetic-demo%' then 'synthetic-demo-v1'
      else 'bora_engine_seed_hours'
    end,
    'engine-seed-hour:' || md5(concat_ws(
      ':',
      s.song_id::text,
      p_closed_hour::text,
      coalesce(sh.c::text, 'empty'),
      coalesce(sh.lifecycle, 'empty'),
      coalesce(sh.version::text, 'empty'),
      coalesce(sh.origin_event_id, 'empty')
    )),
    v_now,
    null,
    0,
    0,
    case
      when sh.origin_event_id like 'synthetic-demo%' then 'synthetic-demo-v1'
      else 'bora_engine_seed_hours'
    end,
    case
      when sh.origin_event_id like 'synthetic-demo%' then 'synthetic-demo-v1'
      else 'bora_engine_seed_hours'
    end,
    case
      when sh.origin_event_id like 'synthetic-demo%' then 'synthetic-demo-v1'
      else 'bora_engine_seed_hours'
    end,
    null
  from public.bora_engine_song_state s
  left join public.bora_engine_hourly_input_coverage prior
    on prior.song_id = s.song_id
    and prior.input_type = 'SEED'
    and prior.hour_index = p_closed_hour
  left join public.bora_engine_seed_hours sh
    on sh.song_id = s.song_id
    and sh.hour_index = p_closed_hour
  where s.lifecycle = 'ACTIVE'
  on conflict (song_id, input_type, hour_index) do update
    set status = excluded.status,
        detail = excluded.detail,
        checked_at = excluded.checked_at,
        updated_at = excluded.updated_at,
        revision = excluded.revision,
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
        evidence_reason = null;

  update public.bora_engine_hourly_state_head
  set revision = revision + 1,
      updated_at = v_now
  where singleton = true
    and reference_hour = p_closed_hour;

  return jsonb_build_object(
    'status', 'ready',
    'closedHour', p_closed_hour,
    'processedActiveSongCount', v_active_count,
    'reconciledVoteEventCount', v_vote_event_count
  );
end;
$$;

revoke all on function public.bora_engine_reconcile_hour_coverage(bigint, timestamptz)
  from public, anon, authenticated;

grant execute on function public.bora_engine_reconcile_hour_coverage(bigint, timestamptz)
  to service_role;
