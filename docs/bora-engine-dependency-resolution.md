# BORA Engine Source and Persistence Dependency Resolution

## Scope and evidence

This is a source-contract review, not a database or provider check. No
connection was made to Supabase or a provider, and no migration status was
queried. Repository deployment-readiness documentation describes migrations
`0012`–`0017` as unapplied drafts. Separate secure-voting documentation records
historical production observations about `0010`/`0011`; those notes were not
independently verified during this phase and must not be treated as current
deployment evidence.

No live runtime path, voting path, migration, or database object was changed.
Phase 25 adds isolated application-level coverage evidence types and tightens
internal readiness contracts; it does not add a persistence writer or activate
any caller.

## Dependency decision matrix

| Required input / capability | Exact Engine requirement | Best established source and semantics | Authorization / readiness | Persisted today vs. draft | Smallest missing step |
| --- | --- | --- | --- | --- | --- |
| Canonical accepted votes | Per-song, per-hour `upvotes`/`downvotes` buckets, with an hour identity and phase; the evaluation derives hourly C from bucket counts. Ingestion must count each accepted event once. The mapper's canonical source event also carries event-row ID, server time, voter reference, identity method/version, and the original idempotency key. | `public.vote_events` written by `cast_vote_secure` is the only established per-action source in the repository. `created_at` is the database acceptance timestamp; `id` is the stable row identity. The legacy vote RPC only changes aggregate counters and has no durable event ID, per-event time, voter identity, or retry key. | The secure RPC's logic is transactionally idempotent and updates the same song counters in the same transaction, but the client enables it only behind `NEXT_PUBLIC_BORA_SECURE_VOTING`; the flag is documented off by default. Do not assume all votes are present in its ledger. | Secure-vote schema/function are source files `0010`/`0011`; no Engine event importer exists. Draft `0012` has a `bora_engine_vote_events` table but stores only song, source identity, vote type, hour, and timestamp. No event-to-bucket transactional ingestion exists. | Add a future ingestion boundary keyed by `(secure_vote_events, vote_events.id)` that preserves voter/idempotency provenance and derives buckets exactly once. Include `voter_ref`, `identity_method`, `identity_version`, and `idempotency_key` in the Engine ledger or an equivalent immutable provenance record. Do not synthesize rows from legacy totals. |
| Vote-hour coverage | Explicit evidence per active song/input/hour that votes were completely collected, including verified empty hours; missing coverage must not imply zero. For chart scoring the required C interval is `H-71 … H` inclusive. | `vote_events.created_at` can assign accepted secure events to UTC epoch hours. A complete ingest/checkpoint process can establish event coverage; the legacy aggregate-only path cannot prove individual historical hourly distribution. | Secure votes are first-party accepted events, but only the secure path produces them; its operational cutover/population must be explicit. Legacy vote history cannot be reconstructed into events. | `0012` has a primary-keyed `hourly_input_coverage` row per song/type/hour. `0014` snapshot, `0015` bootstrap, and `0016` readiness only require/check vote coverage at the one closed/reference hour, not the whole 72-hour C window. No event ingest or coverage writer exists. | Establish an immutable ingestion checkpoint and coverage writer; require complete vote coverage for every hour used for C, or define an equivalent auditable history-completeness proof before the evaluator can safely distinguish checked-empty from missing. |
| Seed-hour coverage and values | Explicit hour-indexed C seed values (0–2) with provenance; the Engine uses a seed for an hour without actual votes. Missing seed records are not evidence of zero seed. For safe evaluation, each hour in the C window needs complete vote/seed resolution. | No authoritative seed provider or governed seed-generation/approval process is established in the inspected source. The Engine adapter accepts explicitly supplied seed-hour records; the evaluation consumes supplied seed values. | Authorization is not the question for a BORA-generated seed, but the authority, policy, and approval to create/replace it are unresolved. | Draft `0012` has `bora_engine_seed_hours` and `SEED` coverage. Bootstrap/readiness check only the reference hour for seed coverage. No seed writer or coverage production path exists. | Approve a deterministic seed policy and trusted, auditable writer. Extend resolution coverage across the 72-hour C window; never auto-fill missing seed hours with a generated zero. |
| YouTube | A non-negative `video_views` value in `views_per_hour` for each song and hour, within the platform window `H-167 … H`, with source identity, exact interval semantics, and corrections. | `videos.list(part=statistics)` returns cumulative `viewCount`, not an hourly count. The current snapshot contract records exact cumulative totals and retrieval time. A pair can calculate a difference, but only as a delta between reported counters. | API access is not chart-use authorization. Existing source strategy rates YouTube `not-configured`; there is no trusted server-side song/video mapping, activated collector, or defensible accepted Engine conversion. | API client, collector, snapshot validator, and derivation are application contracts/code. Draft `0017` stores cumulative snapshots separately; it explicitly says they are not Engine observations. No snapshot persistence adapter or projection writer exists. | Obtain and operate a trusted mapping/source process; obtain applicable authorization; then decide whether a separately named counter-delta metric is acceptable. Do not relabel cumulative totals or their delta as exact hourly views without validated provider semantics. |
| Spotify | A non-negative `track_streams` value in `streams_per_hour` per song/hour, with source identity and exact interval coverage. | No platform-wide per-track hourly stream-count source is established by the referenced Web API. Popularity and user playback history do not meet the metric. A rights-holder, artist, label, or licensed report is only a lead unless it provides the measure and interval. | Existing feasibility decision: no-go for standard Spotify Web API-derived ranking absent applicable written permission or exception. Existing assessment is `not-authorized`. | No Spotify collector or authorized reporting adapter is implemented; only storage/validation contracts and draft migration support exist. | Obtain written authorization for the intended derived ranking use and identify an accessible source with auditable hourly semantics and coverage; otherwise Spotify remains blocking. |
| Boomplay | A non-negative `track_streams` value in `streams_per_hour` per song/hour, with exact interval coverage and provenance. | No public/authorized track-level measurement interface is established. An artist/distributor report is an unverified lead; sales units/reporting days cannot be called hourly plays. | Existing feasibility decision: no-go pending a suitable authorized interface and explicit rights for comparative ranking/publication. Assessment is `unsupported`. | Generic platform observation and coverage schemas exist only as drafts; no Boomplay collector, source mapping, or provider integration exists. | Obtain written source and chart-use authorization and establish actual metric/unit/interval, report delays, coverage, corrections, and stable record identity. |
| Initial Engine state and history | Explicit state reference hour, lifecycle, K, persistent Kura, vote buckets, seed timeline, and platform observations sufficient for evaluation; the persisted state revision must be known. | No repository-backed authoritative reconciliation source for a complete initial Engine state is established. Public ranks, `momentum_score`, aggregate counters, and legacy history are not acceptable substitutes for reconstructed hourly history. | Requires explicit operator approval and source-by-source reconciliation. No automatic/default initialization is valid. | Persistence code can call the bootstrap RPC. Draft `0015` accepts only a payload matching persisted rows and initializes revision `0`; it refuses incomplete coverage and existing rollover history. No bootstrap data is provided. | Prepare and approve the exact initial state and complete history/coverage; do not infer absent state, K, or hourly history. |
| Trusted controlled invocation | A private, authorized caller must supply a stable claim ID and explicit target hour, observe readiness, and safely report retry/unknown outcomes. | `hour-entry.ts` is an internal server-only entry point for rollover, not chart evaluation. Operator readiness is internal. | No public route or scheduled worker exists, by design. Current assessments make the required three-platform gate not-ready. | Hourly runner and Supabase adapter call the draft RPCs; there is no evaluation coordinator or publication caller. No invocation path is registered. | After source and state prerequisites are met, approve a private worker/operator mechanism with authorization, monitoring, controlled retries, and no public-chart connection. |
| Atomic publication | Complete evaluated candidate bound to state revision/hour, source snapshot, expected current pointer, idempotency identity, and complete song population; persist header and every entry, then move pointer and record success atomically. | No trusted publication writer or transaction exists. The pure Phase 21 request validator cannot establish database state or atomicity. | Not active and not operational. | Draft `0012` defines evaluation/publication tables and a nullable head; comments describe an intended atomic writer. No publication RPC, durable claim/idempotency result store, source-snapshot revision, or reconciliation endpoint is defined. | Later migration/RPC must serialize attempts, check the full current snapshot and expected pointer under locks, persist all rows, advance the pointer last, and store an idempotent result for request-ID reconciliation. |

