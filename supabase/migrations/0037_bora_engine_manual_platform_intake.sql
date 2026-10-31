-- BORA Engine manual platform data intake.
-- Forward-only: records real administrator-supplied evidence without changing
-- existing songs, votes, Engine state, or publications.

create table public.bora_engine_platform_source_mappings (
  song_id uuid not null references public.songs(id) on delete restrict,
  platform text not null
    check (platform in ('youtube', 'spotify', 'boomplay')),
  platform_identity text not null
    check (btrim(platform_identity) <> ''),
  source_display_name text not null
    check (btrim(source_display_name) <> ''),
  authorization_reference text not null
    check (btrim(authorization_reference) <> ''),
  authorization_confirmed boolean not null
    check (authorization_confirmed),
  hourly_evidence_confirmed boolean not null default false,
  updated_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (song_id, platform),
  unique (platform, platform_identity)
);

create table public.bora_engine_platform_source_mapping_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  song_id uuid not null references public.songs(id) on delete restrict,
  platform text not null
    check (platform in ('youtube', 'spotify', 'boomplay')),
  platform_identity text not null
    check (btrim(platform_identity) <> ''),
  source_display_name text not null
    check (btrim(source_display_name) <> ''),
  authorization_reference text not null
    check (btrim(authorization_reference) <> ''),
  authorization_confirmed boolean not null
    check (authorization_confirmed),
  hourly_evidence_confirmed boolean not null default false,
  changed_by uuid not null references auth.users(id) on delete restrict,
  request_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table public.bora_engine_platform_baseline_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  record_type text not null
    check (record_type in ('baseline', 'snapshot')),
  song_id uuid not null references public.songs(id) on delete restrict,
  platform text not null
    check (platform in ('youtube', 'spotify', 'boomplay')),
  platform_identity text not null
    check (btrim(platform_identity) <> ''),
  source_display_name text not null
    check (btrim(source_display_name) <> ''),
  source_evidence_reference text not null
    check (btrim(source_evidence_reference) <> ''),
  metric text not null check (btrim(metric) <> ''),
  unit text not null check (btrim(unit) <> ''),
  value numeric not null
    check (value >= 0 and value < 'Infinity'::numeric),
  observed_at timestamptz not null,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  request_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index bora_engine_platform_mapping_history_song_idx
  on public.bora_engine_platform_source_mapping_history
    (song_id, platform, created_at desc);
create index bora_engine_platform_baseline_history_song_idx
  on public.bora_engine_platform_baseline_history
    (song_id, platform, observed_at desc);

alter table public.bora_engine_platform_observation_history
  add column platform_identity text,
  add column source_display_name text,
  add column submitted_by uuid references auth.users(id) on delete restrict,
  add column submission_payload jsonb;

alter table public.bora_engine_platform_source_mappings enable row level security;
alter table public.bora_engine_platform_source_mapping_history enable row level security;
alter table public.bora_engine_platform_baseline_history enable row level security;

revoke all on table
  public.bora_engine_platform_source_mappings,
  public.bora_engine_platform_source_mapping_history,
  public.bora_engine_platform_baseline_history
from public, anon, authenticated;
grant all on table
  public.bora_engine_platform_source_mappings,
  public.bora_engine_platform_source_mapping_history,
  public.bora_engine_platform_baseline_history
to service_role;

grant select, insert on table public.bora_engine_platform_observation_history
to service_role;

create function public.bora_engine_reject_manual_platform_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'BORA_MANUAL_PLATFORM_HISTORY_IMMUTABLE';
end;
$$;

create trigger bora_engine_platform_source_mapping_history_immutable
before update or delete
on public.bora_engine_platform_source_mapping_history
for each row
execute function public.bora_engine_reject_manual_platform_history_mutation();

create trigger bora_engine_platform_baseline_history_immutable
before update or delete
on public.bora_engine_platform_baseline_history
for each row
execute function public.bora_engine_reject_manual_platform_history_mutation();

revoke all on function
  public.bora_engine_reject_manual_platform_history_mutation()
from public, anon, authenticated;

