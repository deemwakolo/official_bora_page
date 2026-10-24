# BORA Engine Durable Vote Ingestion and Coverage Invalidation Design

**Status:** Design only — a reviewable transaction proposal. No application code,
migration, RPC, worker, or database state was created or changed to produce this
document.

**Scope.** This design specifies how BORA Engine accepts *already-accepted*
canonical secure-vote events into its historical data without duplicating events,
double-incrementing vote buckets, losing coverage invalidations, treating
incomplete history as checked-empty, leaving stale evaluation inputs eligible, or
misreporting an uncertain commit as a definite failure. It is grounded in the
current source, which is authoritative where it differs from earlier reports.

**Non-goals.** It does not activate ingestion, alter the live voting path, change
scoring/weights/windows/ranking, apply migrations, add RPCs or workers, or enable
publication. All migrations (`0012`–`0017`) are recorded as applied in the verified live Supabase migration history;
`0010`/`0011` describe the secure-vote source the design consumes but their
production status is a `[VERIFY]` item, not an assumption.

---

## A. Current-state findings

### A.1 What already exists (authoritative, from source)

| Concern | Where it lives | What it establishes |
| --- | --- | --- |
| Canonical event type | `lib/supabase/vote-event.ts` | `CanonicalAcceptedVoteEvent`: `sourceSystem`, `sourceEventId`, `songId`, `voteType`, `occurredAt`, `voterRef`, `identityMethod`, `identityVersion`, `idempotencyKey`. |
| Event→bucket mapper | `lib/bora-engine/vote-event.ts` | `mapAcceptedVoteEventToEngineInput` validates the canonical event, phase, committed timestamp, hour, and bucket, then `applyVote`. It **never deduplicates**; the comment states ingestion must enforce `(sourceSystem, sourceEventId)` uniqueness first. |
| Retry assessment (pure) | `lib/bora-engine/vote-event-ingestion.ts` | `assessVoteEventIngestionRetry` → `new-event` \| `already-ingested` \| `conflicting-identity` (`identity-mismatch` \| `payload-mismatch`). `canonicalPayloadMatches` compares **all nine** fields. Outcome union already includes `ingested`, `already-ingested`, `invalid-input`, `conflicting-identity`, `persistence-failure`, `commit-unknown`. |
| Coverage evidence contract | `lib/bora-engine/coverage-evidence.ts` | `CoverageEvidenceRecord` (kind, songId, period, expected/actual source identity, evidenceId, revision, assessedAt, outcome, currentness, reason); `assessCoverageEvidence` requires source-matched identity, revision **or** stable evidenceId, valid assessment time, and `currentness = 'current'`. `VoteHistoryInvalidation`, `doesVoteEventInvalidateCoverage`, `doesVoteEventInvalidateEvaluation` are defined. |
| Vote/seed history gate | `vote-event-ingestion.ts` `assessVoteSeedHistoryCoverage`; `source-readiness.ts` | Requires independent, authoritative evidence for each active song / input kind / UTC hour across the 72-hour C window (`H-71…H`). Missing rows → `missing`, never `checked-empty`. |
| Publication contract | `publication-transaction.ts`, `publication-gate.ts` | Pure request validation + retry disposition (`assessPublicationRetry`, `unknownPublicationCommit`), immutable snapshot + explicit pointer advancement. Unwired. |
| Secure-vote source | `lib/supabase/secure-vote.ts`, `supabase/migrations/0010` | `public.vote_events` rows carry `id`, `song_id`, `vote_type`, `voter_ref`, `identity_method`, `identity_version`, `idempotency_key`, `created_at`. `cast_vote_secure` is the only write boundary; duplicates surface as success, never a counter change. |
| Atomic hour ops | `supabase/migrations/0014` | `bora_engine_{hourly_snapshot,claim_hour,load_hour,release_hour,commit_hour}` — `security definer`, `service_role` only, lease/claim guarded. |

### A.2 The actual gaps the design must close

1. **No ingestion transaction exists.** Nothing inserts into
   `bora_engine_vote_events`, updates `bora_engine_vote_buckets` exactly once, or
   records coverage invalidation. `persistence.ts` exposes no ingest method.
2. **Event ledger lacks provenance.** `bora_engine_vote_events` (`0012`) stores
   only `song_id`, `source_system`, `source_event_id`, `vote_type`, `hour_index`,
   `occurred_at`. It does **not** store `voter_ref`, `identity_method`,
   `identity_version`, or `idempotency_key`, so `canonicalPayloadMatches` cannot
   compare the full payload against the stored row. The *source* (`0010`) has all
   four — they are available, not invented.
