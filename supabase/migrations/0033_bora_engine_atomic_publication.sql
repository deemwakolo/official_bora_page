-- Atomic Engine publication. Requires the BORA Engine data, readiness,
-- invalidation, and rollover migrations through 0032.

create or replace function public.bora_engine_check_hour(
  p_closed_hour bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reference_hour bigint;
  v_run_status text;
  v_readiness jsonb;
  v_active_count bigint;
  v_evidence_count bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;
  if p_closed_hour is null or p_closed_hour < 0 then
    raise exception 'BORA_ENGINE_INVALID_HOUR';
  end if;

  select reference_hour
    into v_reference_hour
  from public.bora_engine_hourly_state_head
  where singleton = true;
  if not found then
    return jsonb_build_object('status', 'bootstrap-required');
  end if;
  if v_reference_hour <> p_closed_hour then
    return jsonb_build_object(
      'status', 'reference-hour-mismatch',
      'referenceHour', v_reference_hour
    );
  end if;

  select status
    into v_run_status
  from public.bora_engine_hourly_runs
  where closed_hour = p_closed_hour
  for share;
  if found and v_run_status = 'completed' then
    return jsonb_build_object('status', 'already-completed');
  end if;
  if found and v_run_status not in ('pending', 'processing', 'failed') then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'ineligible-run-status'
    );
  end if;

  v_readiness := public.bora_engine_readiness(p_closed_hour);
  if v_readiness ->> 'status' is distinct from 'ready' then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'readiness-incomplete',
      'readiness', v_readiness
    );
  end if;

  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  select count(*)
    into v_evidence_count
  from public.bora_engine_hourly_input_coverage c
  join public.bora_engine_song_state s on s.song_id = c.song_id
  where s.lifecycle = 'ACTIVE'
    and c.status = 'COMPLETE'
    and c.currentness = 'current'
    and c.expected_source_identity is not null
    and btrim(c.expected_source_identity) <> ''
    and c.source_identity = c.expected_source_identity
    and (c.revision is not null or c.evidence_id is not null)
    and c.assessed_at is not null
    and (
      (c.input_type in ('VOTES', 'SEED')
        and c.hour_index between p_closed_hour - 71 and p_closed_hour)
      or
      (c.input_type in ('YOUTUBE', 'SPOTIFY', 'BOOMPLAY')
        and c.hour_index between p_closed_hour - 167 and p_closed_hour)
    );

  if v_evidence_count <> v_active_count * 648 then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'coverage-evidence-incomplete',
      'expected', v_active_count * 648,
      'evidenced', v_evidence_count,
      'missing', greatest(v_active_count * 648 - v_evidence_count, 0)
    );
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'closedHour', p_closed_hour,
    'referenceHour', v_reference_hour,
    'readiness', v_readiness
  );
end;
$$;

revoke all on function public.bora_engine_check_hour(bigint)
  from public, anon, authenticated;
grant execute on function public.bora_engine_check_hour(bigint)
  to service_role;

