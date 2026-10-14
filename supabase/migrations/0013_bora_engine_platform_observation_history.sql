-- ============================================================
-- BORA ENGINE — PLATFORM OBSERVATION REVISION HISTORY
-- ============================================================
--
-- Additive, unapplied proposal. Does not modify the Phase 2 migration, any
-- existing platform table, provider integration, or public-chart behavior.
--
-- bora_engine_platform_observations remains the one-per-song/platform/hour
-- Engine projection. This append-only table preserves provider observations
-- and explicit corrections before a trusted writer updates that projection.
--
-- Retries reuse (source_system, source_observation_id). Corrections get a new
-- source identity and explicitly supersede the prior observation for the same
-- song/platform/hour. Values represent activity during one aligned UTC hour,
-- never cumulative/lifetime counters. One root and a single correction chain
-- per hour prevent ambiguous competing readings from being summed by Engine.
-- ============================================================

create table public.bora_engine_platform_observation_history (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null
    references public.songs(id) on delete restrict,
  platform text not null
    check (platform in ('youtube', 'spotify', 'boomplay')),
  metric text not null,
  unit text not null,
  hour_index bigint not null,
  value numeric not null
    check (value >= 0 and value < 'Infinity'::numeric),
  period_start timestamptz not null,
  period_end timestamptz not null,
  source text not null
    check (source in ('IN_CHART', 'EXTERNAL')),
  source_system text not null
    check (btrim(source_system) <> ''),
  source_observation_id text not null
    check (btrim(source_observation_id) <> ''),
  provider_reference text,
  version numeric not null default 0
    check (
      version >= 0
      and version < 'Infinity'::numeric
      and version = trunc(version)
    ),
  observed_at timestamptz not null,
  supersedes_observation_id uuid,
  ingested_at timestamptz not null default now(),

  unique (source_system, source_observation_id),
  unique (id, song_id, platform, hour_index),
  foreign key (
    supersedes_observation_id,
    song_id,
    platform,
    hour_index
  )
    references public.bora_engine_platform_observation_history
      (id, song_id, platform, hour_index)
    on delete restrict,

  check (
    (platform = 'youtube'
      and metric = 'video_views'
      and unit = 'views_per_hour')
    or
    (platform in ('spotify', 'boomplay')
      and metric = 'track_streams'
      and unit = 'streams_per_hour')
  ),
  check (
    period_start at time zone 'UTC' =
      date_trunc('hour', period_start at time zone 'UTC')
    and period_end - period_start = interval '1 hour'
    and observed_at >= period_start
    and observed_at < period_end
    and hour_index = floor(extract(epoch from observed_at) / 3600)::bigint
  ),
  check (
    provider_reference is null
    or btrim(provider_reference) <> ''
  ),
  check (
    supersedes_observation_id is null
    or supersedes_observation_id <> id
  )
);

create unique index bora_engine_platform_observation_history_root_uk
  on public.bora_engine_platform_observation_history
    (song_id, platform, hour_index)
  where supersedes_observation_id is null;

create unique index bora_engine_platform_observation_history_successor_uk
  on public.bora_engine_platform_observation_history
    (supersedes_observation_id)
  where supersedes_observation_id is not null;

create index bora_engine_platform_observation_history_slot_idx
  on public.bora_engine_platform_observation_history
    (song_id, platform, hour_index, version desc);

create function public.bora_engine_reject_platform_observation_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception
    'BORA_PLATFORM_OBSERVATION_HISTORY_IMMUTABLE: append a correction instead';
end;
$$;

create function public.bora_engine_validate_platform_observation_revision()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_parent_version numeric;
begin
  if new.supersedes_observation_id is null then
    if new.version <> 0 then
      raise exception
        'BORA_PLATFORM_OBSERVATION_REVISION_INVALID: initial version must be zero';
    end if;
    return new;
  end if;

  select version
    into v_parent_version
  from public.bora_engine_platform_observation_history
  where id = new.supersedes_observation_id
    and song_id = new.song_id
    and platform = new.platform
    and hour_index = new.hour_index;

  if not found or new.version <> v_parent_version + 1 then
    raise exception
      'BORA_PLATFORM_OBSERVATION_REVISION_INVALID: correction must increment the superseded version';
  end if;

  return new;
end;
$$;

create trigger bora_engine_platform_observation_history_revision
before insert
on public.bora_engine_platform_observation_history
for each row
execute function public.bora_engine_validate_platform_observation_revision();

create trigger bora_engine_platform_observation_history_immutable
before update or delete
on public.bora_engine_platform_observation_history
for each row
execute function public.bora_engine_reject_platform_observation_mutation();

alter table public.bora_engine_platform_observation_history
  enable row level security;

revoke all on table
  public.bora_engine_platform_observation_history
from anon, authenticated;

revoke execute on function
  public.bora_engine_reject_platform_observation_mutation()
from public, anon, authenticated;

revoke execute on function
  public.bora_engine_validate_platform_observation_revision()
from public, anon, authenticated;