3. **Coverage is status-only.** `bora_engine_hourly_input_coverage` has
   `status`, `detail`, `checked_at`, `updated_at` only. It has **no**
   source identity, revision, evidence id, currentness, or invalidation link.
   `assessCoverageEvidence` therefore always fails closed against it. `persistence.ts`
   already refuses to trust status-only rows (`historyCheck` forces not-ready
   unless independently sourced evidence + authority are supplied).
4. **No invalidation history.** `VoteHistoryInvalidation` is a type only; no
   table records which event invalidated which evidence/revision/hour.
5. **Stale-input detection is not durable.** Nothing flips a coverage row to
   `invalidated`/`stale`, so only the in-memory gate prevents a stale evaluation
   from qualifying.
6. **Seed authority is undefined.** Seeds are written as phase `SEED` by
   `commit_hour`; there is no independent source identity/revision for seed
   coverage evidence.
7. **Bootstrap count mismatch.** `0015` requires `active × 506`
   (VOTES + SEED at the reference hour = 2, plus 3 × 168 platform = 504), whereas
   evaluation-complete history is `active × 648` (72 vote + 72 seed + 3 × 168
   platform). The 142-record shortfall per song means bootstrap can pass while the
   evaluation gate is still `not-ready`.
8. **Readiness is single-hour/status-only.** `0016` reports status across a
   window but carries no evidence identity/currentness, so it cannot certify the
   72-hour evidence identity the gate demands.

## B. Proposed transaction sequence

One stored procedure, `bora_engine_ingest_vote_event`, executed only under the
service-role path (see §G). It performs **event insertion, exactly-once bucket
update, and coverage-invalidation recording inside a single database
transaction** so a partial commit is impossible. The sequence reuses the existing
pure helpers rather than reimplementing their rules in SQL.

```
FUNCTION bora_engine_ingest_vote_event(p_event jsonb, p_reconcile boolean)
  AUTH: require auth.role() = 'service_role' else raise BORA_ENGINE_WORKER_REQUIRED

  -- 1. Trusted validation (mirrors VoteEventIngestionValidation)
  v_canonical := validate_canonical_secure_vote_event(p_event)
    -- sourceSystem == 'secure_vote_events'
    -- sourceEventId / songId are UUIDs; voteType in ('up','down')
    -- occurredAt is a committed UTC timestamp; voterRef UUID; identityMethod
    --   in ('guest','account'); identityVersion positive int; idempotencyKey UUID
    -- hour_index := floor(epoch_ms(occurredAt) / 3600)   <-- derived from
    --   ORIGINAL committed timestamp, never ingestion time (now())
  IF NOT v_canonical THEN
    RETURN {'status':'invalid-input', reasons:[...]}   -- deterministic, no writes

  -- 2. Row lock on the song (serializes same-song ingestions; see §E)
  PERFORM 1 FROM bora_engine_song_state WHERE song_id = v_canonical.songId FOR UPDATE;
  IF NOT FOUND THEN
    RETURN {'status':'invalid-input', reasons:['unknown-song']}  -- or 'not-bootstrap'

  -- 3. Stable-identity lookup + exact-retry / conflict assessment (see §C)
  SELECT * INTO v_existing
    FROM bora_engine_vote_events
    WHERE source_system = 'secure_vote_events'
      AND source_event_id = v_canonical.sourceEventId
    FOR UPDATE;                                   -- lock the identity slot

  IF v_existing IS NOT NULL THEN
    IF payload_matches(v_existing, v_canonical) THEN   -- all canonical fields
      -- Exact retry: event already persisted. Do NOT insert, do NOT increment,
      -- do NOT re-invalidate. Return deterministic result.
      RETURN {'status':'already-ingested',
              'sourceEventId': v_canonical.sourceEventId}
    ELSE
      -- Same identity, different payload: fail closed.
      RAISE BORA_ENGINE_EVENT_IDENTITY_CONFLICT;   -- rolls back (known rollback)
    END IF
  END IF

  -- 4. Immutable event persistence (append-only; provenance retained)
  INSERT INTO bora_engine_vote_events (
    song_id, source_system, source_event_id, vote_type, hour_index, occurred_at,
    voter_ref, identity_method, identity_version, idempotency_key)
  VALUES (...) ;                                   -- unique(source_system,
                                                   --   source_event_id) is the
                                                   --   backstop against races

  -- 5. Exactly-once historical bucket update at the event's hour
  INSERT INTO bora_engine_vote_buckets (song_id, hour_index, upvotes, downvotes,
                                        phase, version)
  VALUES (songId, hourIndex,
          up = 1, down = 0 or vice versa,
          phase_for(hourIndex, now()),
          0)
  ON CONFLICT (song_id, hour_index) DO UPDATE
      SET upvotes   = bora_engine_vote_buckets.upvotes   + excluded.upvotes,
          downvotes = bora_engine_vote_buckets.downvotes + excluded.downvotes,
          version   = bora_engine_vote_buckets.version + 1
      -- one +1 per newly inserted event; exact retry never reaches here (§C)

  -- 6. Coverage-invalidation recording, same transaction (see §D)
  --   a. Upsert the invalidation marker for (songId,'vote-history',hourIndex).
  --   b. Mark any current vote-history coverage for that slot invalidated,
  --      superseding the prior evidence; do NOT invent a revision.
  INSERT INTO bora_engine_vote_coverage_invalidation (
      song_id, hour_index, source_system, source_event_id, invalidates_revision,
      invalidated_at)
    VALUES (...) ;                                -- first event in this hour;
                                                   --  later events append only

  -- 7. Deterministic result for a NEW event.
  RETURN {'status':'ingested',
          'sourceEventId': v_canonical.sourceEventId,
          'eventHour': hourIndex,
          'coverageInvalidated': true}
EXCEPTION
  WHEN unique_violation ON bora_engine_vote_events THEN
    -- Concurrent duplicate lost the insert race. Re-read committed row and
    -- resolve as already-ingested or identity-conflict (never re-insert).
    RETURN resolve_identity_collision(...);        -- see §E
  WHEN others THEN
    -- Known rollback: nothing committed. Caller records persistence-failure.
    RAISE;                                         -- commit-unknown is NOT raised
                                                   --  from here (§E)
```