create or replace function public.bora_engine_publish_eligibility(
  p_closed_hour bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_readiness jsonb;
  v_reference_hour bigint;
  v_has_invalidation boolean;
  v_active_count bigint;
  v_evidence_count bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;
  if p_closed_hour is null or p_closed_hour < 0 then
    return jsonb_build_object(
      'status', 'not-eligible',
      'reason', 'no-reference-hour',
      'closedHour', coalesce(p_closed_hour, 0)
    );
  end if;

  v_readiness := public.bora_engine_readiness(p_closed_hour);
  if v_readiness -> 'checks' -> 'initialState' ->> 'status' = 'missing' then
    return jsonb_build_object(
      'status', 'not-eligible',
      'reason', 'no-reference-hour',
      'closedHour', p_closed_hour
    );
  end if;

  select reference_hour
    into v_reference_hour
  from public.bora_engine_hourly_state_head
  where singleton = true;
  if not found or v_reference_hour <> p_closed_hour then
    return jsonb_build_object(
      'status', 'not-eligible',
      'reason', 'reference-hour-mismatch',
      'closedHour', p_closed_hour,
      'referenceHour', v_reference_hour
    );
  end if;

  select exists (
    select 1
    from public.bora_engine_vote_event_invalidations inv
    join public.bora_engine_vote_events e
      on e.source_system = inv.source_system
      and e.source_event_id = inv.source_event_id
    where e.hour_index between p_closed_hour - 71 and p_closed_hour
  )
    into v_has_invalidation;
  if v_has_invalidation then
    return jsonb_build_object(
      'status', 'not-eligible',
      'reason', 'vote-events-invalidated-in-window',
      'closedHour', p_closed_hour
    );
  end if;

  if v_readiness ->> 'status' is distinct from 'ready' then
    return jsonb_build_object(
      'status', 'not-eligible',
      'reason', 'readiness-incomplete',
      'closedHour', p_closed_hour,
      'readiness', v_readiness
    );
  end if;

  select count(*)
    into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';

  select count(*)
    into v_evidence_count
  from public.bora_engine_hourly_input_coverage c
  join public.bora_engine_song_state s on s.song_id = c.song_id
  where s.lifecycle = 'ACTIVE'
    and c.status = 'COMPLETE'
    and c.currentness = 'current'
    and c.expected_source_identity is not null
    and btrim(c.expected_source_identity) <> ''
    and c.source_identity = c.expected_source_identity
    and (c.revision is not null or c.evidence_id is not null)
    and c.assessed_at is not null
    and (
      (c.input_type in ('VOTES', 'SEED')
        and c.hour_index between p_closed_hour - 71 and p_closed_hour)
      or
      (c.input_type in ('YOUTUBE', 'SPOTIFY', 'BOOMPLAY')
        and c.hour_index between p_closed_hour - 167 and p_closed_hour)
    );

  if v_active_count = 0 or v_evidence_count <> v_active_count * 648 then
    return jsonb_build_object(
      'status', 'not-eligible',
      'reason', 'coverage-evidence-incomplete',
      'closedHour', p_closed_hour,
      'expected', v_active_count * 648,
      'evidenced', v_evidence_count,
      'missing', greatest(v_active_count * 648 - v_evidence_count, 0)
    );
  end if;

  return jsonb_build_object(
    'status', 'eligible',
    'closedHour', p_closed_hour,
    'readiness', v_readiness
  );
end;
$$;

revoke all on function public.bora_engine_publish_eligibility(bigint)
  from public, anon, authenticated;
grant execute on function public.bora_engine_publish_eligibility(bigint)
  to service_role;

alter table public.bora_engine_hourly_input_coverage
  add column if not exists expected_source_identity text,
  add column if not exists source_identity text,
  add column if not exists evidence_reason text
    check (
      evidence_reason is null
      or evidence_reason in (
        'source-unavailable',
        'check-failed',
        'data-invalid',
        'partial-interval',
        'history-changed',
        'source-identity-missing',
        'source-mismatch',
        'revision-mismatch',
        'evidence-identity-missing',
        'assessment-time-invalid',
        'freshness-unverified',
        'coverage-unattributable',
        'other'
      )
    );

alter function public.bora_engine_hourly_snapshot(bigint)
  rename to bora_engine_hourly_snapshot_base;

create function public.bora_engine_hourly_snapshot(
  p_closed_hour bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_snapshot jsonb;
  v_coverage jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  v_snapshot := public.bora_engine_hourly_snapshot_base(p_closed_hour);
  if v_snapshot ->> 'status' is distinct from 'ready' then
    return v_snapshot;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'songId', c.song_id::text,
        'inputType', c.input_type,
        'hourIndex', c.hour_index,
        'status', c.status,
        'evidence', jsonb_build_object(
          'kind', case c.input_type
            when 'VOTES' then 'vote-history'
            when 'SEED' then 'seed-history'
            else 'platform-observation-history'
          end,
          'songId', c.song_id::text,
          'period', jsonb_build_object(
            'kind', 'hour',
            'hourIndex', c.hour_index
          ),
          'expectedSourceIdentity', c.expected_source_identity,
          'sourceIdentity', c.source_identity,
          'evidenceId', c.evidence_id,
          'revision', c.revision,
          'assessedAt', case
            when c.assessed_at is null then null
            else to_char(
              c.assessed_at at time zone 'UTC',
              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            )
          end,
          'outcome', case c.status
            when 'COMPLETE' then 'complete'
            when 'UNAVAILABLE' then 'unavailable'
            else 'failed'
          end,
          'currentness', c.currentness,
          'reason', case
            when c.status = 'COMPLETE' and c.currentness = 'current'
              then null
            when c.evidence_reason is not null then c.evidence_reason
            when c.status = 'UNAVAILABLE' then 'source-unavailable'
            when c.status = 'FAILED' then 'check-failed'
            when c.currentness in ('invalidated', 'stale') then 'history-changed'
            when c.currentness = 'unresolved' then 'freshness-unverified'
            else 'other'
          end
        ),
        'authority', jsonb_build_object(
          'sourceIdentity', c.expected_source_identity,
          'revision', c.revision,
          'evidenceId', c.evidence_id
        )
      )
      order by c.song_id, c.input_type, c.hour_index
    ),
    '[]'::jsonb
  )
    into v_coverage
  from public.bora_engine_hourly_input_coverage c
  join public.bora_engine_song_state s on s.song_id = c.song_id
  where
    (c.input_type in ('VOTES', 'SEED')
      and c.hour_index = p_closed_hour)
    or
    (c.input_type in ('YOUTUBE', 'SPOTIFY', 'BOOMPLAY')
      and c.hour_index between p_closed_hour - 167 and p_closed_hour);

  return jsonb_set(v_snapshot, '{coverage}', v_coverage, true);