## Exact blocking mismatches

### Vote event contract versus secure voting and Engine ledger

[`CanonicalAcceptedVoteEvent`](../lib/supabase/vote-event.ts) requires:
`sourceSystem`, `sourceEventId`, `songId`, `voteType`, `occurredAt`, `voterRef`,
`identityMethod`, `identityVersion`, and `idempotencyKey`.

The secure-vote table in migration `0010` persists these source facts as `id`,
`song_id`, `vote_type`, `voter_ref`, `identity_method`, `identity_version`,
`idempotency_key`, and server-assigned `created_at`. Migration `0011` retains
the same schema and serializes the per-voter rate-limit check. The secure RPC
inserts the event and updates `songs` counters in one transaction; duplicate
requests return the existing event ID and do not increment counters again.
The RPC response itself is narrower than the canonical event: it returns the
event ID, song, vote type, and identity method, but not voter reference,
identity version, idempotency key, or timestamp. A trusted server-side reader
of the committed source row can obtain those fields; the client response alone
cannot.

The Engine mapper additionally needs the timestamp to derive the UTC hour and
applies one vote to a bucket. The source timestamp is `created_at` (server
acceptance time), not a client-supplied click time. Preserve that meaning; do
not relabel it as a client action timestamp.

Draft `0012.bora_engine_vote_events` loses `voter_ref`, `identity_method`,
`identity_version`, and `idempotency_key`. It uses `occurred_at`, which can
hold the original database `created_at`, and `source_event_id`, which can hold
the source `id`; its unique `(source_system, source_event_id)` is suitable for
deduplicating re-ingestion. `legacy_vote_event` is allowed by a check but no
authoritative legacy event producer exists. The source migration explicitly
does not replay or reconcile legacy aggregate counters into events.