**Why one transaction.** Event insert (step 4), bucket update (step 5), and
invalidation recording (step 6) commit atomically. A crash or known rollback
undoes all three together, so there is no window where an event exists without
its bucket increment, or a bucket is incremented without its invalidation. This
directly answers the requirement not to treat invalidation as a best-effort
operation after persistence.

**Trusted validation.** Steps 1–2 revalidate everything `mapAcceptedVoteEventToEngineInput`
would check, in the trusted context. The client never supplies `hour_index`,
`phase`, counters, or `revision`; the server derives them.

## C. Canonical event identity and exact-retry rules

**Identity.** `(sourceSystem, sourceEventId)` where `sourceSystem` is fixed to
`'secure_vote_events'` and `sourceEventId = vote_events.id` (the source row's
UUID). This is already the documented stable identity in `lib/supabase/vote-event.ts`,
the `vote-event.ts` mapper comment, and the `0012` unique constraint. No new key
is minted for a retry.

**Exact retry.** An event is an exact retry iff an existing
`bora_engine_vote_events` row matches on identity **and** on the complete
canonical payload plus available provenance. `payload_matches` compares, field by
field, exactly what `assessVoteEventIngestionRetry.canonicalPayloadMatches`
compares today:

| Field | Required? | Source | On mismatch |
| --- | --- | --- | --- |
| `sourceSystem` | required | fixed | `identity-mismatch` |
| `sourceEventId` | required | `vote_events.id` | `identity-mismatch` (different row) |
| `songId` | required | `vote_events.song_id` | `payload-mismatch` → `conflicting-identity` |
| `voteType` | required | `vote_events.vote_type` | `payload-mismatch` → `conflicting-identity` |
| `occurredAt` | required | `vote_events.created_at` | `payload-mismatch` → `conflicting-identity` |
| `voterRef` | required | `vote_events.voter_ref` | `payload-mismatch` |
| `identityMethod` | required | `vote_events.identity_method` | `payload-mismatch` |
| `identityVersion` | required | `vote_events.identity_version` | `payload-mismatch` |
| `idempotencyKey` | required | `vote_events.idempotency_key` | `payload-mismatch` |

Every one of these is present in the trusted source (`0010`), so **none is
invented**. They are simply not yet copied into the Engine ledger — the single
schema gap that blocks exact-retry comparison today (§F.1).

**Required vs legitimately unavailable provenance.** All nine fields above are
required and available for the `secure_vote_events` source. What is *legitimately
unavailable* and must be stored as null rather than fabricated:

- `sourceRevision` / `sourceSnapshotVersion` — the secure-vote RPC publishes no
  monotonic source revision; store null, never synthesize.
- A voter-independent "identity-method version" distinct from
  `vote_events.identity_version` — only the integer already recorded is used.
- Any historical timestamp other than `vote_events.created_at`. Ingestion time
  (`now()`) is recorded separately as `ingested_at` and is **never** used to
  derive the event hour.

