-- ============================================================
-- BORA ENGINE — DURABLE INPUTS, HOURLY PROCESSING, PUBLICATIONS
-- ============================================================
--
-- Forward-only, additive foundation. This migration does not alter `songs`,
-- `vote_events`, legacy vote functions, secure-voting functions, or existing
-- table permissions.
--
-- Repository evidence establishes `public.songs.id` as UUID through existing
-- foreign keys, but the base `songs` definition and legacy vote function are
-- outside the visible migration history. References below use only that
-- established UUID identity; no existing songs columns are assumed.
--
-- Engine contracts represented here:
--   EngineSong: lifecycle, K, persistent Kura, hourly buckets, seed hours,
--     and per-platform hourly observations.
--   rolloverHour: one committed run per closed hour, with per-song closed C
--     and the actual RolloverStep values retained for audit/replay prevention.
--   ChartEvaluationResult: one immutable publication header plus the active
--     EvaluatedSong values and the lifecycle of every chart input.
--
-- Empty history is represented by no child rows only after the source has
-- explicitly established that history is complete. A missing/unprocessed
-- parent/source must not be interpreted as a valid empty timeline by readers.
--
-- Hour values are integer epoch-hour indices supplied by the caller and
-- checked against event/observation timestamps where those are present.
-- Numeric zero is a valid measurement.
--
-- Song references use ON DELETE RESTRICT: Engine history and published
-- snapshots are retained; lifecycle changes to VAULT rather than deletion.
-- ============================================================

-- 1. Authoritative state carried between evaluations and rollovers.
create table public.bora_engine_song_state (
  song_id uuid primary key
    references public.songs(id) on delete restrict,

  lifecycle text not null
    check (lifecycle in ('ACTIVE', 'VAULT')),

  -- Store K as exact integer numeric; the Engine consumer must reject values
  -- that cannot be represented exactly by its JavaScript number contract.
  k numeric not null
    check (k >= 0 and k < 'Infinity'::numeric and k = trunc(k)),

  persistent_kura numeric not null
    check (persistent_kura >= 0 and persistent_kura < 'Infinity'::numeric),

  -- KuraState.lastDecayHour; guards a repeated commit of the same closed hour.
  last_decay_hour bigint,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Canonical accepted-vote event ledger and Engine's hourly bucket input.
--
-- Existing public.vote_events is usable only for votes that traversed the
-- optional secure-vote RPC. The default legacy path does not write that table,
-- so this table is an Engine ingestion boundary, not a claim that old votes
-- have been reconstructed. source_event_id identifies a source event on
-- re-ingestion; callers must not mint a new key for a retry.
create table public.bora_engine_vote_events (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null
    references public.songs(id) on delete restrict,
  source_system text not null
    check (source_system in ('secure_vote_events', 'legacy_vote_event')),
  source_event_id text not null
    check (btrim(source_event_id) <> ''),
  vote_type text not null
    check (vote_type in ('up', 'down')),
  hour_index bigint not null,
  occurred_at timestamptz not null,
  ingested_at timestamptz not null default now(),

  unique (source_system, source_event_id),
  check (
    hour_index = floor(extract(epoch from occurred_at) / 3600)::bigint
  )
);

create index bora_engine_vote_events_song_hour_idx
  on public.bora_engine_vote_events (song_id, hour_index);

create table public.bora_engine_vote_buckets (
  song_id uuid not null
    references public.songs(id) on delete restrict,
  hour_index bigint not null,
  upvotes numeric not null
    check (upvotes >= 0 and upvotes < 'Infinity'::numeric and upvotes = trunc(upvotes)),
  downvotes numeric not null
    check (downvotes >= 0 and downvotes < 'Infinity'::numeric and downvotes = trunc(downvotes)),
  phase text not null
    check (phase in ('OPEN', 'TRANSITION', 'CLOSED')),
  version numeric not null
    check (version >= 0 and version < 'Infinity'::numeric and version = trunc(version)),
  updated_at timestamptz not null default now(),

  primary key (song_id, hour_index)
);

-- Presence of a bucket with (0, 0) represents measured silence and is distinct
-- from no bucket row. Repeated source events are deduplicated before incrementing
-- these aggregates, using the unique source identity above.

-- 3. Timestamped platform observations. One authoritative value per song,
-- platform, and clock hour, matching the Engine's uniqueness contract.
create table public.bora_engine_platform_observations (
  song_id uuid not null
    references public.songs(id) on delete restrict,
  platform text not null
    check (platform in ('youtube', 'spotify', 'boomplay')),
  hour_index bigint not null,
  value numeric not null
    check (value >= 0 and value < 'Infinity'::numeric),
  source text not null
    check (source in ('IN_CHART', 'EXTERNAL')),
  lifecycle text not null
    check (lifecycle in ('ACTIVE', 'ARCHIVED')),
  version numeric not null
    check (version >= 0 and version < 'Infinity'::numeric and version = trunc(version)),
  source_system text not null,
  source_observation_id text not null
    check (btrim(source_observation_id) <> ''),
  observed_at timestamptz not null,
  ingested_at timestamptz not null default now(),

  primary key (song_id, platform, hour_index),
  unique (source_system, source_observation_id),
  check (
    hour_index = floor(extract(epoch from observed_at) / 3600)::bigint
  ),
  check (btrim(source_system) <> '')
);

create index bora_engine_platform_observations_window_idx
  on public.bora_engine_platform_observations (platform, hour_index, song_id);

-- Corrections/late arrival update the unique hourly observation with a higher
-- version. A missing row is not a zero measurement; value = 0 is explicit.

-- 4. Explicit seed-hour timeline. This table contains only SEED records;
-- actual C is derived from vote buckets. One seed per song/hour is sufficient
-- to satisfy the Engine's exact-hour lookup and duplicate-hour rejection.
create table public.bora_engine_seed_hours (
  song_id uuid not null
    references public.songs(id) on delete restrict,
  hour_index bigint not null,
  c numeric not null
    check (c >= 0 and c <= 2),
  source text not null default 'SEED'
    check (source = 'SEED'),
  lifecycle text not null
    check (lifecycle in ('ACTIVE', 'ARCHIVED')),
  version numeric not null
    check (version >= 0 and version < 'Infinity'::numeric and version = trunc(version)),
  origin_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (song_id, hour_index)
);

-- Completeness is separate from values. A COMPLETE row with no matching
-- bucket/observation/seed means the source was checked and had no record for
-- that hour; a missing, UNAVAILABLE, or FAILED row must not become zero.
create table public.bora_engine_hourly_input_coverage (
  song_id uuid not null
    references public.songs(id) on delete restrict,
  input_type text not null
    check (input_type in ('VOTES', 'YOUTUBE', 'SPOTIFY', 'BOOMPLAY', 'SEED')),
  hour_index bigint not null,
  status text not null
    check (status in ('COMPLETE', 'UNAVAILABLE', 'FAILED')),
  detail text,
  checked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (song_id, input_type, hour_index),
  check (status <> 'FAILED' or detail is not null)
);

-- 5. Durable hourly claim and per-song closure/rollover trace.
--
-- The primary key makes one canonical work item per closed hour. Workers claim
-- it with a transactional row lock / conditional status transition; expiry of
-- a processing lease makes interrupted work retryable. State updates, closure
-- rows, and completed status must commit in one transaction.
create table public.bora_engine_hourly_runs (
  closed_hour bigint primary key,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'failed', 'completed')),
  attempt_count integer not null default 0
    check (attempt_count >= 0),
  lease_token uuid,
  lease_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (status = 'processing' and lease_token is not null and lease_expires_at is not null)
    or
    (status <> 'processing' and lease_token is null and lease_expires_at is null)
  ),
  check ((status = 'completed') = (completed_at is not null))
);

