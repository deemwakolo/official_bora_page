-- Daily platform ranks replace hourly platform-source coverage for chart
-- scoring. Rank entries remain immutable; the observations table is a current
-- scoring projection containing inverse-rank activity at the EAT day boundary.

create table public.bora_engine_daily_platform_rank_snapshots (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  effective_date date not null,
  revision integer not null check (revision > 0),
  submitted_by uuid not null references auth.users(id) on delete restrict,
  evidence_references jsonb not null
    check (jsonb_typeof(evidence_references) = 'object'),
  supersedes_snapshot_id uuid references
    public.bora_engine_daily_platform_rank_snapshots(id) on delete restrict,
  request_payload jsonb not null
    check (jsonb_typeof(request_payload) = 'object'),
  submitted_at timestamptz not null default now(),
  unique (effective_date, revision)
);

create table public.bora_engine_daily_platform_rank_entries (
  snapshot_id uuid not null references
    public.bora_engine_daily_platform_rank_snapshots(id) on delete restrict,
  song_id uuid not null references public.songs(id) on delete restrict,
  platform text not null check (platform in ('youtube', 'spotify', 'boomplay')),
  rank integer not null check (rank > 0),
  primary key (snapshot_id, song_id, platform),
  unique (snapshot_id, platform, rank)
);

create index bora_engine_daily_platform_rank_date_idx
  on public.bora_engine_daily_platform_rank_snapshots
    (effective_date desc, revision desc);

alter table public.bora_engine_daily_platform_rank_snapshots
  enable row level security;
alter table public.bora_engine_daily_platform_rank_entries
  enable row level security;

revoke all on table
  public.bora_engine_daily_platform_rank_snapshots,
  public.bora_engine_daily_platform_rank_entries
from public, anon, authenticated;
grant all on table
  public.bora_engine_daily_platform_rank_snapshots,
  public.bora_engine_daily_platform_rank_entries
to service_role;

create function public.bora_engine_reject_daily_rank_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'BORA_DAILY_PLATFORM_RANK_HISTORY_IMMUTABLE';
end;
$$;

create trigger bora_engine_daily_rank_snapshot_immutable
before update or delete
on public.bora_engine_daily_platform_rank_snapshots
for each row
execute function public.bora_engine_reject_daily_rank_mutation();

create trigger bora_engine_daily_rank_entry_immutable
before update or delete
on public.bora_engine_daily_platform_rank_entries
for each row
execute function public.bora_engine_reject_daily_rank_mutation();

revoke all on function public.bora_engine_reject_daily_rank_mutation()
  from public, anon, authenticated;