end;
$$;

revoke all on function public.bora_engine_hourly_snapshot_base(bigint)
  from public, anon, authenticated, service_role;
revoke all on function public.bora_engine_hourly_snapshot(bigint)
  from public, anon, authenticated;
grant execute on function public.bora_engine_hourly_snapshot(bigint)
  to service_role;

alter table public.bora_engine_evaluation_runs
  add column publication_request jsonb,
  add column source_revision bigint;

create table public.bora_engine_publication_source_head (
  singleton boolean primary key default true check (singleton),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

insert into public.bora_engine_publication_source_head (singleton, revision)
values (true, 0)
on conflict (singleton) do nothing;

alter table public.bora_engine_publication_source_head enable row level security;
revoke all on table public.bora_engine_publication_source_head
  from public, anon, authenticated;

create function public.bora_engine_bump_publication_source_revision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.bora_engine_publication_source_head
  set revision = revision + 1,
      updated_at = clock_timestamp()
  where singleton = true;
  return null;
end;
$$;

revoke all on function public.bora_engine_bump_publication_source_revision()
  from public, anon, authenticated;

create trigger bora_engine_publish_revision_song_state
  after insert or update or delete on public.bora_engine_song_state
  for each statement execute function public.bora_engine_bump_publication_source_revision();
create trigger bora_engine_publish_revision_vote_events
  after insert or update or delete on public.bora_engine_vote_events
  for each statement execute function public.bora_engine_bump_publication_source_revision();
create trigger bora_engine_publish_revision_vote_buckets
  after insert or update or delete on public.bora_engine_vote_buckets
  for each statement execute function public.bora_engine_bump_publication_source_revision();
create trigger bora_engine_publish_revision_seed_hours
  after insert or update or delete on public.bora_engine_seed_hours
  for each statement execute function public.bora_engine_bump_publication_source_revision();
create trigger bora_engine_publish_revision_platform_observations
  after insert or update or delete on public.bora_engine_platform_observations
  for each statement execute function public.bora_engine_bump_publication_source_revision();
create trigger bora_engine_publish_revision_platform_history
  after insert or update or delete on public.bora_engine_platform_observation_history
  for each statement execute function public.bora_engine_bump_publication_source_revision();
create trigger bora_engine_publish_revision_youtube_snapshots
  after insert or update or delete on public.bora_engine_youtube_snapshot_history
  for each statement execute function public.bora_engine_bump_publication_source_revision();
create trigger bora_engine_publish_revision_input_coverage
  after insert or update or delete on public.bora_engine_hourly_input_coverage
  for each statement execute function public.bora_engine_bump_publication_source_revision();
create trigger bora_engine_publish_revision_invalidations
  after insert or update or delete on public.bora_engine_vote_event_invalidations
  for each statement execute function public.bora_engine_bump_publication_source_revision();

create function public.bora_engine_publish_chart(p_request jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id uuid;
  v_hour bigint;
  v_expected_revision bigint;
  v_source_revision bigint;
  v_current_publication_id uuid;
  v_current_publication_hour bigint;
  v_state_reference_hour bigint;
  v_state_revision bigint;
  v_run public.bora_engine_evaluation_runs%rowtype;
  v_run_id uuid;
  v_publication_id uuid;
  v_eligibility jsonb;
  v_active_count bigint;
  v_vault_count bigint;
  v_entry_count bigint;
  v_state_song_count bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;

  if jsonb_typeof(p_request) is distinct from 'object'
    or jsonb_typeof(p_request -> 'requestId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'evaluationReferenceHour') is distinct from 'number'
    or jsonb_typeof(p_request -> 'expectedState') is distinct from 'object'
    or jsonb_typeof(p_request -> 'expectedState' -> 'revision') is distinct from 'number'
    or jsonb_typeof(p_request -> 'expectedState' -> 'referenceHour') is distinct from 'number'
    or jsonb_typeof(p_request -> 'expectedCurrentPublication') is distinct from 'object'
    or jsonb_typeof(p_request -> 'expectedCurrentPublication' -> 'status') is distinct from 'string'
    or jsonb_typeof(p_request -> 'sourceSnapshot') is distinct from 'object'
    or jsonb_typeof(p_request -> 'sourceSnapshot' -> 'kind') is distinct from 'string'
    or jsonb_typeof(p_request -> 'sourceSnapshot' -> 'revision') is distinct from 'number'
    or jsonb_typeof(p_request -> 'evaluation') is distinct from 'object'
    or jsonb_typeof(p_request -> 'evaluation' -> 'resultIdentity') is distinct from 'string'
    or jsonb_typeof(p_request -> 'evaluation' -> 'validationStatus') is distinct from 'string'
    or jsonb_typeof(p_request -> 'evaluation' -> 'referenceHour') is distinct from 'number'
    or jsonb_typeof(p_request -> 'evaluation' -> 'totalActiveC') is distinct from 'number'
    or jsonb_typeof(p_request -> 'evaluation' -> 'platformTotals') is distinct from 'object'
    or jsonb_typeof(p_request -> 'evaluation' -> 'platformTotals' -> 'youtube') is distinct from 'number'
    or jsonb_typeof(p_request -> 'evaluation' -> 'platformTotals' -> 'spotify') is distinct from 'number'
    or jsonb_typeof(p_request -> 'evaluation' -> 'platformTotals' -> 'boomplay') is distinct from 'number'
    or jsonb_typeof(p_request -> 'entries') is distinct from 'array' then
    raise exception 'BORA_ENGINE_INVALID_PUBLICATION';
  end if;

  v_request_id := (p_request ->> 'requestId')::uuid;
  v_hour := (p_request ->> 'evaluationReferenceHour')::bigint;
  v_expected_revision := (p_request -> 'expectedState' ->> 'revision')::bigint;
  v_source_revision := (p_request -> 'sourceSnapshot' ->> 'revision')::bigint;

  if v_hour < 0
    or v_hour > 9007199254740991
    or v_expected_revision < 0
    or v_source_revision < 0
    or v_expected_revision > 9007199254740991
    or v_source_revision > 9007199254740991
    or (p_request -> 'expectedState' ->> 'referenceHour')::bigint <> v_hour
    or p_request -> 'sourceSnapshot' ->> 'kind' <> 'revision'
    or p_request -> 'evaluation' ->> 'validationStatus' <> 'validated'
    or (p_request -> 'evaluation' ->> 'referenceHour')::bigint <> v_hour
    or btrim(p_request -> 'evaluation' ->> 'resultIdentity') = ''
    or p_request -> 'expectedCurrentPublication' ->> 'status'
      not in ('initial', 'published')
    or (
      p_request -> 'expectedCurrentPublication' ->> 'status' = 'initial'
      and p_request -> 'expectedCurrentPublication' ? 'publicationId'
    )
    or (
      p_request -> 'expectedCurrentPublication' ->> 'status' = 'published'
      and jsonb_typeof(
        p_request -> 'expectedCurrentPublication' -> 'publicationId'
      ) is distinct from 'string'
    )
    or jsonb_typeof(p_request -> 'evaluation' -> 'activeSongIds') is distinct from 'array'
    or jsonb_typeof(p_request -> 'evaluation' -> 'excludedVaultedSongIds') is distinct from 'array'
    or jsonb_array_length(p_request -> 'entries') = 0 then
    raise exception 'BORA_ENGINE_INVALID_PUBLICATION';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_request_id::text));

  select *
    into v_run
  from public.bora_engine_evaluation_runs
  where request_key = v_request_id::text
  for update;

  if found then
    if v_run.publication_request is distinct from p_request then
      return jsonb_build_object(
        'status', 'invalid-publication',
        'requestId', v_request_id,
        'reasons', jsonb_build_array('idempotency-key-reused')
      );
    end if;
    if v_run.status = 'published' then
      select id
        into v_publication_id
      from public.bora_engine_publications
      where evaluation_run_id = v_run.id;
      if v_publication_id is null then
        raise exception 'BORA_ENGINE_PUBLICATION_RECORD_MISMATCH';
      end if;
      return jsonb_build_object(
        'status', 'already-published',
        'requestId', v_request_id,
        'publicationId', v_publication_id
      );
    end if;
    if v_run.status = 'running' then
      return jsonb_build_object(
        'status', 'lease-conflict',
        'requestId', v_request_id
      );
    end if;
    return jsonb_build_object(
      'status', 'failed',
      'requestId', v_request_id,
      'errorCode', coalesce(v_run.error_code, 'prior-attempt-failed')
    );
  end if;

  select publication_id
    into v_current_publication_id
  from public.bora_engine_publication_head
  where singleton = true
  for update;
  if not found then
    raise exception 'BORA_ENGINE_PUBLICATION_HEAD_MISSING';
  end if;

  select reference_hour, revision
    into v_state_reference_hour, v_state_revision
  from public.bora_engine_hourly_state_head
  where singleton = true
  for update;
  if not found then
    return jsonb_build_object(
      'status', 'stale-state',
      'requestId', v_request_id,
      'reason', 'reference-hour-changed'
    );
  end if;

  if v_state_revision <> v_expected_revision then
    return jsonb_build_object(
      'status', 'stale-state',
      'requestId', v_request_id,
      'reason', 'state-revision-changed'
    );
  end if;
  if v_state_reference_hour <> v_hour then
    return jsonb_build_object(
      'status', 'stale-state',
      'requestId', v_request_id,
      'reason', 'reference-hour-changed'
    );
  end if;

  if (p_request -> 'expectedCurrentPublication' ->> 'status') = 'initial' then
    if v_current_publication_id is not null then
      return jsonb_build_object(
        'status', 'stale-state',
        'requestId', v_request_id,
        'reason', 'current-publication-changed'
      );
    end if;
  elsif (p_request -> 'expectedCurrentPublication' ->> 'status') = 'published' then
    if v_current_publication_id is null
      or v_current_publication_id <>
        (p_request -> 'expectedCurrentPublication' ->> 'publicationId')::uuid then
      return jsonb_build_object(
        'status', 'stale-state',
        'requestId', v_request_id,
        'reason', 'current-publication-changed'
      );
    end if;
  else
    raise exception 'BORA_ENGINE_INVALID_PUBLICATION';
  end if;

  if v_current_publication_id is not null then
    select reference_hour
      into v_current_publication_hour
    from public.bora_engine_publications
    where id = v_current_publication_id;
    if v_hour <= v_current_publication_hour then
      return jsonb_build_object(
        'status', 'stale-state',
        'requestId', v_request_id,
        'reason', 'current-publication-changed'
      );
    end if;
  end if;

  lock table
    public.bora_engine_song_state,
    public.bora_engine_vote_events,
    public.bora_engine_vote_buckets,
    public.bora_engine_seed_hours,
    public.bora_engine_platform_observations,
    public.bora_engine_platform_observation_history,
    public.bora_engine_youtube_snapshot_history,
    public.bora_engine_hourly_input_coverage,
    public.bora_engine_vote_event_invalidations
  in share mode;

  select revision
    into v_source_revision
  from public.bora_engine_publication_source_head
  where singleton = true
  for share;

  if not found or v_source_revision <>
    (p_request -> 'sourceSnapshot' ->> 'revision')::bigint then
    return jsonb_build_object(
      'status', 'stale-state',
      'requestId', v_request_id,
      'reason', 'source-snapshot-changed'
    );
  end if;

  v_eligibility := public.bora_engine_publish_eligibility(v_hour);
  if v_eligibility ->> 'status' is distinct from 'eligible' then
    return jsonb_build_object(
      'status', 'not-ready',
      'requestId', v_request_id,
      'reasons', jsonb_build_array('evaluation-not-eligible')
    );
  end if;

  select count(*)
    into v_active_count
  from jsonb_array_elements(p_request -> 'entries') as item
  where item ->> 'lifecycle' = 'ACTIVE';

  select count(*)
    into v_vault_count
  from jsonb_array_elements(p_request -> 'entries') as item
  where item ->> 'lifecycle' = 'VAULT';

  v_entry_count := jsonb_array_length(p_request -> 'entries');
  select count(*)
    into v_state_song_count
  from public.bora_engine_song_state;

  if v_active_count = 0
    or v_entry_count <> v_state_song_count
    or v_entry_count <> jsonb_array_length(p_request -> 'evaluation' -> 'activeSongIds')
      + jsonb_array_length(p_request -> 'evaluation' -> 'excludedVaultedSongIds')
    or v_active_count <> jsonb_array_length(p_request -> 'evaluation' -> 'activeSongIds')
    or v_vault_count <> jsonb_array_length(p_request -> 'evaluation' -> 'excludedVaultedSongIds')
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'entries') with ordinality as e(item, position)
      where (e.item ->> 'position')::bigint <> e.position - 1
        or e.item ->> 'lifecycle' not in ('ACTIVE', 'VAULT')
        or e.item ->> 'songId' is null
    )
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'entries') as e(item)
      group by (e.item ->> 'songId')::uuid
      having count(*) <> 1
    )
    or exists (
      select 1
      from public.bora_engine_song_state state
      where not exists (
        select 1
        from jsonb_array_elements(p_request -> 'entries') as e(item)
        where (e.item ->> 'songId')::uuid = state.song_id
          and e.item ->> 'lifecycle' = state.lifecycle
      )
    )
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'entries') as e(item)
      where not exists (
        select 1
        from public.bora_engine_song_state state
        where state.song_id = (e.item ->> 'songId')::uuid
          and state.lifecycle = e.item ->> 'lifecycle'
      )
    )
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'evaluation' -> 'activeSongIds') as id(value)
      where not exists (
        select 1
        from jsonb_array_elements(p_request -> 'entries') as e(item)
        where e.item ->> 'lifecycle' = 'ACTIVE'
          and e.item ->> 'songId' = id.value #>> '{}'
      )
    )
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'entries') as e(item)
      where e.item ->> 'lifecycle' = 'ACTIVE'
        and not exists (
          select 1
          from jsonb_array_elements(p_request -> 'evaluation' -> 'activeSongIds') as id(value)
          where id.value #>> '{}' = e.item ->> 'songId'
        )
    )
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'evaluation' -> 'excludedVaultedSongIds') as id(value)
      where not exists (
        select 1
        from jsonb_array_elements(p_request -> 'entries') as e(item)
        where e.item ->> 'lifecycle' = 'VAULT'
          and e.item ->> 'songId' = id.value #>> '{}'
      )
    )
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'entries') as e(item)
      where e.item ->> 'lifecycle' = 'VAULT'
        and not exists (
          select 1
          from jsonb_array_elements(p_request -> 'evaluation' -> 'excludedVaultedSongIds') as id(value)
          where id.value #>> '{}' = e.item ->> 'songId'
        )
    )
    or exists (
      select 1
      from (
        select
          (item ->> 'rank')::bigint as rank,
          row_number() over (order by (item ->> 'position')::bigint) as expected_rank
        from jsonb_array_elements(p_request -> 'entries') as e(item)
        where item ->> 'lifecycle' = 'ACTIVE'
      ) ranks
      where rank <> expected_rank
    )
    or exists (
      select 1
      from (
        select
          item ->> 'songId' as song_id,
          lag(item ->> 'songId') over (order by (item ->> 'position')::bigint) as previous_song_id
        from jsonb_array_elements(p_request -> 'entries') as e(item)
        where item ->> 'lifecycle' = 'VAULT'
      ) vaults
      where previous_song_id is not null and song_id <= previous_song_id
    ) then
    return jsonb_build_object(
      'status', 'invalid-publication',
      'requestId', v_request_id,
      'reasons', jsonb_build_array('invalid-evaluation-identity')
    );
  end if;

  insert into public.bora_engine_evaluation_runs (
    request_key,
    reference_hour,
    status,
    publication_request,
    source_revision
  )
  values (
    v_request_id::text,
    v_hour,
    'running',
    p_request,
    v_source_revision
  )
  returning id into v_run_id;

  insert into public.bora_engine_publications (
    evaluation_run_id,
    reference_hour,
    total_active_c,
    platform_total_youtube,
    platform_total_spotify,
    platform_total_boomplay
  )
  values (
    v_run_id,
    v_hour,
    (p_request -> 'evaluation' ->> 'totalActiveC')::numeric,
    (p_request -> 'evaluation' -> 'platformTotals' ->> 'youtube')::numeric,
    (p_request -> 'evaluation' -> 'platformTotals' ->> 'spotify')::numeric,
    (p_request -> 'evaluation' -> 'platformTotals' ->> 'boomplay')::numeric
  )
  returning id into v_publication_id;

  insert into public.bora_engine_publication_entries (
    publication_id,
    song_id,
    lifecycle,
    rank,
    active_c,
    xp,
    kura_fresh,
    persistent_kura_before,
    persistent_kura_next,
    platform_youtube,
    platform_spotify,
    platform_boomplay,
    bora_score
  )
  select
    v_publication_id,
    (item ->> 'songId')::uuid,
    item ->> 'lifecycle',
    nullif(item ->> 'rank', 'null')::integer,
    nullif(item ->> 'activeC', 'null')::numeric,
    nullif(item ->> 'xp', 'null')::numeric,
    nullif(item ->> 'kuraFresh', 'null')::numeric,
    nullif(item ->> 'persistentKuraBefore', 'null')::numeric,
    nullif(item ->> 'persistentKuraNext', 'null')::numeric,
    nullif(item -> 'platformPerformance' ->> 'youtube', 'null')::numeric,
    nullif(item -> 'platformPerformance' ->> 'spotify', 'null')::numeric,
    nullif(item -> 'platformPerformance' ->> 'boomplay', 'null')::numeric,
    nullif(item ->> 'boraScore', 'null')::numeric
  from jsonb_array_elements(p_request -> 'entries') as entries(item);

  update public.bora_engine_publication_head
  set publication_id = v_publication_id,
      updated_at = clock_timestamp()
  where singleton = true;

  update public.bora_engine_evaluation_runs
  set status = 'published',
      finished_at = clock_timestamp()
  where id = v_run_id;

  return jsonb_build_object(
    'status', 'published',
    'requestId', v_request_id,
    'publicationId', v_publication_id
  );
end;
$$;

revoke all on function public.bora_engine_publish_chart(jsonb)
  from public, anon, authenticated;
grant execute on function public.bora_engine_publish_chart(jsonb)
  to service_role;