**Smallest compatible future change:** retain the secure RPC as the acceptance
authority and make Engine ingestion idempotent on the immutable source event
ID. Add the missing provenance columns (or a linked immutable provenance row)
to the Engine event ledger, and update the bucket only once per event inside a
transactional ingest path. If the Engine bucket must be synchronously complete
at vote acceptance, a later reviewed migration must extend the secure
acceptance transaction (or an after-insert database trigger) so event, Engine
ledger, bucket, and coverage are committed together; this is a deliberate
future voting/schema change, not part of this phase. Do not change the current
RPC or derive pseudo-events from aggregate counters here.

### Vote/seed evaluation coverage is narrower than the scoring input window

The Engine C calculation uses a 72-clock-hour window, inclusive from `H-71`
through `H`. The platform calculation uses 168 hours. The existing source
readiness and migration drafts require vote and seed completeness only for
hour `H`; the `0014` hourly snapshot and `0015` bootstrap count likewise include
only one vote hour and one seed hour. That is sufficient to express a single
hourly rollover prerequisite, but it does not prove completeness of all vote
and seed records used by a chart evaluation.

The Engine deliberately lets an absent vote bucket or seed resolve to zero.
That is correct only where completeness was independently established; it
cannot distinguish an uncollected hour from a verified empty hour. Therefore
the Phase 20 publication gate's reused single-hour vote/seed check is
insufficient to prove safe C evaluation over 72 hours.

For a 72-hour chart evaluation, the minimum explicit coverage set is 72 vote
and 72 seed outcomes per active song, in addition to `3 × 168 = 504` platform
outcomes: **648 input-coverage slots per active song**, before any extra
source-version metadata. The existing 0015 bootstrap check expects 506
(`2 + 504`) per active song because it covers vote and seed only at its one
reference hour. A future evaluator readiness/snapshot contract and bootstrap
requirements must close this window mismatch; no readiness requirement should
be weakened.

The `hourly_input_coverage` schema stores only status/detail/timestamps and
does not store source identity or a coverage revision. Application-level
evaluation readiness now requires source identity, revision, and explicit
completeness verification and freshness evidence for each vote and seed hour;
the current persisted schema cannot provide those facts. The draft readiness RPC counts status rows and
persisted records separately, but does not bind coverage to an authorized
source identity or an immutable source snapshot. A later schema change or
equivalent authoritative coverage ledger is needed to persist that identity.

## Phase 23: isolated canonical vote ingestion contract

[`vote-event-ingestion.ts`](../lib/bora-engine/vote-event-ingestion.ts) adds a
pure, unwired contract. It accepts only `secure_vote_events` requests with a
valid secure event UUID, song UUID, up/down direction, and explicit committed
timestamp. It derives the UTC `hourIndex` from that timestamp without changing
or replacing the timestamp. The event ID plus source system is the ingestion
identity; the secure-vote action's idempotency key is retained as provenance
when available, but is not substituted for the stable source event identity.

Optional voter reference and idempotency key may be absent/null. Identity
method and version must either both be present and valid or both be
unavailable. A malformed supplied optional value is invalid input, not
“unavailable.” The pure validator checks shape and syntax only: it cannot prove
that a voter reference was verified or that the row was committed. A future
trusted server loader must supply the source row; no endpoint, worker, live
vote wiring, or persistence operation was added.

