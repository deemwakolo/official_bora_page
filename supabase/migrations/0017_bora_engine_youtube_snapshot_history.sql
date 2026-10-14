-- ============================================================
-- BORA ENGINE — YOUTUBE CUMULATIVE SNAPSHOT HISTORY
-- ============================================================
--
-- Additive, unapplied draft. Depends on migration 0012 for public.songs(id).
-- This history is deliberately separate from
-- bora_engine_platform_observation_history: YouTube Data API viewCount is a
-- cumulative total, not views_per_hour, and is not an Engine input.
--
-- Retrying persistence of one capture reuses source_observation_id. Each new
-- retrieval gets a new capture identity, allowing multiple snapshots for one
-- video. Corrections and invalidations append a revision linked to its parent;
-- rows are never updated or deleted.
-- ============================================================

create table public.bora_engine_youtube_snapshot_history (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null
    references public.songs(id) on delete restrict,
  video_id text not null
    check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  provider text not null default 'youtube-data-api-v3'
    check (provider = 'youtube-data-api-v3'),
  metric text not null default 'cumulative_views'
    check (metric = 'cumulative_views'),
  unit text not null default 'views_total'
    check (unit = 'views_total'),
  source_status text not null
    check (source_status in ('OBSERVED', 'INVALIDATED')),
  view_count numeric,
  retrieved_at timestamptz not null,
  source_system text not null default 'youtube-data-api-v3'
    check (source_system = 'youtube-data-api-v3'),
  source_observation_id text not null
    check (source_observation_id ~
      '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-8][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$'),
  version integer not null default 0
    check (version >= 0),
  supersedes_snapshot_id uuid,
  ingested_at timestamptz not null default now(),

  unique (source_system, source_observation_id),
  unique (id, song_id, video_id),
  foreign key (supersedes_snapshot_id, song_id, video_id)
    references public.bora_engine_youtube_snapshot_history
      (id, song_id, video_id)
    on delete restrict,
  check (
    (source_status = 'OBSERVED'
      and view_count is not null
      and view_count >= 0
      and view_count < 'Infinity'::numeric
      and view_count = trunc(view_count))
    or
    (source_status = 'INVALIDATED'
      and view_count is null
      and supersedes_snapshot_id is not null)
  ),
  check (
    (version = 0 and supersedes_snapshot_id is null
      and source_status = 'OBSERVED')
    or
    (version > 0 and supersedes_snapshot_id is not null)
  )
);

create unique index bora_engine_youtube_snapshot_successor_uk
  on public.bora_engine_youtube_snapshot_history (supersedes_snapshot_id)
  where supersedes_snapshot_id is not null;

create index bora_engine_youtube_snapshot_song_time_idx
  on public.bora_engine_youtube_snapshot_history
    (song_id, video_id, retrieved_at desc);

create function public.bora_engine_validate_youtube_snapshot_revision()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_parent_version integer;
  v_parent_retrieved_at timestamptz;
begin
  if new.supersedes_snapshot_id is null then
    if new.version <> 0 or new.source_status <> 'OBSERVED' then
      raise exception
        'BORA_YOUTUBE_SNAPSHOT_REVISION_INVALID: root must be an observed version zero';
    end if;
    return new;
  end if;

  select version, retrieved_at
    into v_parent_version, v_parent_retrieved_at
  from public.bora_engine_youtube_snapshot_history
  where id = new.supersedes_snapshot_id
    and song_id = new.song_id
    and video_id = new.video_id;

  if not found
    or new.version <> v_parent_version + 1
    or new.retrieved_at <= v_parent_retrieved_at then
    raise exception
      'BORA_YOUTUBE_SNAPSHOT_REVISION_INVALID: revision must follow its matching parent';
  end if;

  return new;
end;
$$;

create function public.bora_engine_reject_youtube_snapshot_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception
    'BORA_YOUTUBE_SNAPSHOT_HISTORY_IMMUTABLE: append a revision instead';
end;
$$;

create trigger bora_engine_youtube_snapshot_revision
before insert
on public.bora_engine_youtube_snapshot_history
for each row
execute function public.bora_engine_validate_youtube_snapshot_revision();

create trigger bora_engine_youtube_snapshot_immutable
before update or delete
on public.bora_engine_youtube_snapshot_history
for each row
execute function public.bora_engine_reject_youtube_snapshot_mutation();

alter table public.bora_engine_youtube_snapshot_history
  enable row level security;

revoke all on table public.bora_engine_youtube_snapshot_history
  from public, anon, authenticated;
grant select, insert on table public.bora_engine_youtube_snapshot_history
  to service_role;

revoke execute on function
  public.bora_engine_validate_youtube_snapshot_revision()
from public, anon, authenticated;
revoke execute on function
  public.bora_engine_reject_youtube_snapshot_mutation()
from public, anon, authenticated;
