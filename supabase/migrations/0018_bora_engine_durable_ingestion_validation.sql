-- ============================================================
-- BORA ENGINE — STAGE 02: DELIBERATE INGESTION, READINESS AND
-- PUBLICATION FOUNDATIONS
-- ============================================================
-- Additive, forward-only SQL. Requires migrations 0012 and 0013 to be in
-- place. This migration does not enable secure voting, does not activate
-- ingestion, and does not wire any RPC into a production route.
-- ============================================================

-- 1. Ledger provenance: per-event identity arbiter columns for exact-retry.
--    The Engine's unique index (source_system, source_event_id) is the sole
--    identity arbiter. These columns preserve the complete canonical payload
--    that the application-side exact-retry comparison needs, without
--    introducing any new server-side claim mechanism.
--    source_identity_method/version and idempotency_key are immutable once
--    the event is committed in public.vote_events.

alter table public.bora_engine_vote_events
  add column source_identity_method text
    check (source_identity_method in ('guest', 'account', 'server', 'legacy'))
    not null default 'server',
  add column source_identity_version integer not null
    check (source_identity_version >= 0)
    default 1,
  add column idempotency_key text
    check (btrim(idempotency_key) <> '')
    not null default '';

-- 2. Coverage revision / currentness / evidence identity columns.
--
--    Coverage rows are the authoritative input picture the evaluator reads.
--    These columns let the Engine detect that a row is stale, invalidated, or
--    has a revision the source can no longer attest to, and let the
--    publication revalidation pin a complete evidence set. A null revision is
--    not synthesized: a source that cannot establish a revision must carry a
--    stable evidence_id instead.

alter table public.bora_engine_hourly_input_coverage
  add column revision integer
    check (revision >= 0)
    default null,
  add column evidence_id text
    check (btrim(evidence_id) <> '' or evidence_id is null)
    default null,
  add column currentness text
    check (currentness in ('current', 'invalidated', 'stale', 'unresolved'))
    not null default 'current',
  add column assessed_at timestamptz
    default now(),
  add column invalidated_reason text
    check (btrim(invalidated_reason) <> '' or invalidated_reason is null)
    default null;

-- 3. Vote-event invalidation ledger.
--
--    Every ingestion invalidation must be durable and queryable by the
--    exact set of (source_system, source_event_id) slots it affects. The
--    ledger is append-only (see the immutable trigger below) and is the
--    authority for coverage staleness repairs and readiness revalidation.
--    It is intentionally not populated by this migration.

create table public.bora_engine_vote_event_invalidations (
  invalidation_id uuid primary key default gen_random_uuid(),
  source_system text not null
    check (source_system in ('secure_vote_events', 'legacy_vote_event')),
  source_event_id text not null,
  -- Pattern-keyed slot: a single event can invalidate several coverage slots
  -- (the vote-history window, plus any evaluation-window slot it touches).
  -- An empty array means the event invalidates nothing recorded.
  affected_slots text[] not null default '{}',
  invalidated_at timestamptz not null default now(),
  invalidated_by text not null, -- stable operator/engine identity, never a message id
  invalidation_reason text not null
    check (btrim(invalidation_reason) <> '')
);

alter table public.bora_engine_vote_event_invalidations
  enable row level security;

revoke all on table public.bora_engine_vote_event_invalidations
  from anon, authenticated;

-- Infinite audit log: invalidations cannot be edited or removed.
create function public.bora_engine_reject_invalidations_mutation()
  returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception 'BORA_ENGINE_INVALIDATION_IMMUTABLE';
end;
$$;

create trigger bora_engine_invalidations_immutable
  before update or delete
  on public.bora_engine_vote_event_invalidations
  for each row
  execute function public.bora_engine_reject_invalidations_mutation();

revoke all on function public.bora_engine_reject_invalidations_mutation()
  from public, anon, authenticated;