`assessVoteEventIngestionRetry` defines the deterministic comparison:

- No row under the exact `(sourceSystem, sourceEventId)` key means
  `new-event`.
- The same key with every normalized payload field identical means
  `already-ingested`.
- A different key returned for the lookup is an `identity-mismatch`; the same
  key with any core or available provenance field changed is a
  `payload-mismatch`. Both are `conflicting-identity`, never an update.
- Missing optional provenance is normalized to null; a later retry that adds
  or changes that provenance is therefore not silently merged. Reconciliation
  or an explicitly authorized enrichment/correction procedure would be needed.

The outcome union also reserves `ingested`, `invalid-input`,
`persistence-failure`, and `commit-unknown` for a future operation. Those are
contract shapes, not claims that an ingestion RPC exists. The contract helper
does not persist an event, update a bucket, or itself return a durable success.

### Event accounting versus complete history

The Engine's C window is exactly 72 inclusive clock hours, `H-71 … H`; event
time assigns each accepted vote to one of those hours using the original
server-committed timestamp. One successfully ingested event proves neither
that the rest of its hour was ingested nor that any other window hour was
checked.

The module's `assessVoteSeedHistoryCoverage` separately requires one
source-matched `COMPLETE` vote-coverage record and one source-matched
`COMPLETE` seed-coverage record for each of the 72 hours. It is scoped to one
song; a caller would need to assess every active song. A complete vote-coverage
record with no bucket/events is the explicit checked-empty case; a missing,
unavailable, failed, duplicate, or source-mismatched record remains not-ready.
Seed coverage is independent: complete coverage with no seed is an explicitly
checked absence, not proof derived from vote coverage. The helper does not
alter Engine scoring, establish a seed policy, or replace the existing
evaluation readiness path.

Late secure events retain their original committed event-time hour. If such an
event arrives after that hour was declared complete, a future transaction
must incorporate it into that historical bucket and invalidate/recompute the
affected hour's coverage and any dependent evaluation snapshot before
completeness can be asserted again. The same applies to an authorized
correction. A retry of an unchanged committed event is not a correction and
must not increment the bucket. The existing coverage row has neither source
identity nor a revision/invalidation state, so the draft schema cannot
currently express that reconciliation contract.

### Durable operation still required

A future service-role-only transaction/RPC must serialize ingestion by
`(source_system, source_event_id)`, load or insert the event, and compare the
entire canonical payload on conflict: song, direction, original timestamp,
derived hour, and all provenance fields available to that ingestion. If the
identity already exists and the payload is identical, return
`already-ingested` without changing a bucket. If the identity exists with a
different payload, reject with `conflicting-identity`. If it is new, insert
the immutable event and increment the corresponding vote bucket exactly once
in the same transaction. It must preserve event time, avoid updating the
aggregate on every retry, and return a stable result that can be reconciled
after an ambiguous commit.

Draft `0012.bora_engine_vote_events` has the unique source identity and event
hour check needed for the basic key, but omits voter reference, identity
method/version, and idempotency key. It therefore cannot perform the required
full-payload comparison or preserve available provenance. The smallest schema
change is to add those nullable provenance columns (or a protected linked
immutable provenance record) and define null-aware exact retry comparison.
The same transaction also needs a safe upsert/lock strategy for
`bora_engine_vote_buckets` and a coverage invalidation/revision mechanism; the
current coverage table cannot version source identity or mark a prior
`COMPLETE` hour stale when a late event is ingested. Vote/seed window coverage
must be represented for all 72 hours, independently. No SQL or migration was
changed in this phase.

## Phase 24: unified historical vote/seed readiness

The shared `assessVoteSeedHistoryCoverage` contract now defines vote and seed
coverage over the Engine's unchanged 72-hour C window, `H-71 … H`, using UTC
epoch-hour indexes consistent with `getActiveWindow`. Internal per-song and
chart eligibility in `source-readiness.ts` both use this helper. The
publication gate delegates to chart eligibility, so it cannot return `ready`
with only the evaluation hour covered. It also requires coverage attributable
to the expected source identity and revision, with completeness and freshness
explicitly verified. Absent authority, revision, completeness evidence, or
freshness information is unresolved and fails closed. Gap reasons distinguish
missing/incomplete, unavailable, failed, invalid, duplicate, source mismatch,
revision mismatch, unresolved completeness, and stale or unresolved freshness.