**Deterministic results.** The transaction returns exactly one of:
`ingested` (new row committed), `already-ingested` (exact retry, no writes),
`invalid-input` (validation failed, no writes), `conflicting-identity` (known
rollback via raised exception), `persistence-failure` (known rollback),
`commit-unknown` (only when a transport/commit outcome is genuinely ambiguous,
§E). There is no "maybe incremented" result.

## D. Coverage-invalidation and dependent-window rules

**Event hour H.** H = `floor(epoch_ms(occurredAt)/3600)`, derived from the
original committed timestamp. A late event keeps its original hour; it is never
re-bucketed to ingestion time.

**Direct invalidation (same transaction).** For the pair
`(songId, 'vote-history', H)` the transaction:

1. Marks any `current` vote-history coverage for that slot as `invalidated`,
   carrying forward the superseded evidence's identity (`invalidatesRevision`,
   `invalidatesEvidenceId`) exactly as `VoteHistoryInvalidation` describes. If no
   prior evidence exists, those fields are null — not zero.
2. Records the invalidation in `bora_engine_vote_coverage_invalidation` so the
   fact is durable and independently auditable, not a transient flag on the
   coverage row.
3. Sets the slot's coverage to **not current**. A missing/invalidated slot is
   never `checked-empty`: only a successful, authoritative *check* can produce
   `checked-empty` (§5 contract). The design therefore cannot silently convert a
   late event into "zero votes."

**Dependent 72-hour windows.** An event in hour H affects every evaluation
window `[R-71, R]` with `R-71 ≤ H ≤ R`, i.e. every reference hour
`R ∈ [H, H+71]`. This is precisely `doesVoteEventInvalidateEvaluation`'s rule.
For each such `R`:

- Any evaluation snapshot whose vote-history evidence for `songId` spans H is now
  based on stale evidence and must not qualify as ready.
- Requalification requires the vote-history coverage for `(songId, 'vote-history',
  H)` to be **reconciled** — re-assessed with a successful authoritative check and
  a current evidence record — before any evaluation at those `R` becomes eligible
  again.

**Platform windows are unaffected.** Vote events invalidate only `vote-history`
evidence (`doesVoteEventInvalidateCoverage` returns false for other kinds), so
the 168-hour platform window and the independent seed window are untouched. Vote
and seed coverage remain independent inputs, isolated by song + input kind + UTC
hour.

**Immutable published history.** Nothing here rewrites a published snapshot.
A previously published chart stays immutable history; the invalidation only
prevents *future* evaluations from consuming stale inputs.

**Exact retries skip invalidation.** Because an exact retry returns
`already-ingested` at step 3 before any write, it does not re-insert the
invalidation marker, does not bump a bucket, and does not re-flip currentness.
Multiple distinct events landing in the same hour each append their own
invalidation marker (append-only), but the *coverage slot* is simply marked
not-current; the count of markers is an audit trail, not a multiplier.

**Conflicting identity fails closed.** A payload mismatch raises
`conflicting-identity`, rolling back the whole transaction — no event, no bucket
change, no invalidation. The operator is alerted; the slot is not silently
overwritten.

## 5. Evidence and revision model

The design uses the **existing shared contract** in `coverage-evidence.ts`
unchanged. Each persisted vote-history evidence record is a
`CoverageEvidenceRecord` with:

- **Identity:** `kind = 'vote-history'`, `songId`, `period = {kind:'hour', hourIndex}`.
- **Attribution:** `expectedSourceIdentity` (supplied independently of the row)
  must equal the row's `sourceIdentity`. For vote history the stable
  `sourceIdentity` is `'secure_vote_events'` — the same string already used as
  `sourceSystem` — so coverage is independently attributable to the expected
  source rather than self-asserted.
- **Revision:** a durable monotonic integer bumped only when a reconciliation
  re-checks the hour. It is **not** fabricated: when the source cannot establish
  a revision, the record relies on a stable `evidenceId` (UUID) and `revision` is
  null — matching the `revision === null && !evidenceId` →
  `evidence-identity-missing` guard in `assessCoverageEvidence`.
- **Assessment time:** `assessedAt`, the UTC time of the authoritative check.
- **Currentness:** `currentness ∈ {current, invalidated, stale, unresolved}`. A
  late event sets `invalidated`; until reconciliation it cannot be `current`, so
  `assessCoverageEvidence` returns `history-changed` and the slot is not usable.
- **Outcome:** only a successful authoritative check may set `complete` or
  `checked-empty`. Missing rows yield `missing` in the gap list — never
  `checked-empty`.

**How comparisons work.** `assessCoverageEvidence(coverage, expected)` already
compares: (a) kind/song/period equality, (b) `expectedSourceIdentity ==
sourceIdentity`, (c) revision equality when expected (`revision-mismatch`) plus
optional evidenceId equality, (d) `currentness === 'current'`, and (e) an
interpretable `assessedAt`. The ingestion design only ensures the persisted rows
carry the fields those comparisons need (§F).