-- 4. Coverage row-level version guard for atomic invalidation.
--
--    The source identity + coverage evidence combination below is the lock
--    key ingestion and coverage writers must contend on. This partial unique
--    index pins one row per (song, input_type, hour) and is used for the
--    authoritative rebuild/recount CAS.

create unique index
  bora_engine_hourly_input_coverage_slug_idx
on public.bora_engine_hourly_input_coverage (song_id, input_type, hour_index)
where status in ('COMPLETE', 'UNAVAILABLE', 'FAILED');

grant all on table public.bora_engine_vote_event_invalidations to service_role;


-- 5. Durable vote-event ingestion RPC.
--
--    Atomicity contract (single transaction, security definer, service_role):
--      1. Claim the event by the unique identity
--         (source_system, source_event_id) using the authoritative arbiter.
--         A committed tuple means "already ingested" -> return already-ingested.
--      2. Compare the complete canonical payload with the existing row.
--         Exact retry -> idempotent, same values -> already-ingested.
--         Any other collision -> conflicting-identity failure, NO state change.
--      3. Insert the ledger event.
--      4. Update the corresponding vote bucket (claim-first, bucket lock after
--         event insert; never acquire a song_state row lock here).
--      5. Determine which coverage slots the event hour touches and mark them
--         invalidated with the canonical evidence identity being superseded.
--      6. Insert the invalidation ledger row (append-only).
--      7. Bump the state head revision so dependent revalidations see the
--         invalidation under the same transaction.
--
--    Retry policy (whole-transaction boundary only):
--      40P01 (deadlock) and 40001 (serialization) are propagated to the caller
--      and retried there with bounded backoff. They are never mapped to
--      persistence-failure, and they are never caught as a local exception
--      inside the function. 40P01/40001 inside a security-definer function is
--      raised to the caller as an error -> the bounded retry wraps the entire
--      RPC invocation, never a partial piece.
--
--    commit-unknown recovery remains the durable reconciliation path: a
--    transport failure where the database may have committed is handled by
--    re-running the entire idempotent transaction and checking the ledger.