The operator readiness path consumes the existing migration-0016 RPC, whose
response exposes one-hour counts rather than per-song evidence for all 72
hours. When that RPC claims vote or seed readiness, the application now
reports those checks as `unresolved` and overall readiness as `not-ready`;
single-hour readiness cannot stand in for historical completeness. If the
RPC already reports incomplete/unavailable input, that failure remains
visible. No SQL was changed.

The hourly runner remains a distinct rollover operation: it checks the
specific closed hour being transitioned and the platform window, not chart
evaluation eligibility. Its one-hour closure result is not evidence that
evaluation vote/seed history is complete for 72 hours. This distinction
preserves rollover semantics and prevents treating a successful rollover as a
chart-readiness result.

Checked-empty history remains distinct from missing history: only a
completeness-verified, attributable, current `COMPLETE` record can establish
that a particular hour was checked and had no events/value. `COMPLETE` status
alone is insufficient. Missing, unavailable, failed, invalid,
duplicate, unauthorized, source-mismatched, revision-mismatched, stale, or
unresolved records never become zero or count as complete. Vote and seed
coverage are assessed independently; coverage of one does not establish the
other.

Late accepted vote events remain assigned to the UTC hour derived from their
original committed timestamp, not their later ingestion time. If one arrives
after an hour was marked complete, the event must be incorporated in that
historical bucket and the affected coverage and dependent evaluation snapshot
must be invalidated/reconciled before readiness can be re-established. The
draft coverage schema has no source identity, revision, or invalidation state,
so the application contract can identify missing proof but cannot durably
track late-event invalidation or prove freshness. The new readiness check
does not activate ingestion, change scoring, make production publication
available, or alter public chart/live-voting behavior.

## YouTube measurement decision

The present API client returns only cumulative `viewCount` at
`retrievedAt`; it does not return an hourly count or the provider's exact
effective measurement boundary. The snapshot contract correctly labels this
`cumulative_views` / `views_total`, records a stable `captureId` for retries,
and assigns a new capture identity for a new retrieval. Migration `0017`
preserves captures append-only with a source identity and correction/
invalidation chain. These contracts can retain evidence; they do not turn it
into an exact hourly measurement.

`deriveYouTubeHourlyMeasurement` subtracts two counts only when they are for
the same song/video, have distinct identities, are chronological, are
non-decreasing, and were retrieved exactly one UTC hour apart on UTC hour
boundaries. It rejects negative deltas. Even a valid pair is only an
`hourly-measurement-candidate`: delayed counter updates or provider adjustments
may be reflected in either retrieved count, so a positive difference cannot
prove those views occurred inside that exact clock hour. A later downward
adjustment is currently rejected as a negative difference; an upward
adjustment is indistinguishable from activity. A late-arriving snapshot may
also revise the counter for an interval already considered complete.

There is a second exact schema mismatch. The generic platform observation
contract requires `observedAt` to be inside `[periodStart, periodEnd)` and
derives `hourIndex` from that timestamp. A counter-pair delta is known only
when the end snapshot is captured at `periodEnd`; the existing derivation
explicitly returns `engineObservation: null` with
`end-snapshot-is-exclusive-period-end`. Moving that timestamp inside the
interval would falsify the capture time. The Engine observation type itself
holds only a value and `hourIndex`, so it cannot retain the pair identity,
capture time, interval, or correction provenance needed to audit a delta.

**Decision:** do not use the present cumulative API values or derived
difference as `video_views` / `views_per_hour` Engine observations. Keep
snapshots as separate evidence. The smallest future contract change, if source
and chart-use rights are confirmed, is a distinct interval-delta measurement
variant that records `periodStart`, exclusive `periodEnd`, both snapshot IDs,
both exact capture times, source/version/correction lineage, and an explicit
semantic such as “reported cumulative-counter delta over this interval.”
Its hour identity must come from the measured interval, not a fabricated
in-interval `observedAt`. The Engine and persistence contract must then
explicitly decide whether that different metric is acceptable as ranking
input. It may be called exact hourly views only if authoritative provider
semantics establish counter finality and no delayed/retroactive adjustment
across the interval. Do not implement or adopt that metric in this phase.

## Migration dependency review

This is a proposed source order only; it is **unverified against the live
database**.

1. **Existing application prerequisites:** confirm the deployed `public.songs`
   UUID table and the assumed columns/functions/permissions. `0012` references
   `public.songs(id)` repeatedly but does not create or define `songs`.