create function public.bora_engine_admin_save_platform_mapping(
  p_request jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_song_id uuid;
  v_actor_id uuid;
  v_platform text;
  v_platform_identity text;
  v_source_name text;
  v_authorization_reference text;
  v_existing public.bora_engine_platform_source_mapping_history%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_ADMIN_REQUIRED';
  end if;

  if jsonb_typeof(p_request) is distinct from 'object'
    or jsonb_typeof(p_request -> 'requestId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'songId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'actorUserId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'platform') is distinct from 'string'
    or jsonb_typeof(p_request -> 'platformIdentity') is distinct from 'string'
    or jsonb_typeof(p_request -> 'sourceDisplayName') is distinct from 'string'
    or jsonb_typeof(p_request -> 'authorizationReference') is distinct from 'string'
    or jsonb_typeof(p_request -> 'hourlyEvidenceConfirmed') is distinct from 'boolean'
    or p_request -> 'authorizationConfirmed' is distinct from 'true'::jsonb then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  v_request_id := (p_request ->> 'requestId')::uuid;
  v_song_id := (p_request ->> 'songId')::uuid;
  v_actor_id := (p_request ->> 'actorUserId')::uuid;
  v_platform := p_request ->> 'platform';
  v_platform_identity := btrim(p_request ->> 'platformIdentity');
  v_source_name := btrim(p_request ->> 'sourceDisplayName');
  v_authorization_reference := btrim(p_request ->> 'authorizationReference');

  if v_platform not in ('youtube', 'spotify', 'boomplay')
    or v_platform_identity = ''
    or length(v_platform_identity) > 300
    or v_source_name = ''
    or length(v_source_name) > 200
    or v_authorization_reference = ''
    or length(v_authorization_reference) > 2000
    or not exists (select 1 from auth.users u where u.id = v_actor_id)
    or not exists (select 1 from public.songs s where s.id = v_song_id) then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_request_id::text));
  select *
    into v_existing
  from public.bora_engine_platform_source_mapping_history
  where request_id = v_request_id
  for update;
  if found then
    if v_existing.request_payload is distinct from p_request then
      return jsonb_build_object('status', 'idempotency-conflict');
    end if;
    return jsonb_build_object(
      'status', 'already-saved',
      'requestId', v_request_id
    );
  end if;

  begin
    insert into public.bora_engine_platform_source_mapping_history (
      request_id, song_id, platform, platform_identity, source_display_name,
      authorization_reference, authorization_confirmed,
      hourly_evidence_confirmed, changed_by,
      request_payload
    )
    values (
      v_request_id, v_song_id, v_platform, v_platform_identity, v_source_name,
      v_authorization_reference, true,
      (p_request ->> 'hourlyEvidenceConfirmed')::boolean, v_actor_id, p_request
    );

    insert into public.bora_engine_platform_source_mappings (
      song_id, platform, platform_identity, source_display_name,
      authorization_reference, authorization_confirmed,
      hourly_evidence_confirmed, updated_by, updated_at
    )
    values (
      v_song_id, v_platform, v_platform_identity, v_source_name,
      v_authorization_reference, true,
      (p_request ->> 'hourlyEvidenceConfirmed')::boolean,
      v_actor_id, clock_timestamp()
    )
    on conflict (song_id, platform) do update
      set platform_identity = excluded.platform_identity,
          source_display_name = excluded.source_display_name,
          authorization_reference = excluded.authorization_reference,
          authorization_confirmed = excluded.authorization_confirmed,
          hourly_evidence_confirmed = excluded.hourly_evidence_confirmed,
          updated_by = excluded.updated_by,
          updated_at = excluded.updated_at;
  exception
    when unique_violation then
      return jsonb_build_object('status', 'platform-identity-in-use');
  end;

  return jsonb_build_object(
    'status', 'saved',
    'requestId', v_request_id
  );
end;
$$;