create table public.bora_engine_hourly_closures (
  closed_hour bigint not null
    references public.bora_engine_hourly_runs(closed_hour) on delete restrict,
  song_id uuid not null
    references public.songs(id) on delete restrict,
  c numeric not null
    check (c >= 0 and c <= 2),
  c_source text not null
    check (c_source in ('ACTUAL', 'SEED', 'NONE')),
  source_bucket_version numeric
    check (
      source_bucket_version is null
      or (source_bucket_version >= 0
        and source_bucket_version < 'Infinity'::numeric
        and source_bucket_version = trunc(source_bucket_version))
    ),
  source_seed_version numeric
    check (
      source_seed_version is null
      or (source_seed_version >= 0
        and source_seed_version < 'Infinity'::numeric
        and source_seed_version = trunc(source_seed_version))
    ),
  fresh_injected numeric not null
    check (fresh_injected >= 0 and fresh_injected < 'Infinity'::numeric),
  decay_rate numeric not null
    check (decay_rate >= 0 and decay_rate <= 0.0025),
  persistent_before numeric not null
    check (persistent_before >= 0 and persistent_before < 'Infinity'::numeric),
  persistent_after numeric not null
    check (persistent_after >= 0 and persistent_after < 'Infinity'::numeric),
  processed_at timestamptz not null default now(),

  primary key (closed_hour, song_id),
  check (
    (c_source = 'ACTUAL'
      and source_bucket_version is not null
      and source_seed_version is null)
    or
    (c_source = 'SEED'
      and source_seed_version is not null
      and source_bucket_version is null)
    or
    (c_source = 'NONE'
      and source_bucket_version is null
      and source_seed_version is null)
  )
);

-- 6. Evaluation attempts, immutable complete publication snapshots, and the
--    single current-publication pointer. Failed attempts never update the
--    pointer. A publisher inserts the header and every entry, then updates the
--    pointer and marks the run published in one transaction.
create table public.bora_engine_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique
    check (btrim(request_key) <> ''),
  reference_hour bigint not null,
  status text not null default 'running'
    check (status in ('running', 'failed', 'published')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error_code text,
  error_message text,

  check ((status = 'running') = (finished_at is null)),
  check (
    (status = 'failed' and error_message is not null)
    or
    (status <> 'failed' and error_message is null and error_code is null)
  )
);