2. **`0010_hardened_guest_voting.sql`, then `0011_serialize_vote_rate_limit.sql`
   if canonical secure events are selected.** `0011` replaces the secure RPC
   established by `0010` and requires its `vote_events` table/function. These
   form a separate secure-voting dependency chain; `0012` has no foreign key to
   `vote_events`. Their actual deployment status must be confirmed through the
   approved process before use.
3. **`0012_bora_engine_data_foundation.sql`.** Creates Engine state, vote
   ledger/buckets, platform projection, seed and coverage tables, hourly
   history, evaluation/publication tables, and publication head. It assumes
   `songs(id)` and deliberately creates no trusted write worker/RPC.
4. **`0013_bora_engine_platform_observation_history.sql`.** Depends on the
   `0012` platform projection and `songs`. It adds an append-only observation
   history/correction chain but no application ingestion or projection writer.
5. **`0014_bora_engine_hourly_atomic_operations.sql`.** Declares dependency on
   `0012` and `0013`; adds the hourly state head and service-role snapshot,
   claim/load/release, and atomic rollover commit. It does not initialize state
   and does not publish charts.
6. **`0015_bora_engine_state_bootstrap.sql`.** Requires `0012`–`0014`; adds
   explicit approval and initializes state only when supplied state/coverage
   match the persisted snapshot. It does not create historical data.
7. **`0016_bora_engine_readiness.sql`.** Requires `0012`–`0015`; read-only
   readiness, with the vote/seed window limitation described above.
8. **`0017_bora_engine_youtube_snapshot_history.sql`.** Requires only `0012`
   for its `songs` foreign key and is otherwise independent of `0013`–`0016`.
   Applying it after `0016` preserves the repository's numeric order but is not
   a semantic dependency.

The main Engine draft chain is therefore `0012 → 0013 → 0014 → 0015 → 0016`,
with `0017` after `0012` (conveniently last). If using secure-vote events,
`0010 → 0011` must separately precede any consumer that expects their source
rows.

### Draft-chain risks to resolve before a controlled environment

- **Vote provenance and legacy source:** `0012`'s event ledger drops four
  canonical fields and permits `legacy_vote_event` without any producer.
- **Coverage identity and evaluation window:** coverage rows have no
  `source_identity` or immutable revision, and vote/seed are checked for only
  one hour rather than the 72-hour C window. Bootstrap's expected count is 506
  per active song rather than the 648 needed to establish every input hour
  described above.
- **Platform history projection:** `0013` stores source/provenance revisions
  but no trusted ingestion operation atomically selects a correction and
  updates the one-per-hour projection/coverage. The projection's unique
  `(song, platform, hour)` key and the history table's one-root/one-successor
  constraints are compatible as projection-plus-audit-history, but a writer
  must prevent competing correction branches and ensure the projected
  version is the authoritative active revision.
- **Timestamp contract:** `0013` observation rows require `observed_at` inside
  a one-hour period; this cannot represent the end-boundary capture of a
  cumulative-counter delta without lying about the capture time. `0017`
  correctly keeps cumulative snapshots separate.
- **Privileges and writers:** `0012` notes that it creates no trusted worker or
  RPC. `0013` adds no application writer or projection operation. `0017`
  explicitly grants service-role select/insert for snapshot history, but no
  collector/persistence implementation uses it. Review effective grants,
  RLS, function ownership, and service-role privileges during SQL approval;
  source text alone does not establish deployment behavior.
- **Bootstrap source:** `0015` requires already-persisted matching history and
  coverage, complete state, and explicit operator approval. It has no
  authoritative recipe for initial K, persistent Kura, or historical hour
  reconstruction.
- **Readiness incompleteness:** `0016` is a readiness report, not a complete
  source-identity audit or publication transaction. A ready count does not
  itself validate the exact Engine input snapshot.
- **Publication:** `0012` has row constraints, a unique publication per
  evaluation run, and a nullable singleton head, but no publication RPC,
  per-hour serialization, candidate-bound durable idempotency, expected
  state/source snapshot recheck, exact entry-count enforcement, pointer
  transaction, or unknown-commit reconciliation. Its transaction behavior is
  comments/schema intent only.

`0013`'s unique root per slot and unique successor per prior observation are
not duplicate definitions of the projection key: they model one immutable
history chain alongside one current projection. They still need a trusted
writer that keeps them in agreement. No live schema or effective constraint
set is asserted here.

## Smallest credible operational slice

**A legitimate three-platform Engine chart evaluation cannot run today.** No
platform currently has an established `available` assessment:

- YouTube's available data are cumulative and lack a defensible exact-hour
  conversion and trusted mapping.