create function public.bora_engine_admin_submit_platform_baseline(
  p_request jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_song_id uuid;
  v_actor_id uuid;
  v_platform text;
  v_value numeric;
  v_observed_at timestamptz;
  v_evidence_id uuid;
  v_existing public.bora_engine_platform_baseline_history%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_ADMIN_REQUIRED';
  end if;

  if jsonb_typeof(p_request) is distinct from 'object'
    or jsonb_typeof(p_request -> 'requestId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'songId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'actorUserId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'platform') is distinct from 'string'
    or jsonb_typeof(p_request -> 'platformIdentity') is distinct from 'string'
    or jsonb_typeof(p_request -> 'sourceDisplayName') is distinct from 'string'
    or jsonb_typeof(p_request -> 'sourceEvidenceReference') is distinct from 'string'
    or jsonb_typeof(p_request -> 'metric') is distinct from 'string'
    or jsonb_typeof(p_request -> 'unit') is distinct from 'string'
    or jsonb_typeof(p_request -> 'value') is distinct from 'string'
    or jsonb_typeof(p_request -> 'recordType') is distinct from 'string'
    or jsonb_typeof(p_request -> 'observedAt') is distinct from 'string'
    or p_request -> 'authorizationConfirmed' is distinct from 'true'::jsonb then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  v_request_id := (p_request ->> 'requestId')::uuid;
  v_song_id := (p_request ->> 'songId')::uuid;
  v_actor_id := (p_request ->> 'actorUserId')::uuid;
  v_platform := p_request ->> 'platform';
  v_value := (p_request ->> 'value')::numeric;
  v_observed_at := (p_request ->> 'observedAt')::timestamptz;

  if v_platform not in ('youtube', 'spotify', 'boomplay')
    or v_value < 0
    or v_value >= 'Infinity'::numeric
    or btrim(p_request ->> 'platformIdentity') = ''
    or btrim(p_request ->> 'sourceDisplayName') = ''
    or btrim(p_request ->> 'sourceEvidenceReference') = ''
    or btrim(p_request ->> 'metric') = ''
    or btrim(p_request ->> 'unit') = ''
    or p_request ->> 'recordType' not in ('baseline', 'snapshot')
    or p_request ->> 'value' !~ '^[0-9]+([.][0-9]+)?$'
    or not exists (
      select 1
      from public.bora_engine_platform_source_mappings m
      where m.song_id = v_song_id
        and m.platform = v_platform
        and m.platform_identity = p_request ->> 'platformIdentity'
        and m.source_display_name = p_request ->> 'sourceDisplayName'
        and m.authorization_confirmed
    )
    or not exists (select 1 from auth.users u where u.id = v_actor_id) then
    return jsonb_build_object('status', 'mapping-or-input-invalid');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_request_id::text));
  select *
    into v_existing
  from public.bora_engine_platform_baseline_history
  where request_id = v_request_id
  for update;
  if found then
    if v_existing.request_payload is distinct from p_request then
      return jsonb_build_object('status', 'idempotency-conflict');
    end if;
    return jsonb_build_object(
      'status', 'already-recorded',
      'evidenceId', v_existing.id
    );
  end if;

  insert into public.bora_engine_platform_baseline_history (
    request_id, record_type, song_id, platform, platform_identity, source_display_name,
    source_evidence_reference, metric, unit, value, observed_at,
    submitted_by, request_payload
  )
  values (
    v_request_id, p_request ->> 'recordType', v_song_id, v_platform,
    p_request ->> 'platformIdentity',
    p_request ->> 'sourceDisplayName', p_request ->> 'sourceEvidenceReference',
    p_request ->> 'metric', p_request ->> 'unit', v_value, v_observed_at,
    v_actor_id, p_request
  )
  returning id into v_evidence_id;

  return jsonb_build_object('status', 'recorded', 'evidenceId', v_evidence_id);
end;
$$;