create function public.bora_engine_admin_submit_daily_platform_ranks(
  p_request jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request_id uuid;
  v_actor_id uuid;
  v_supersedes_id uuid;
  v_effective_date date;
  v_effective_at timestamptz;
  v_revision integer;
  v_snapshot_id uuid;
  v_existing public.bora_engine_daily_platform_rank_snapshots%rowtype;
  v_song_count bigint;
  v_entry_count bigint;
  v_local_now timestamp;
  v_evidence jsonb;
  v_entry jsonb;
  v_song_id uuid;
  v_platform text;
  v_rank integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_ADMIN_REQUIRED';
  end if;
  if jsonb_typeof(p_request) is distinct from 'object'
    or jsonb_typeof(p_request -> 'requestId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'actorUserId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'entries') is distinct from 'array'
    or jsonb_typeof(p_request -> 'evidenceReferences') is distinct from 'object' then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  if (p_request ->> 'requestId') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
    or (p_request ->> 'actorUserId') !~
       '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  v_request_id := (p_request ->> 'requestId')::uuid;
  v_actor_id := (p_request ->> 'actorUserId')::uuid;
  if not exists (select 1 from auth.users u where u.id = v_actor_id) then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  v_evidence := p_request -> 'evidenceReferences';
  if exists (
    select 1
    from unnest(array['youtube', 'spotify', 'boomplay']) as p(platform)
    where jsonb_typeof(v_evidence -> p.platform) is distinct from 'string'
      or btrim(v_evidence ->> p.platform) = ''
      or length(v_evidence ->> p.platform) > 2000
  ) then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_request_id::text));
  select *
    into v_existing
  from public.bora_engine_daily_platform_rank_snapshots
  where request_id = v_request_id
  for update;
  if found then
    if v_existing.request_payload is distinct from p_request then
      return jsonb_build_object('status', 'idempotency-conflict');
    end if;
    return jsonb_build_object(
      'status', 'already-recorded',
      'snapshotId', v_existing.id,
      'effectiveDate', v_existing.effective_date,
      'revision', v_existing.revision
    );
  end if;

  v_local_now := clock_timestamp() at time zone 'Africa/Nairobi';
  if v_local_now::time < time '20:00' then
    return jsonb_build_object('status', 'outside-entry-window');
  end if;
  v_effective_date := v_local_now::date + 1;
  v_effective_at := v_effective_date::timestamp
    at time zone 'Africa/Nairobi';

  perform pg_advisory_xact_lock(hashtext(v_effective_date::text));

  select count(*) into v_song_count from public.songs;
  if v_song_count = 0 then
    return jsonb_build_object('status', 'no-songs');
  end if;

  v_entry_count := jsonb_array_length(p_request -> 'entries');
  if v_entry_count <> v_song_count * 3
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'entries') as item(value)
      where jsonb_typeof(item.value) is distinct from 'object'
        or jsonb_typeof(item.value -> 'songId') is distinct from 'string'
        or (item.value ->> 'songId') !~
          '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'
        or jsonb_typeof(item.value -> 'platform') is distinct from 'string'
        or item.value ->> 'platform' not in ('youtube', 'spotify', 'boomplay')
        or jsonb_typeof(item.value -> 'rank') is distinct from 'number'
        or (item.value ->> 'rank') !~ '^[1-9][0-9]*$'
        or length(item.value ->> 'rank') > 10
        or case
          when (item.value ->> 'rank') ~ '^[1-9][0-9]*$'
            and length(item.value ->> 'rank') <= 10
          then (item.value ->> 'rank')::numeric > 2147483647
          else false
        end
    )
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'entries') as item(value)
      group by item.value ->> 'songId', item.value ->> 'platform'
      having count(*) <> 1
    )
    or exists (
      select 1
      from jsonb_array_elements(p_request -> 'entries') as item(value)
      group by item.value ->> 'platform', item.value ->> 'rank'
      having count(*) <> 1
    ) then
    return jsonb_build_object('status', 'invalid-or-incomplete-ranks');
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_request -> 'entries') as item(value)
    where not exists (
      select 1
      from public.bora_engine_platform_source_mappings m
      where m.song_id = (item.value ->> 'songId')::uuid
        and m.platform = item.value ->> 'platform'
    )
  ) then
    return jsonb_build_object('status', 'mapping-required');
  end if;

  if exists (
    select 1
    from public.songs expected
    cross join unnest(array['youtube', 'spotify', 'boomplay']) as p(platform)
    where not exists (
      select 1
      from jsonb_array_elements(p_request -> 'entries') as item(value)
      where (item.value ->> 'songId')::uuid = expected.song_id
        and item.value ->> 'platform' = p.platform
    )
  ) then
    return jsonb_build_object('status', 'invalid-or-incomplete-ranks');
  end if;

  select id
    into v_supersedes_id
  from public.bora_engine_daily_platform_rank_snapshots
  where effective_date = v_effective_date
  order by revision desc
  limit 1
  for update;

  if nullif(p_request ->> 'supersedesSnapshotId', '') is not null
    and (p_request ->> 'supersedesSnapshotId') !~
      '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89aAbB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$' then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  if v_supersedes_id is distinct from
      nullif(p_request ->> 'supersedesSnapshotId', '')::uuid then
    return jsonb_build_object(
      'status',
      case when v_supersedes_id is null
        then 'correction-not-allowed'
        else 'correction-required'
      end
    );
  end if;

  select coalesce(max(revision), 0) + 1
    into v_revision
  from public.bora_engine_daily_platform_rank_snapshots
  where effective_date = v_effective_date;

  lock table public.bora_engine_platform_observations
    in share row exclusive mode;
  if exists (
    select 1
    from jsonb_array_elements(p_request -> 'entries') as item(value)
    join public.bora_engine_platform_observations o
      on o.song_id = (item.value ->> 'songId')::uuid
      and o.platform = item.value ->> 'platform'
      and o.hour_index = floor(extract(epoch from v_effective_at) / 3600)::bigint
    where o.source_system <> 'manual-daily-rank-v1'
  ) then
    return jsonb_build_object('status', 'rank-slot-conflict');
  end if;

  insert into public.bora_engine_daily_platform_rank_snapshots (
    request_id, effective_date, revision, submitted_by,
    evidence_references, supersedes_snapshot_id, request_payload
  )
  values (
    v_request_id, v_effective_date, v_revision, v_actor_id,
    v_evidence, v_supersedes_id, p_request
  )
  returning id into v_snapshot_id;

  for v_entry in
    select value from jsonb_array_elements(p_request -> 'entries')
  loop
    v_song_id := (v_entry ->> 'songId')::uuid;
    v_platform := v_entry ->> 'platform';
    v_rank := (v_entry ->> 'rank')::integer;

    insert into public.bora_engine_daily_platform_rank_entries (
      snapshot_id, song_id, platform, rank
    )
    values (v_snapshot_id, v_song_id, v_platform, v_rank);

    insert into public.bora_engine_platform_observations (
      song_id, platform, hour_index, value, source, lifecycle, version,
      source_system, source_observation_id, observed_at
    )
    values (
      v_song_id, v_platform,
      floor(extract(epoch from v_effective_at) / 3600)::bigint,
      1::numeric / v_rank, 'EXTERNAL', 'ACTIVE', v_revision - 1,
      'manual-daily-rank-v1',
      v_snapshot_id::text || ':' || v_song_id::text || ':' || v_platform,
      v_effective_at
    )
    on conflict (song_id, platform, hour_index) do update
      set value = excluded.value,
          source = excluded.source,
          lifecycle = excluded.lifecycle,
          version = excluded.version,
          source_system = excluded.source_system,
          source_observation_id = excluded.source_observation_id,
          observed_at = excluded.observed_at,
          ingested_at = clock_timestamp();
  end loop;

  return jsonb_build_object(
    'status', 'recorded',
    'snapshotId', v_snapshot_id,
    'effectiveDate', v_effective_date,
    'revision', v_revision
  );