- Standard Spotify API data are not authorized for the proposed ranking use;
  no separately authorized hourly source is established.
- Boomplay has no established authorized hourly measurement interface.

The gate correctly requires all three platforms and does not permit dropping a
platform, filling its missing hours with zero, or redistributing its weight.
An isolated environment does not make an unauthorized or semantically
incompatible measurement acceptable.

The smallest useful non-public operational slice is therefore **prospective
secure-vote event ingestion and reconciliation only**, gated on an explicitly
approved secure-vote source/cutover and isolated from chart evaluation. It
should read only committed `vote_events`, preserve the stable source event ID
and canonical provenance, idempotently derive vote buckets, and record explicit
hourly coverage. It must not backfill legacy aggregate counters as events,
generate a score, or publish a chart. Seed policy/coverage can be developed as
a separate operator-approved input contract. This advances the most
repository-grounded Engine input without depending on unavailable third-party
measurements; it is **not** an operational chart or a production-ready ranking.

If operating an Engine evaluation is the acceptance criterion, stop before
that operation until all required authorized source inputs, complete 72-hour
vote/seed resolution, bootstrap state, and controlled invocation exist. A
synthetic fixture can test deterministic math in an isolated development
harness, but it is not evidence of a real-data evaluation and must never be
presented as a chart.

## Prioritized next-phase plan

1. **Persist the Phase 24 evaluation-history evidence.** The shared
   application contract now checks all 72 vote and seed hours and fails closed
   without attributable, revisioned, completeness- and freshness-verified
   evidence. The draft schema and readiness RPC still cannot supply that
   evidence; design the schema/snapshot/bootstrap/readiness changes before
   treating the application contract as satisfiable. Keep the distinct
   168-hour platform window and do not alter either mathematical window.
2. **Design the secure-vote ingestion transaction.** Decide the source
   activation boundary, preserve the four missing provenance fields, key
   retries by the immutable `vote_events.id`, and update each bucket exactly
   once. Keep legacy votes aggregate-only; do not replay counters.
3. **Approve a seed source and initial-state reconciliation protocol.** Define
   who may provide seeds, how missing/empty hours are resolved, and how K,
   persistent Kura, lifecycle, and historical rows are reconciled and approved.
4. **Resolve source authorization and semantics per platform.** For YouTube,
   decide whether the distinct cumulative-counter delta metric is authorized
   and appropriate or reject it. Obtain explicit rights and hourly reporting
   semantics for Spotify and Boomplay or maintain a no-go for each.
5. **Approve migration changes and execution order** only after the schema
   contracts above are settled; verify them against a controlled database via
   the separately approved operational process. This document does not claim
   the current drafts match any live database.
6. **Implement trusted source/coverage ingestion and snapshot loading.** Bind
   exact state revision, source identity, coverage revision, and Engine input
   to one immutable evaluation snapshot; add reconciliation for corrections.
7. **Prepare initial state/bootstrap and a private controlled invocation.**
   Require independent approval, stable request IDs, authorization, monitoring,
   and safe unknown-outcome handling. Keep all public chart routes unchanged.
8. **Only after inputs become legitimately complete, implement the isolated
   evaluation coordinator and atomic publication RPC.** Recheck the current
   source/state/pointer within the database transaction and keep public reads
   disconnected until a separate approval.

## Decisions requiring explicit approval

- Whether/when secure voting is an authoritative prospective source for Engine
  ingestion, including the cutover boundary and effect of any rollback.
- Whether the Engine ledger retains voter reference, identity method/version,
  and idempotency key directly or through a separately protected provenance
  relation, and whether ingestion is synchronous with vote acceptance.
- The seed-generation/approval authority, historical reconciliation policy,
  and acceptable evidence for initial K and persistent Kura.
- Whether YouTube counter deltas are acceptable as a separately named metric,
  conditional on provider semantics, usage rights, and correction/finality
  behavior; they must not be represented as exact views during an hour without
  that evidence.
- Written permission and source terms for any Spotify or Boomplay
  rights-holder/distributor data used in comparative ranking and publication.
- The authoritative source/coverage snapshot revision and freshness model.
- The future migration/RPC design for atomic publication, idempotency,
  per-hour concurrency, pointer update, and unknown-commit reconciliation.
- The private worker/operator authorization and rollout boundary. No approval
  in this dependency review activates the Engine, secure-vote path, collectors,
  or public chart.

## Phase 25: historical coverage evidence