create index bora_engine_evaluation_runs_history_idx
  on public.bora_engine_evaluation_runs (reference_hour desc, started_at desc);

create table public.bora_engine_publications (
  id uuid primary key default gen_random_uuid(),
  evaluation_run_id uuid not null unique
    references public.bora_engine_evaluation_runs(id) on delete restrict,
  reference_hour bigint not null,
  total_active_c numeric not null
    check (total_active_c >= 0 and total_active_c < 'Infinity'::numeric),
  platform_total_youtube numeric not null
    check (platform_total_youtube >= 0 and platform_total_youtube <= 30),
  platform_total_spotify numeric not null
    check (platform_total_spotify >= 0 and platform_total_spotify <= 15),
  platform_total_boomplay numeric not null
    check (platform_total_boomplay >= 0 and platform_total_boomplay <= 5),
  published_at timestamptz not null default now()
);

create index bora_engine_publications_history_idx
  on public.bora_engine_publications (published_at desc, reference_hour desc);

create table public.bora_engine_publication_entries (
  publication_id uuid not null
    references public.bora_engine_publications(id) on delete restrict,
  song_id uuid not null
    references public.songs(id) on delete restrict,
  lifecycle text not null
    check (lifecycle in ('ACTIVE', 'VAULT')),

  -- The following fields are exactly Engine EvaluatedSong outputs. They are
  -- NULL only for VAULT rows, which evaluateChart excludes from active output.
  rank integer,
  active_c numeric,
  xp numeric,
  kura_fresh numeric,
  persistent_kura_before numeric,
  persistent_kura_next numeric,
  platform_youtube numeric,
  platform_spotify numeric,
  platform_boomplay numeric,
  bora_score numeric,

  primary key (publication_id, song_id),
  unique (publication_id, rank),
  check (
    (
      lifecycle = 'ACTIVE'
      and rank is not null and rank > 0
      and active_c is not null and active_c >= 0 and active_c < 'Infinity'::numeric
      and xp is not null and xp >= 0 and xp <= 1
      and kura_fresh is not null and kura_fresh >= 0 and kura_fresh < 'Infinity'::numeric
      and persistent_kura_before is not null
        and persistent_kura_before >= 0
        and persistent_kura_before < 'Infinity'::numeric
      and persistent_kura_next is not null
      and persistent_kura_next >= 0
      and persistent_kura_next < 'Infinity'::numeric
      and platform_youtube is not null and platform_youtube >= 0
        and platform_youtube <= 30
      and platform_spotify is not null and platform_spotify >= 0
        and platform_spotify <= 15
      and platform_boomplay is not null and platform_boomplay >= 0
        and platform_boomplay <= 5
      and bora_score is not null and bora_score >= 0
        and bora_score < 'Infinity'::numeric
    )
    or
    (
      lifecycle = 'VAULT'
      and rank is null
      and active_c is null
      and xp is null
      and kura_fresh is null
      and persistent_kura_before is null
      and persistent_kura_next is null
      and platform_youtube is null
      and platform_spotify is null
      and platform_boomplay is null
      and bora_score is null
    )
  )
);

create index bora_engine_publication_entries_song_idx
  on public.bora_engine_publication_entries (song_id, publication_id);

create table public.bora_engine_publication_head (
  singleton boolean primary key default true
    check (singleton),
  publication_id uuid
    references public.bora_engine_publications(id) on delete restrict,
  updated_at timestamptz not null default now()
);

insert into public.bora_engine_publication_head (singleton, publication_id)
values (true, null)
on conflict (singleton) do nothing;

-- Engine state/history/publication tables are private. Future trusted
-- server-side workers need an explicitly authorized write path; this migration
-- does not grant client access or create that worker/RPC.
alter table public.bora_engine_song_state enable row level security;
alter table public.bora_engine_vote_events enable row level security;
alter table public.bora_engine_vote_buckets enable row level security;
alter table public.bora_engine_platform_observations enable row level security;
alter table public.bora_engine_seed_hours enable row level security;
alter table public.bora_engine_hourly_input_coverage enable row level security;
alter table public.bora_engine_hourly_runs enable row level security;
alter table public.bora_engine_hourly_closures enable row level security;
alter table public.bora_engine_evaluation_runs enable row level security;
alter table public.bora_engine_publications enable row level security;
alter table public.bora_engine_publication_entries enable row level security;
alter table public.bora_engine_publication_head enable row level security;

revoke all on table
  public.bora_engine_song_state,
  public.bora_engine_vote_events,
  public.bora_engine_vote_buckets,
  public.bora_engine_platform_observations,
  public.bora_engine_seed_hours,
  public.bora_engine_hourly_input_coverage,
  public.bora_engine_hourly_runs,
  public.bora_engine_hourly_closures,
  public.bora_engine_evaluation_runs,
  public.bora_engine_publications,
  public.bora_engine_publication_entries,
  public.bora_engine_publication_head
from anon, authenticated;