**Vote vs seed independence.** Vote events write only `vote-history` evidence.
Seed history is produced by its own authoritative check (the rollover's seed
injection recorded in `bora_engine_seed_hours`); neither can satisfy the other.
`assessVoteSeedHistoryCoverage` already requires both independently.

**Complete H-71…H vote/seed and H-167…H platform evidence.** For reference hour R,
readiness requires vote-history current for every hour in `[R-71, R]` (72),
seed-history current for `[R-71, R]` (72), and platform evidence current for
youtube/spotify/boomplay across `[R-167, R]` (3 × 168). These windows are **not
redesigned**; they are the existing `C_WINDOW_HOURS` (72) and
`PLATFORM_WINDOW_HOURS` (168). The design's only job is to make persisted
evidence carry identity/revision/currentness so these checks can pass.

**Late events cannot leave coverage current.** Because invalidation is recorded in
the same transaction as the event (§D), there is no ordering in which a late event
is present in a bucket while the affected coverage slot still reads `current`. A
reader that sees the bucket increment also sees the not-current coverage.

## E. Concurrency and unknown-commit recovery

All correctness relies on **database guarantees** (unique constraints, row locks),
never on in-process locks or application memory.

- **Two workers ingest the same event concurrently.** Both validate, then both
  attempt the insert guarded by `unique (source_system, source_event_id)`. One
  wins and commits (bucket +1 once, invalidation recorded). The loser's insert
  raises `unique_violation`; the handler re-reads the committed row, finds an exact
  payload match, and returns `already-ingested` **without** a second increment.
- **Two different events in the same song-hour.** The transaction takes
  `SELECT ... FOR UPDATE` on `bora_engine_song_state` (and the target bucket row),
  so the two increments serialize. Each distinct `source_event_id` is its own row
  and its own `+1`; there is no lost update because the second transaction blocks
  on the lock and then reads the committed counter.
- **Late event while an evaluation is being prepared.** Ingestion commits event +
  bucket + invalidation atomically. The publication path (§9) re-checks that every
  required coverage record is `current` *after* loading and *before* the snapshot
  commit; because invalidation flips currentness in the same commit as the event, a
  publication that began before the event observes the not-current coverage on its
  pre-commit recheck and refuses to publish.
- **Event arriving while rollover processes a closed hour.** Rollover (0014) holds
  a lease and the `bora_engine_hourly_runs` row for that hour. An ingestion for
  that hour blocks on the song-state/bucket lock, then applies to the bucket. The
  design does **not** roll the hour forward or rewrite closure state; a late event
  for an already-closed hour records its invalidation and leaves the closure
  snapshot immutable. Whether a closed hour may accept further bucket updates is an
  **unresolved decision** (§U-3).
- **Transaction retries after known rollback.** A raised exception (validation,
  identity conflict, constraint, lease conflict) rolls back all three writes. The
  caller may safely retry with the **same** identity and payload; the retry
  re-enters step 3 and either finds no committed row (retry the insert) or an exact
  match (`already-ingested`). A known rollback is reported as
  `persistence-failure` or the specific conflict, never as success.
- **Connection loss / timeout after possible commit.** The client cannot tell
  whether the transaction committed. This is **not** a failure; it is reported as
  `commit-unknown` carrying the `sourceEventId` (mirroring
  `unknownPublicationCommit`). The caller must reconcile before any retry.
- **Reconciliation after unknown commit.** The reconciler re-reads
  `bora_engine_vote_events` for `(sourceSystem, sourceEventId)` and, if present,
  compares the **full canonical payload**:
  - row present + payload matches → the commit happened; report `already-ingested`
    (the bucket was incremented exactly once by that commit). Do **not** re-run the
    increment.
  - row present + payload differs → `conflicting-identity`, fail closed.
  - row absent → the commit did not occur; retry the transaction with the same
    identity. The unique constraint still guards a concurrent commit racing the
    retry.
  Reconciliation never blindly retries the bucket increment; it first establishes
  whether the original identity already committed.

## 7. Schema gap analysis

Compared against the **actual schema** (migrations `0012`, `0014`, `0015`,
`0016`, `0017`). These migrations are recorded as applied in the verified live Supabase migration history; nothing here claims they already enforce a guarantee.