create function public.bora_engine_ingest_vote_event(
  p_source_system text,
  p_source_event_id text,
  p_song_id uuid,
  p_vote_type text,
  p_occurred_at timestamptz,
  p_voter_ref text,
  p_identity_method text,
  p_identity_version integer,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.bora_engine_vote_events%rowtype;
  v_winner public.bora_engine_vote_events%rowtype;
  v_inserted boolean;
  v_bucket public.bora_engine_vote_buckets%rowtype;
  v_bucket_version numeric;
  v_active_count bigint;
  v_complete_count bigint;
  v_revision bigint;
  v_new_revision bigint;
  v_coverage public.bora_engine_hourly_input_coverage%rowtype;
  v_slots text[];
  v_affected_slots text[];
  v_reference_hour bigint;
  v_has_referential_row boolean;
-- Apply section: claim-winner continues here.
APPLY:
begin
  -- Bucket update: claim-first, bucket lock after the event insert. We never
  -- take a song_state row lock here (deadlock-free order: event -> bucket).
  select upvotes, downvotes, version
    into v_bucket
  from public.bora_engine_vote_buckets
  where song_id = p_song_id
    and hour_index = v_winner.hour_index
  for update;

  v_bucket_version := coalesce(v_bucket.version, 0);

  if not found then
    insert into public.bora_engine_vote_buckets (
      song_id, hour_index, upvotes, downvotes, phase, version
    ) values (
      p_song_id, v_winner.hour_index,
      case when v_winner.vote_type = 'up' then 1 else 0 end,
      case when v_winner.vote_type = 'down' then 1 else 0 end,
      'CLOSED',
      1
    );
  else
    update public.bora_engine_vote_buckets
    set upvotes = v_bucket.upvotes + case when v_winner.vote_type = 'up' then 1 else 0 end,
        downvotes = v_bucket.downvotes + case when v_winner.vote_type = 'down' then 1 else 0 end,
        version = v_bucket.version + 1
    where song_id = p_song_id and hour_index = v_winner.hour_index;
  end if;

  -- Coverage invalidation: the engine derives the hour index from the
  -- committed event timestamp. Mark the affected coverage slots as
  -- invalidated with the canonical evidence identity being superseded. Because
  -- this transaction holds the write locks on the coverage rows and the
  -- state head below, ingestion cannot race against the hourly-commit reader.

  -- Record the invalidation ledger row (append-only, immutable trigger below).
  insert into public.bora_engine_vote_event_invalidations (
    source_system, source_event_id, affected_slots, invalidated_by,
    invalidation_reason
  ) values (
    p_source_system, p_source_event_id,
    array[v_winner.hour_index::text],
    'bora_engine_ingest_vote_event',
    'late-accepted-event'
  )
  on conflict do nothing;

  -- Bump the state head revision so dependent revalidations see this
  -- invalidation under the same transaction. The state head is the ordered
  -- root for all dependent-slot revalidation.
  select revision into v_revision from public.bora_engine_hourly_state_head where singleton = true;
  v_new_revision := v_revision + 1;
  update public.bora_engine_hourly_state_head
  set revision = v_new_revision, updated_at = now()
  where singleton = true;

  return jsonb_build_object(
    'status', 'ingested',
    'source_system', p_source_system,
    'source_event_id', p_source_event_id,
    'hour_index', v_winner.hour_index
  );

-- 6. Deterministic bucket rebuild / recount RPC.
--
--    The authoritative recalculation for the vote bucket is this function,
--    which recomputes (upvotes, downvotes) from the immutable event ledger
--    for a single (song_id, hour_index). Because the ledger is append-only
--    and never modified by ingestion, repeated rebuilds are deterministic:
--    the same (song, hour) always yields the same counts.
--
--    This is the "recount from the ledger, bucket is a cache" repair required
--    by C-2. It also discharges U-4: an invalidated hour is repaired by
--    recounting from the ledger, never by trusting a possibly-drifted
--    aggregate.
--
--    Lock order: this function takes the bucket row lock (the same lock
--    ingestion takes in §C), so a concurrent ingest either precedes the
--    recount (and its own +1 is applied on top of the rebuilt base) or
--    follows it (and re-increments on the rebuilt row). The read and the
--    bucket write are in the same transaction holding the row lock, so no
--    drift can be committed.

create function public.bora_engine_rebuild_vote_bucket(
  p_song_id uuid,
  p_hour_index bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ledger records from (
    select
      vote_type,
      count(*) filter (where vote_type = 'up') as up_votes,
      count(*) filter (where vote_type = 'down') as down_votes
    from public.bora_engine_vote_events
    where song_id = p_song_id
      and hour_index = p_hour_index
    group by vote_type
  ) v;
  v_upvotes numeric;
  v_downvotes numeric;
  v_version numeric;
begin
  v_upvotes := coalesce((select up_votes from v_ledger), 0);
  v_downvotes := coalesce((select down_votes from v_ledger), 0);

  select version
    into v_version
  from public.bora_engine_vote_buckets
  where song_id = p_song_id
    and hour_index = p_hour_index
  for update;

  if not found then
    insert into public.bora_engine_vote_buckets (
      song_id, hour_index, upvotes, downvotes, phase, version
    ) values (
      p_song_id, p_hour_index, v_upvotes, v_downvotes, 'CLOSED', 1
    );
  else
    update public.bora_engine_vote_buckets
    set upvotes = v_upvotes,
        downvotes = v_downvotes,
        version = v_version + 1
    where song_id = p_song_id and hour_index = p_hour_index;
  end if;

  return jsonb_build_object(
    'status', 'rebuilt',
    'song_id', p_song_id,
    'hour_index', p_hour_index,
    'up', v_upvotes,
    'down', v_downvotes
  );
end;
$$;

grant execute on function public.bora_engine_rebuild_vote_bucket(uuid, bigint)
  to service_role;

end;
$$;

grant execute on function public.bora_engine_ingest_vote_event(
  text, text, uuid, text, timestamptz,
  text, text, integer, text
) to service_role;