end;
$$;

revoke all on function
  public.bora_engine_admin_submit_daily_platform_ranks(jsonb)
from public, anon, authenticated;
grant execute on function
  public.bora_engine_admin_submit_daily_platform_ranks(jsonb)
to service_role;

create function public.bora_engine_daily_platform_rank_readiness(
  p_closed_hour bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_active_count bigint;
  v_song_count bigint;
  v_snapshot_count bigint;
  v_complete_count bigint;
  v_as_of_date date;
  v_latest_date date;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_WORKER_REQUIRED';
  end if;
  if p_closed_hour is null or p_closed_hour < 0 then
    return jsonb_build_object('status', 'not-ready', 'reason', 'invalid-hour');
  end if;

  select count(*) into v_active_count
  from public.bora_engine_song_state
  where lifecycle = 'ACTIVE';
  select count(*) into v_song_count from public.songs;
  if v_active_count = 0 or v_song_count = 0 then
    return jsonb_build_object('status', 'not-ready', 'reason', 'no-active-songs');
  end if;

  v_as_of_date :=
    (to_timestamp(p_closed_hour * 3600) at time zone 'Africa/Nairobi')::date;
  select max(effective_date)
    into v_latest_date
  from public.bora_engine_daily_platform_rank_snapshots
  where effective_date <= v_as_of_date;
  if v_latest_date is distinct from v_as_of_date then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'current-day-ranks-missing',
      'referenceDate', v_as_of_date
    );
  end if;

  with latest_revisions as (
    select distinct on (effective_date)
      id, effective_date
    from public.bora_engine_daily_platform_rank_snapshots
    where effective_date <= v_as_of_date
    order by effective_date desc, revision desc
  ),
  selected as (
    select id, effective_date
    from latest_revisions
    order by effective_date desc
    limit 7
  ),
  snapshot_completeness as (
    select
      selected.id,
      count(entries.song_id) as entry_count,
      count(distinct entries.song_id) as distinct_songs,
      count(distinct entries.platform) as platform_count
    from selected
    left join public.bora_engine_daily_platform_rank_entries entries
      on entries.snapshot_id = selected.id
    group by selected.id
  )
  select
    count(*),
    count(*) filter (
      where entry_count = v_song_count * 3
        and distinct_songs = v_song_count
        and platform_count = 3
    )
  into v_snapshot_count, v_complete_count
  from snapshot_completeness;

  if v_snapshot_count = 0 or v_snapshot_count <> v_complete_count then
    return jsonb_build_object(
      'status', 'not-ready',
      'reason', 'daily-rank-history-incomplete',
      'snapshots', v_snapshot_count,
      'complete', v_complete_count
    );
  end if;

  return jsonb_build_object(
    'status', 'ready',
    'snapshots', v_snapshot_count,
    'windowDays', 7,
    'referenceDate', v_as_of_date
  );