| Requirement | Draft schema today | Gap |
| --- | --- | --- |
| Voter/provenance in Engine ledger | `bora_engine_vote_events` has song, source_system, source_event_id, vote_type, hour_index, occurred_at, ingested_at. **No** `voter_ref`, `identity_method`, `identity_version`, `idempotency_key`. | Exact-retry payload comparison is impossible against the stored row. Must add the four provenance columns (they exist in source `0010`). |
| Event deduplication | `unique (source_system, source_event_id)` exists. | **Adequate.** Serves as the race backstop; no change needed for identity uniqueness. |
| Exactly-once bucket update | `bora_engine_vote_buckets` PK `(song_id, hour_index)` with `version`, `phase`, counters; `0014 commit_hour` writes buckets wholesale from rollover. | No incremental `+1 … ON CONFLICT` path; no ingestion RPC. Rollover `commit_hour` *overwrites* counters from in-memory rollover state rather than incrementing per event, so it cannot be reused for ingestion. A dedicated ingest writer is required. |
| Coverage identity & revision | `bora_engine_hourly_input_coverage` has status/detail/checked_at only. | **Missing** `source_identity`, `revision`/`evidence_id`, `assessed_at`, `currentness`. Without them `assessCoverageEvidence` always fails closed. |
| Coverage invalidation history | None. | **Missing** `bora_engine_vote_coverage_invalidation` (append-only) and a durable currentness field. |
| Stale evaluation detection | Only the in-memory `assessCoverageEvidence` check. | No durable `currentness` the DB can assert; add the field and enforce `currentness='current'` in readiness. |
| Seed-history authority | `bora_engine_seed_hours` written by `commit_hour` with phase. | No independent source identity/revision for seed evidence. Add seed evidence authority (see §F.6). |
| Status-only hourly coverage | 0016 readiness reports status counts across a window. | Status cannot express identity/revision/currentness; readiness must read the enriched evidence rows. |
| Bootstrap count | 0015 requires `active × 506` (vote+seed at ref hour = 2, plus 3×168 = 504). | **Mismatch:** evaluation-complete history is `active × 648` (72 vote + 72 seed + 3×168 platform). The 142/song shortfall lets bootstrap pass while evaluation is still not-ready. |

**Explicit non-claims.** The existing schema does **not** currently enforce:
per-event exactly-once bucket increments, payload-level retry comparison,
coverage currentness, invalidation durability, or stale-evaluation blocking at
the database. Those are the guarantees this design adds (§F).

## G. Security and authorization boundary

- **Trusted server-side verification.** The ingestion RPC mirrors the
  `security definer`, fixed `search_path = public, pg_temp`, fully-qualified
  references, and `if coalesce(auth.role(),'') <> 'service_role' then raise
  BORA_ENGINE_WORKER_REQUIRED` pattern used by `0014`/`0015`/`0016`.
- **Service-role-only.** `bora_engine_ingest_vote_event` is granted to
  `service_role`; execute is revoked from `public`, `anon`, and `authenticated`.
  All Engine tables already have RLS enabled and `revoke ... from anon,
  authenticated` (0012), so no client path can insert accepted Engine events.
- **No service-role key in browser code.** `persistence.ts` reads
  `BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY` server-side only and is `import
  'server-only'`. The browser continues to use the anon key for the existing
  secure-vote path.
- **No trust in client provenance.** The RPC derives `voter_ref`,
  `identity_method`, `identity_version` from the trusted source row
  (`vote_events`), not from any client payload. It never accepts counters, hour,
  or phase from a caller.
- **No unauthorized direct insert.** There is no `anon`/`authenticated` grant on
  the Engine ledger and no RPC reachable by them; the only write boundary is the
  service-role RPC.
- **No legacy fallback.** Secure ingestion failure returns
  `persistence-failure`/`commit-unknown`. It never falls back to legacy aggregate
  counters (`handle_song_vote`), which would double-count or fabricate history.
- **Feature flag unchanged.** `NEXT_PUBLIC_BORA_SECURE_VOTING` remains off; this
  design does not touch the flag or the live voting path.
- **Data minimization.** The ledger stores only the opaque `voter_ref` (a UUID
  `auth.uid()`), method, and version — no PII, no email/phone/IP. Logs record
  `sourceEventId` and status only; secrets and raw provenance payloads are never
  logged.

## F. Minimum schema changes required

Described only — **no migration is created or edited by this design**. Each is
forward-only and additive.

1. **Provenance columns on `bora_engine_vote_events`.** Add nullable
   `voter_ref uuid`, `identity_method text`, `identity_version integer`,
   `idempotency_key uuid`. Nullable so a source lacking them does not block
   ingestion; populated from `vote_events` for the secure source. Enables
   `payload_matches` on the stored row.
2. **Enrich `bora_engine_hourly_input_coverage`** with `source_identity text`,
   `revision bigint`, `evidence_id uuid`, `assessed_at timestamptz`,
   `currentness text check (currentness in ('current','invalidated','stale','unresolved'))`.
   `currentness` defaults to `'unresolved'`; only an authoritative check sets
   `'current'`.