[`coverage-evidence.ts`](../lib/bora-engine/coverage-evidence.ts) defines the
shared evidence identity. A record names its input kind (`vote-history`,
`seed-history`, or `platform-observation-history`), song when applicable,
exact UTC hour or inclusive hour interval, expected and actual source identity,
stable evidence ID and/or source revision, assessment time, outcome,
currentness, and a machine-readable reason for unusable evidence. Revisions
remain nullable: the application does not manufacture one. An authoritative
`CoverageEvidenceAuthority` must be supplied separately to readiness checks;
repeating an evidence record's own identity as its expected identity is not
proof that it is still current.

Coverage outcomes have one canonical vocabulary:

- `complete`: the required input was fully accounted for;
- `checked-empty`: the source was successfully checked and reported no events
  or observations for the interval;
- `unavailable`, `failed`, `invalid`, `incomplete`, `stale`, and `unresolved`:
  distinct non-qualifying outcomes with reasons.

Missing rows never mean `checked-empty`. A zero vote/seed or platform value is
accepted only with attributable usable evidence; a checked-empty platform
record does not itself create a measured zero observation. Coverage is
independent by input kind, song, platform, and interval.

The internal consumers now apply separate evidence requirements:

| Consumer | Required coverage |
| --- | --- |
| Evaluation vote/seed history | For every active song, both vote and seed history for every UTC epoch hour `H-71 … H`, with a separate authoritative source and evidence identity/revision for each song, input kind, and hour. |
| Evaluation platform history | For every active song, each required platform, and all 168 hours `H-167 … H`, source-matched usable evidence and a separately supplied per-song/platform/hour authority. |
| Hourly rollover | Vote and seed evidence for the one closed transition hour, independently, plus each required platform for its existing 168-hour interval. This remains distinct from the evaluation's 72-hour history check. |
| Publication gate | Reuses evaluation eligibility: the complete 72-hour vote/seed history and 168-hour platform history must qualify before a publication candidate can be ready. This is still an unwired pure gate, not a publisher. |

`source-readiness.ts` enforces evaluation history, `publication-gate.ts`
forwards the evidence authorities into that eligibility check, and
`hourly-runner.ts` checks its separate one-hour vote/seed plus 168-hour
platform rollover inputs. `persistence.ts` refuses status-only rollover
responses from the draft RPC and returns explicit unresolved/not-ready when
evidence or its expected authority is absent. None of these paths can claim
that persisted source identity, freshness, or revisions have been verified
from migrations `0012`, `0014`, or `0016`: the draft coverage rows retain
status/detail/timestamps but not the full evidence identity, authoritative
revision, currentness, or invalidation record. `0016` remains aggregate and
single-hour readiness. The contracts therefore fail closed until a trusted
loader can provide evidence and its independent authority.

Late accepted votes retain the UTC hour derived from the original committed
event timestamp, never the ingestion hour. A newly accepted event invalidates
the vote-history evidence for that event hour and every dependent 72-hour
evaluation snapshot whose window includes it; those inputs must be reconciled
before readiness becomes current again. The event's existing
`(sourceSystem, sourceEventId)` identity must be deduplicated and its full
canonical payload compared before recording invalidation, so an exact retry
does not create a second event or invalidation and conflicting identity reuse
fails closed. These are future transaction requirements; no ingestion or
invalidation writer exists here.

Platform corrections remain append-only: a corrected observation must be a
new superseding revision, not a rewrite of prior evidence or a published
snapshot. Future persistence must atomically deduplicate and persist accepted
events, record the relevant coverage revision/invalidation, protect concurrent
writers, and support retry-safe reconciliation. It must compare stable source
identity and evidence revision (or stable evidence ID), distinguish a known
transaction failure from an unknown commit outcome, and keep publication
snapshots immutable with explicit pointer advancement. Migration drafts do not
provide these guarantees. Ingestion, scoring, live voting, migrations, and
publication remain inactive.

At minimum, future persistence needs an append-only evidence ledger (or
equivalent history) carrying the record fields above and an explicit
invalidation/supersession link; current projections may not overwrite the only
prior evidence. The Engine vote-event store must also retain enough canonical
payload fields to compare exact retries, including the secure source event ID,
song, direction, original committed timestamp, source system, and available
voter/identity/idempotency provenance. An accepted event and its bucket and
coverage invalidation must commit together. A known rollback is a failure; a
connection loss after a possible commit is `commit-unknown` and must be
reconciled by the same source-event identity and payload before retrying. It
must never be treated as a confirmed failure or retried under a replacement
identity.