end;
$$;

revoke all on function
  public.bora_engine_daily_platform_rank_readiness(bigint)
from public, anon, authenticated;
grant execute on function
  public.bora_engine_daily_platform_rank_readiness(bigint)
to service_role;

-- Preserve the existing transaction logic while replacing only the old
-- platform-hour coverage predicate and its 648-slot expectation.
do $$
declare
  v_function record;
  v_definition text;
  v_updated text;
  v_rank_readiness boolean;
  v_rewritten_count integer := 0;
begin
  for v_function in
    select p.oid, p.proname, p.pronargs
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and (
        (p.proname = 'bora_engine_load_hour' and p.pronargs = 2)
        or
        (p.proname = 'bora_engine_commit_hour' and p.pronargs = 7)
        or
        (p.proname = 'bora_engine_check_hour' and p.pronargs = 1)
        or
        (p.proname = 'bora_engine_publish_eligibility' and p.pronargs = 1)
      )
  loop
    v_definition := pg_get_functiondef(v_function.oid);
    v_updated := regexp_replace(
      v_definition,
      $$or[[:space:]]+\(c\.input_type in \('YOUTUBE', 'SPOTIFY', 'BOOMPLAY'\)[[:space:]]+and[[:space:]]+c\.hour_index between p_closed_hour - 167 and p_closed_hour\)$$,
      '',
      'g'
    );
    v_updated := replace(v_updated, '648', '144');
    v_rank_readiness := v_function.proname = 'bora_engine_publish_eligibility';
    if v_function.proname in ('bora_engine_check_hour', 'bora_engine_publish_eligibility') then
      if v_rank_readiness then
        v_updated := replace(
          v_updated,
          'v_readiness := public.bora_engine_readiness(p_closed_hour);',
          'v_readiness := public.bora_engine_daily_platform_rank_readiness(p_closed_hour);'
        );
      else
        v_updated := replace(
          v_updated,
          'v_readiness := public.bora_engine_readiness(p_closed_hour);',
          'v_readiness := jsonb_build_object(''status'', ''ready'');'
        );
      end if;
    end if;

    if v_updated = v_definition
      or position('* 648' in v_updated) > 0
      or position('p_closed_hour - 167' in v_updated) > 0 then
      raise exception 'BORA_ENGINE_HOURLY_COVERAGE_REWRITE_FAILED: %',
        v_function.proname;
    end if;
    if v_function.proname in ('bora_engine_check_hour', 'bora_engine_publish_eligibility')
      and position('bora_engine_readiness(p_closed_hour)' in v_updated) > 0 then
      raise exception 'BORA_ENGINE_READINESS_REWRITE_FAILED: %',
        v_function.proname;
    end if;
    execute v_updated;
    v_rewritten_count := v_rewritten_count + 1;
  end loop;
  if v_rewritten_count <> 4 then
    raise exception 'BORA_ENGINE_HOURLY_COVERAGE_FUNCTIONS_MISSING';
  end if;