3. **New `bora_engine_vote_coverage_invalidation`** (append-only, immutable via
   trigger like `0013`/`0017`): `song_id`, `hour_index`, `source_system`,
   `source_event_id`, `invalidates_revision`, `invalidates_evidence_id`,
   `invalidated_at`; `unique (source_system, source_event_id)` so an exact retry
   cannot append a second invalidation.
4. **New ingest RPC `bora_engine_ingest_vote_event`** (§B), `security definer`,
   `service_role` only. Performs insert + exactly-once bucket increment +
   invalidation in one transaction.
5. **Exactly-once bucket guard.** The bucket `INSERT … ON CONFLICT DO UPDATE`
   relies on the event insert having succeeded first in the same transaction; no
   separate counter table is needed. Optionally add a `last_source_event_id` on the
   bucket row to make the single-event provenance explicit for audit.
6. **Seed-history authority.** Add a `source_identity`/`revision` (or stable
   `evidence_id`) to the seed evidence path so seed coverage is independently
   attributable, mirroring vote-history. The seed's authority is the rollover
   closure (`bora_engine_hourly_closures` snapshot hash/revision), not a
   client-supplied value.
7. **Readiness reads enriched evidence.** Update `0016` to report
   `currentness='current'` with matching identity/revision, not just `status`.
8. **Align bootstrap count.** Change the `0015` `× 506` constant to the
   evaluation-complete `× 648` (72 vote + 72 seed + 3×168), or gate bootstrap on a
   full 72-hour vote/seed coverage check, so bootstrap cannot pass while the
   evaluation gate is not-ready.

## H. Relationship to rollover and publication

**Ingestion does not publish.** A successful ingestion transaction changes only
Engine historical inputs (event ledger, bucket, coverage currentness). It writes
no publication row, no entry, and does not advance `bora_engine_publication_head`.
A chart is published only by the separate publication transaction.

**Rollover remains separate.** `runHourlyRollover` claims a closed hour (lease +
`bora_engine_hourly_runs`), loads state/coverage, calls `rolloverHour`, and
commits state via `bora_engine_commit_hour`. Ingestion is orthogonal: it can run
for any hour, including the open hour, and does not claim a lease. The design does
not change rollover; it only guarantees that when rollover later reads a
song-hour's vote coverage, a late event has already marked that slot not-current.

**Required future publication boundary (described, not implemented).** A
publication attempt must, before atomically recording an immutable snapshot and
advancing the pointer, **recheck** that every evaluation input and its revision is
`current` inside the same transaction:

1. Lock/read `bora_engine_hourly_state_head` for the expected `revision` +
   `referenceHour` (as `PublicationTransactionRequest.expectedState` already
   specifies).
2. Re-verify each required vote/seed/platform coverage record is `current` with
   matching `source_identity` + `revision`/`evidence_id` (the `assessCoverageEvidence`
   contract). Any `invalidated`/`stale` record → `not-ready`, no write.
3. Only if all rechecks pass: insert the publication header + entries
   (immutable), then advance `bora_engine_publication_head` by explicit pointer
   update guarded by `expectedCurrentPublication`.

Because step 2 runs in the same transaction as the snapshot write, a late event
committed concurrently forces step 2 to fail closed; there is no window where a
snapshot is recorded from inputs that were invalidated mid-transaction. The
`expectedState.revision` compare-and-set (already in
`publication-transaction.ts`) additionally blocks publishing from a stale state
head.

## I. Failure scenarios and expected outcomes

| Scenario | Transaction behavior | Deterministic result | Side effects |
| --- | --- | --- | --- |
| New, valid event | Insert + bucket +1 + invalidation | `ingested` | Event, bucket increment, invalidation committed together. |
| Exact retry (same identity, same payload) | Returns at step 3, no writes | `already-ingested` | **No** second bucket increment, **no** second invalidation. |
| Same identity, different payload | Raise identity conflict | `conflicting-identity` (known rollback) | Nothing committed; alert raised. |
| Invalid input (bad UUID, bad timestamp, unknown vote type) | Validation fails before writes | `invalid-input` | Nothing written. |
| Bucket/coverage constraint violation | Raise → rollback | `persistence-failure` | Nothing committed; safe to retry same identity. |
| Unknown song / not bootstrapped | Song lock not found | `invalid-input` / `not-bootstrapped` | Nothing written. |
| Connection lost after send (may have committed) | Outcome unknown | `commit-unknown` | Caller reconciles by identity+payload (§E) before any retry. |
| Concurrent duplicate (unique race) | Loser re-reads committed row | `already-ingested` | One increment total. |
| Late event after hour closed | Bucket + invalidation; closure snapshot untouched | `ingested` + coverage not-current | Affected 72h windows blocked until reconciled; published history immutable. |