create function public.bora_engine_admin_submit_platform_hour(
  p_request jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_song_id uuid;
  v_actor_id uuid;
  v_platform text;
  v_hour bigint;
  v_value numeric;
  v_observed_at timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_metric text;
  v_unit text;
  v_existing public.bora_engine_platform_observation_history%rowtype;
  v_current public.bora_engine_platform_observations%rowtype;
  v_parent public.bora_engine_platform_observation_history%rowtype;
  v_history_id uuid;
  v_version bigint;
  v_lifecycle text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'BORA_ENGINE_ADMIN_REQUIRED';
  end if;

  if jsonb_typeof(p_request) is distinct from 'object'
    or jsonb_typeof(p_request -> 'requestId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'songId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'actorUserId') is distinct from 'string'
    or jsonb_typeof(p_request -> 'platform') is distinct from 'string'
    or jsonb_typeof(p_request -> 'platformIdentity') is distinct from 'string'
    or jsonb_typeof(p_request -> 'sourceDisplayName') is distinct from 'string'
    or jsonb_typeof(p_request -> 'sourceEvidenceReference') is distinct from 'string'
    or jsonb_typeof(p_request -> 'metric') is distinct from 'string'
    or jsonb_typeof(p_request -> 'unit') is distinct from 'string'
    or jsonb_typeof(p_request -> 'value') is distinct from 'string'
    or jsonb_typeof(p_request -> 'hourIndex') is distinct from 'number'
    or jsonb_typeof(p_request -> 'periodStart') is distinct from 'string'
    or jsonb_typeof(p_request -> 'periodEnd') is distinct from 'string'
    or jsonb_typeof(p_request -> 'observedAt') is distinct from 'string'
    or p_request -> 'authorizationConfirmed' is distinct from 'true'::jsonb then
    return jsonb_build_object('status', 'invalid-input');
  end if;

  v_request_id := (p_request ->> 'requestId')::uuid;
  v_song_id := (p_request ->> 'songId')::uuid;
  v_actor_id := (p_request ->> 'actorUserId')::uuid;
  v_platform := p_request ->> 'platform';
  v_hour := (p_request ->> 'hourIndex')::bigint;
  v_value := (p_request ->> 'value')::numeric;
  v_observed_at := (p_request ->> 'observedAt')::timestamptz;
  v_period_start := (p_request ->> 'periodStart')::timestamptz;
  v_period_end := (p_request ->> 'periodEnd')::timestamptz;
  v_metric := p_request ->> 'metric';
  v_unit := p_request ->> 'unit';

  if v_platform not in ('youtube', 'spotify', 'boomplay')
    or v_hour < 0
    or v_value < 0
    or v_value > 9223372036854775807
    or v_value >= 'Infinity'::numeric
    or v_value <> trunc(v_value)
    or v_period_start at time zone 'UTC' <>
      date_trunc('hour', v_period_start at time zone 'UTC')
    or v_period_end - v_period_start <> interval '1 hour'
    or v_observed_at < v_period_start
    or v_observed_at >= v_period_end
    or v_hour <> floor(extract(epoch from v_observed_at) / 3600)::bigint
    or v_hour <> floor(extract(epoch from v_period_start) / 3600)::bigint
    or (v_platform = 'youtube'
      and (v_metric <> 'video_views' or v_unit <> 'views_per_hour'))
    or (v_platform in ('spotify', 'boomplay')
      and (v_metric <> 'track_streams' or v_unit <> 'streams_per_hour'))
    or btrim(p_request ->> 'sourceEvidenceReference') = ''
    or not exists (
      select 1
      from public.bora_engine_platform_source_mappings m
      where m.song_id = v_song_id
        and m.platform = v_platform
        and m.platform_identity = p_request ->> 'platformIdentity'
        and m.source_display_name = p_request ->> 'sourceDisplayName'
        and m.authorization_confirmed
        and m.hourly_evidence_confirmed
    )
    or not exists (select 1 from auth.users u where u.id = v_actor_id)
    or not exists (select 1 from public.songs s where s.id = v_song_id) then
    return jsonb_build_object('status', 'mapping-or-input-invalid');
  end if;

  perform pg_advisory_xact_lock(hashtext(v_request_id::text));
  select *
    into v_existing
  from public.bora_engine_platform_observation_history
  where source_system = 'manual-admin-v1'
    and source_observation_id = v_request_id::text
  for update;
  if found then
    if v_existing.submission_payload is distinct from p_request then
      return jsonb_build_object('status', 'idempotency-conflict');
    end if;
    return jsonb_build_object(
      'status', 'already-recorded',
      'evidenceId', v_existing.id
    );
  end if;

  select *
    into v_current
  from public.bora_engine_platform_observations
  where song_id = v_song_id
    and platform = v_platform
    and hour_index = v_hour
    and metric_type = v_metric
  for update;

  if found then
    if jsonb_typeof(p_request -> 'supersedesObservationId') is distinct from 'string' then
      return jsonb_build_object('status', 'correction-required');
    end if;
    select *
      into v_parent
    from public.bora_engine_platform_observation_history
    where id = (p_request ->> 'supersedesObservationId')::uuid
      and song_id = v_song_id
      and platform = v_platform
      and hour_index = v_hour;
    if not found
      or v_current.source_system <> 'manual-admin-v1'
      or v_current.source_observation_id <> v_parent.source_observation_id then
      return jsonb_build_object('status', 'stale-correction');
    end if;
    v_version := v_parent.version::bigint + 1;
  else
    if p_request ? 'supersedesObservationId' then
      return jsonb_build_object('status', 'stale-correction');
    end if;
    v_version := 0;
  end if;

  select case
      when coalesce(s.lifecycle, 'ACTIVE') = 'ACTIVE' then 'ACTIVE'
      else 'ARCHIVED'
    end
    into v_lifecycle
  from public.songs song
  left join public.bora_engine_song_state s on s.song_id = song.id
  where song.id = v_song_id;

  insert into public.bora_engine_platform_observation_history (
    song_id, platform, metric, unit, hour_index, value, period_start,
    period_end, source, source_system, source_observation_id,
    provider_reference, version, observed_at, supersedes_observation_id,
    platform_identity, source_display_name, submitted_by, submission_payload
  )
  values (
    v_song_id, v_platform, v_metric, v_unit, v_hour, v_value,
    v_period_start, v_period_end, 'EXTERNAL', 'manual-admin-v1',
    v_request_id::text, p_request ->> 'sourceEvidenceReference',
    v_version, v_observed_at,
    nullif(p_request ->> 'supersedesObservationId', '')::uuid,
    p_request ->> 'platformIdentity', p_request ->> 'sourceDisplayName',
    v_actor_id, p_request
  )
  returning id into v_history_id;

  insert into public.bora_engine_platform_observations (
    song_id, platform, hour_index, value, source, lifecycle, version,
    source_system, source_observation_id, observed_at, metric_type,
    observation_value, retrieved_at
  )
  values (
    v_song_id, v_platform, v_hour, v_value, 'EXTERNAL', v_lifecycle,
    v_version, 'manual-admin-v1', v_request_id::text, v_observed_at,
    v_metric, v_value::bigint, clock_timestamp()
  )
  on conflict (song_id, platform, hour_index, metric_type) do update
    set value = excluded.value,
        source = excluded.source,
        lifecycle = excluded.lifecycle,
        version = excluded.version,
        source_system = excluded.source_system,
        source_observation_id = excluded.source_observation_id,
        observed_at = excluded.observed_at,
        metric_type = excluded.metric_type,
        observation_value = excluded.observation_value,
        retrieved_at = excluded.retrieved_at;

  insert into public.bora_engine_hourly_input_coverage (
    song_id, input_type, hour_index, status, detail, checked_at, updated_at,
    revision, evidence_id, currentness, assessed_at, invalidated_reason,
    derived_delta, raw_value, source, source_system, expected_source_identity,
    evidence_reason, source_identity
  )
  values (
    v_song_id, upper(v_platform), v_hour, 'COMPLETE',
    'admin-manual-hourly-evidence', clock_timestamp(), clock_timestamp(),
    v_version, v_history_id::text, 'current', clock_timestamp(), null,
    v_value::bigint, v_value::bigint, 'EXTERNAL', 'manual-admin-v1',
    'manual-admin-v1', null, 'manual-admin-v1'
  )
  on conflict (song_id, input_type, hour_index) do update
    set status = excluded.status,
        detail = excluded.detail,
        checked_at = excluded.checked_at,
        updated_at = excluded.updated_at,
        revision = excluded.revision,
        evidence_id = excluded.evidence_id,
        currentness = excluded.currentness,
        assessed_at = excluded.assessed_at,
        invalidated_reason = null,
        derived_delta = excluded.derived_delta,
        raw_value = excluded.raw_value,
        source = excluded.source,
        source_system = excluded.source_system,
        expected_source_identity = excluded.expected_source_identity,
        evidence_reason = null,
        source_identity = excluded.source_identity;

  return jsonb_build_object(
    'status', 'recorded',
    'evidenceId', v_history_id,
    'hourIndex', v_hour,
    'version', v_version
  );
end;
$$;

revoke all on function public.bora_engine_admin_save_platform_mapping(jsonb)
  from public, anon, authenticated;
revoke all on function public.bora_engine_admin_submit_platform_baseline(jsonb)
  from public, anon, authenticated;
revoke all on function public.bora_engine_admin_submit_platform_hour(jsonb)
  from public, anon, authenticated;
grant execute on function public.bora_engine_admin_save_platform_mapping(jsonb)
  to service_role;
grant execute on function public.bora_engine_admin_submit_platform_baseline(jsonb)
  to service_role;
grant execute on function public.bora_engine_admin_submit_platform_hour(jsonb)
  to service_role;