end;
$$;

create or replace function public.bora_engine_readiness(
  p_closed_hour bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reference_hour bigint;
  v_state_reference_hour bigint;
  v_state_status text;
  v_state_song_count bigint;
  v_active_count bigint;
  v_song_count bigint;
  v_rank_population_count bigint;
  v_expected bigint;
  v_vote_complete bigint := 0;
  v_vote_unavailable bigint := 0;
  v_vote_failed bigint := 0;
  v_seed_complete bigint := 0;
  v_seed_unavailable bigint := 0;
  v_seed_failed bigint := 0;
  v_snapshot_id uuid;
  v_as_of_date date;
  v_youtube_complete bigint := 0;
  v_spotify_complete bigint := 0;
  v_boomplay_complete bigint := 0;
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
  if p_closed_hour is not null and p_closed_hour < 0 then
    raise exception 'BORA_ENGINE_INVALID_HOUR';
  end if;

  select reference_hour
    into v_state_reference_hour
  from public.bora_engine_hourly_state_head
  where singleton = true;
  if not found then
    v_state_reference_hour := null;
    v_state_status := 'missing';
    v_state_song_count := 0;
    v_active_count := 0;
  else
    v_reference_hour := v_state_reference_hour;
    select count(*), count(*) filter (where lifecycle = 'ACTIVE')
      into v_state_song_count, v_active_count
    from public.bora_engine_song_state;
    v_state_status := case
      when v_active_count > 0
        and (p_closed_hour is null or p_closed_hour = v_state_reference_hour)
        then 'ready'
      else 'incomplete'
    end;
  end if;
  if p_closed_hour is not null then
    v_reference_hour := p_closed_hour;
  end if;

  select count(*) into v_song_count from public.songs;
  v_rank_population_count := case
    when v_active_count > 0 then v_active_count
    else v_song_count
  end;
  v_expected := v_active_count * 72;

  if v_reference_hour is not null then
    select
      count(*) filter (
        where c.status = 'COMPLETE'
          and c.currentness = 'current'
          and c.expected_source_identity is not null
          and btrim(c.expected_source_identity) <> ''
          and c.source_identity = c.expected_source_identity
          and (c.revision is not null or c.evidence_id is not null)
          and c.assessed_at is not null
      ),
      count(*) filter (where c.status = 'UNAVAILABLE'),
      count(*) filter (where c.status = 'FAILED')
    into v_vote_complete, v_vote_unavailable, v_vote_failed
    from public.bora_engine_hourly_input_coverage c
    join public.bora_engine_song_state s on s.song_id = c.song_id
    where s.lifecycle = 'ACTIVE'
      and c.input_type = 'VOTES'
      and c.hour_index between v_reference_hour - 71 and v_reference_hour;

    select
      count(*) filter (
        where c.status = 'COMPLETE'
          and c.currentness = 'current'
          and c.expected_source_identity is not null
          and btrim(c.expected_source_identity) <> ''
          and c.source_identity = c.expected_source_identity
          and (c.revision is not null or c.evidence_id is not null)
          and c.assessed_at is not null
      ),
      count(*) filter (where c.status = 'UNAVAILABLE'),
      count(*) filter (where c.status = 'FAILED')
    into v_seed_complete, v_seed_unavailable, v_seed_failed
    from public.bora_engine_hourly_input_coverage c
    join public.bora_engine_song_state s on s.song_id = c.song_id
    where s.lifecycle = 'ACTIVE'
      and c.input_type = 'SEED'
      and c.hour_index between v_reference_hour - 71 and v_reference_hour;

    v_as_of_date :=
      (to_timestamp(v_reference_hour * 3600) at time zone 'Africa/Nairobi')::date;
    select id
      into v_snapshot_id
    from public.bora_engine_daily_platform_rank_snapshots
    where effective_date = v_as_of_date
    order by revision desc
    limit 1;
    if v_snapshot_id is not null then
      select count(*) into v_youtube_complete
      from public.bora_engine_daily_platform_rank_entries e
      where e.snapshot_id = v_snapshot_id
        and e.platform = 'youtube'
        and (
          v_active_count = 0
          or exists (
            select 1 from public.bora_engine_song_state s
            where s.song_id = e.song_id and s.lifecycle = 'ACTIVE'
          )
        );
      select count(*) into v_spotify_complete
      from public.bora_engine_daily_platform_rank_entries e
      where e.snapshot_id = v_snapshot_id
        and e.platform = 'spotify'
        and (
          v_active_count = 0
          or exists (
            select 1 from public.bora_engine_song_state s
            where s.song_id = e.song_id and s.lifecycle = 'ACTIVE'
          )
        );
      select count(*) into v_boomplay_complete
      from public.bora_engine_daily_platform_rank_entries e
      where e.snapshot_id = v_snapshot_id
        and e.platform = 'boomplay'
        and (
          v_active_count = 0
          or exists (
            select 1 from public.bora_engine_song_state s
            where s.song_id = e.song_id and s.lifecycle = 'ACTIVE'
          )
        );
    end if;
  end if;

  v_vote := jsonb_build_object(
    'status', case when v_expected > 0 and v_vote_complete = v_expected
      then 'ready' else 'incomplete' end,
    'expected', v_expected,
    'complete', v_vote_complete,
    'missing', greatest(v_expected - v_vote_complete, 0),
    'unavailable', v_vote_unavailable,
    'failed', v_vote_failed,
    'records', v_vote_complete
  );
  v_seed := jsonb_build_object(
    'status', case when v_expected > 0 and v_seed_complete = v_expected
      then 'ready' else 'incomplete' end,
    'expected', v_expected,
    'complete', v_seed_complete,
    'missing', greatest(v_expected - v_seed_complete, 0),
    'unavailable', v_seed_unavailable,
    'failed', v_seed_failed,
    'records', v_seed_complete
  );
  v_youtube := jsonb_build_object(
    'status', case when v_rank_population_count > 0
      and v_youtube_complete = v_rank_population_count
      then 'ready' else 'incomplete' end,
    'expected', v_rank_population_count,
    'complete', v_youtube_complete,
    'missing', greatest(v_rank_population_count - v_youtube_complete, 0),
    'unavailable', 0,
    'failed', 0,
    'records', v_youtube_complete
  );
  v_spotify := jsonb_build_object(
    'status', case when v_rank_population_count > 0
      and v_spotify_complete = v_rank_population_count
      then 'ready' else 'incomplete' end,
    'expected', v_rank_population_count,
    'complete', v_spotify_complete,
    'missing', greatest(v_rank_population_count - v_spotify_complete, 0),
    'unavailable', 0,
    'failed', 0,
    'records', v_spotify_complete
  );
  v_boomplay := jsonb_build_object(
    'status', case when v_rank_population_count > 0
      and v_boomplay_complete = v_rank_population_count
      then 'ready' else 'incomplete' end,
    'expected', v_rank_population_count,
    'complete', v_boomplay_complete,
    'missing', greatest(v_rank_population_count - v_boomplay_complete, 0),
    'unavailable', 0,
    'failed', 0,
    'records', v_boomplay_complete
  );

  v_ready :=
    v_state_status = 'ready'
    and v_vote ->> 'status' = 'ready'
    and v_seed ->> 'status' = 'ready'
    and v_youtube ->> 'status' = 'ready'
    and v_spotify ->> 'status' = 'ready'
    and v_boomplay ->> 'status' = 'ready';

  return jsonb_build_object(
    'status', case when v_ready then 'ready' else 'not-ready' end,
    'closedHour', p_closed_hour,
    'checks', jsonb_build_object(
      'initialState', jsonb_build_object(
        'status', v_state_status,
        'songCount', v_state_song_count,
        'referenceHour', v_state_reference_hour
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