The outcomes map 1:1 to the existing `VoteEventIngestionOutcome` union, so no new
client-side result vocabulary is required.

## J. Phased implementation proposal (prerequisites + approval gates)

**Phase J1 — Schema groundwork.** Add §F.1 (provenance columns), §F.2 (coverage
enrichment), §F.3 (invalidation table). *Prerequisite:* confirm `0010` is applied
in the target environment and `vote_events` carries the provenance columns.
**Approval gate:** schema review; confirm forward-only additive statements do not
touch existing tables' semantics.

**Phase J2 — Ingest RPC.** Add §F.4 `bora_engine_ingest_vote_event`. *Prerequisite:*
J1 applied. **Approval gate:** security review (service-role only, no anon path);
concurrency test proving single increment under duplicate races.

**Phase J3 — Readiness + bootstrap alignment.** §F.7 (readiness reads enriched
evidence) and §F.8 (bootstrap `× 648`). *Prerequisite:* J1. **Approval gate:**
confirm the evaluation-complete constant and that no existing draft constant is
silently changed.

**Phase J4 — Persistence adapter.** Add `ingestVoteEvent` + `reconcileUnknownCommit`
to `persistence.ts` using the service-role client; keep `commit-unknown`
distinct from `persistence-failure`. *Prerequisite:* J2. **Approval gate:** no
`server-only` import leaks to client; no legacy fallback.

**Phase J5 — In-process ingestion worker (still not live voting).** A trusted
server-side poller that reads newly accepted `vote_events` and calls the RPC.
*Prerequisite:* J4. **Approval gate:** explicit decision on whether to backfill
history and how to bound latency; must not touch the public voting path.

**Phase J6 — Publication recheck.** Wire §H step-2 recheck into the publication
transaction. *Prerequisite:* J1–J4 and a decision on U-3/U-4. **Approval gate:**
publication activation is a separate, explicit approval — not part of ingestion.

Each gate is explicit; no phase activates chart publication or changes live
voting on its own.

## Assumptions

- A1: `public.vote_events` (0010) is the sole accepted-event source for
  `sourceSystem='secure_vote_events'`; its `id` is the stable `sourceEventId`.
- A2: The 72-hour and 168-hour windows are fixed by existing constants and are
  not redesigned here.
- A3: The Engine consumes only secure votes; legacy aggregate votes are not
  reconstructed into events (they have no per-event identity).
- A4: `security definer` + `service_role` grants are the accepted authorization
  model, consistent with 0014–0016.

## Unresolved decisions (require approval; not silently chosen)

- **U-1: Backfill scope.** Whether to ingest pre-existing `vote_events` history or
  start ingestion from cutover forward, and how much historical vote coverage that
  implies for the 72-hour window.
- **U-2: Provenance retention.** Whether `voter_ref` is stored long-term in the
  Engine ledger or reduced to a salted/hash fingerprint after a retention window,
  given it is an opaque `auth.uid()` but still a stable identifier.
- **U-3: Closed-hour ingestion.** Whether a late event may increment a bucket for
  an already-closed hour (affecting what a replay would recompute) or whether
  closed-hour events are recorded in the ledger + invalidation only, with the
  closure snapshot left authoritative. The design leans to the latter but does not
  decide.
- **U-4: Invalidation vs. recompute.** Whether an invalidated hour must trigger a
  bucket recomputation from the event ledger, or whether the running bucket is
  already correct and only coverage currentness needs re-checking.
- **U-5: Seed authority source.** Confirming the rollover closure snapshot is the
  accepted seed evidence authority (vs. a dedicated seed source ledger).
- **U-6: Bootstrap constant.** Whether to change 0015 to `× 648` outright or to
  gate bootstrap on a full-window coverage predicate; the two differ in what an
  operator must pre-stage.
- **U-7: Revision fabrication.** Confirm that, absent a true source revision, the
  `revision`/`evidence_id` split (§5) is the accepted way to avoid synthesizing a
  monotonic number the source cannot establish.

---

## Confirmation of boundaries

No application code, migration, database state, RPC, worker, scheduler, endpoint,
environment variable, or live behavior was changed. No tests, builds, TypeScript,
or lint were run. `NEXT_PUBLIC_BORA_SECURE_VOTING` remains off. `adapter.ts`,
`bridge.ts`, Supabase configuration, and deployment settings are untouched. All
pre-existing worktree changes are preserved; this design adds one document.







