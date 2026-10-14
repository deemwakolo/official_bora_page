# BORA Engine Evaluation and Publication Boundary

## Scope and evidence

This document describes repository code and SQL text only. No database was
queried, and no migration was applied; whether any migration is deployed is
not established here. Migration `0014` and `0016` describe themselves as
unapplied proposals. Migration `0012` defines a schema foundation, but it does
not define or grant a publication writer.

The publication gate added in [`publication-gate.ts`](../lib/bora-engine/publication-gate.ts)
is a pure, unwired contract. It does not enable the Engine, call an evaluator,
access a database, create a publication, or change public chart behavior.
The request and outcome contract in
[`publication-transaction.ts`](../lib/bora-engine/publication-transaction.ts)
is also pure and unwired; it does not claim a slot or perform a transaction.

## Current evaluation-to-publication path

There is not yet a connected Engine publication path in the application.
Repository search found no production caller of `loadAndEvaluateBackendChart`;
its present callers are verification tests. The current Engine path ends at an
in-memory evaluation result:

1. [`loadBackendSongs`](../lib/bora-engine/bridge.ts) obtains registry rows via
   the existing `getRegistry` integration.
2. [`buildEngineInputFromBackendRows`](../lib/bora-engine/adapter.ts) maps rows
   and requires the Engine fields and observation arrays to be present and
   valid. Missing or invalid fields and skipped rows produce `not-ready`.
3. [`toEngineInput`](../lib/bora-engine/bridge.ts) maps that validated
   structure to the Engine types. The injected evaluator is then called;
   `evaluateChart` first validates its Engine input and returns either a
   successful chart value or a rejected `EngineError`.
4. The bridge validates the returned chart shape, reference hour, numeric
   fields, ranking consistency, and active/excluded song consistency. A thrown
   evaluator, rejected result, or unusable result is not returned as ready.
5. The bridge returns `ready` with the in-memory `ChartEvaluationResult`.
   `persistEngineEvaluation` does not write: it blocks every request, returning
   `persisted: false`. Its idempotency set is process-local.
6. No code creates an evaluation-run row, publication header, publication
   entries, or changes the publication-head pointer.

The separate [`runHourlyRollover`](../lib/bora-engine/hourly-runner.ts) path is
not the chart-publication path. It claims a closed hour, loads state and input
coverage, checks coverage for votes and seeds at that hour and each platform
for the 168-hour range, calls `rolloverHour`, then delegates the atomic state
commit to persistence. It does not evaluate or publish a chart.

[`source-readiness.ts`](../lib/bora-engine/source-readiness.ts) separately
provides pure per-song/chart eligibility assessment. It checks the explicit
engine-state reference hour, the transition/grace deadline, each platform's
available source assessment and identity, source-matched coverage across all
168 hours, and complete vote and seed coverage across all 72 C-window hours
(`H-71 … H`). The vote/seed check reuses
[`assessVoteSeedHistoryCoverage`](../lib/bora-engine/vote-event-ingestion.ts)
and requires expected source identity and revision plus verified completeness
and freshness evidence; missing coverage or attribution fails closed. The
expected identity and revision must come from an authoritative snapshot, not
be inferred from a status row.
[`operator-readiness.ts`](../lib/bora-engine/operator-readiness.ts) combines
operator authorization, persistence readiness, and the currently configured
source assessments for a readiness response. Neither readiness path is wired
into the bridge's evaluation or a publication writer.

The operator readiness RPC draft (`0016`) reports aggregate vote/seed counts
for one requested hour, not the per-song, source-attributed, revisioned
72-hour evidence required for chart evaluation. The application therefore
reports an RPC `ready` vote or seed check as `unresolved` and overall operator
readiness as `not-ready`; that single-hour response cannot grant historical
eligibility. The hourly runner is a distinct rollover gate: its complete
coverage for the closed hour means only that the hour's transition inputs are
present. A completed rollover is not evidence that all 72 vote and seed hours
for an evaluation have been established.

An hour with no vote or seed record may be treated as checked-empty only when
its own coverage completeness is independently verified, attributable to the
expected source/revision, and freshness-verified. A `COMPLETE` status alone is
not sufficient. Missing, unavailable, failed, duplicate,
invalid, unauthorized, stale, source/revision-mismatched, or unresolved
coverage is not zero and cannot satisfy evaluation readiness. Vote and seed
coverage are independent.

Late accepted events remain assigned by their original committed UTC timestamp.
If an event arrives after its historical hour was declared complete, that
hour's bucket and any dependent evaluation snapshot must be reconciled, and
its coverage must be invalidated/re-established before evaluation readiness
can be granted. The current draft coverage schema stores only status,
detail, and timestamps; it does not persist source identity, coverage
revision, or durable invalidation. Consequently, the application contract can
fail closed on absent evidence but cannot prove durable freshness or track
late-event invalidation with the current schema. This does not wire ingestion,
change scoring/rollover, activate publication, or alter public chart behavior.

## Existing schema and transaction guarantees

Migration `0012` proposes:

- `bora_engine_evaluation_runs`, with a reference hour and `running`, `failed`,
  or `published` status;
- `bora_engine_publications`, with one unique publication per evaluation run
  and the chart totals;
- `bora_engine_publication_entries`, with one row per song, active result
  fields and rank, or null result fields for a Vault song; and
- `bora_engine_publication_head`, a singleton pointer initialized to `null`.

The schema includes row-level constraints and uniqueness for song entries and
ranks. It does not itself establish that every expected song has an entry, that
the input/source snapshot remains eligible, or that any rows and pointer move
together. Its comments state the intended behavior—complete header and entries,
pointer movement, and a published run in one transaction—but comments and table
constraints are not an implemented transaction. There is no publication
function in the inspected SQL or application code.

Migration `0014` is a separate hourly-operation proposal. Its
`bora_engine_commit_hour` draft checks lease ownership, locks and compares the
hourly state head's reference hour and revision, locks source tables, reloads
and compares the snapshot and coverage, and commits rollover rows, state,
revision, and completed hourly-run status together. Those guarantees apply to
hourly rollover only; that function does not write publication rows or the
publication head. Migration `0016` is a read-only readiness function draft; it
does not create or publish a chart.

Accordingly, the verified publication guarantee today is **none**: the schema
describes a nullable pointer and intended atomic publishing, but no current
application or SQL operation persists an Engine chart or advances that pointer.

## Pure publication gate contract

[`assessPublicationGate`](../lib/bora-engine/publication-gate.ts) accepts the
adapter's input-build result, explicit current time and state identity, source
assessments, per-song coverage, and an explicit evaluator outcome. It is
server-safe and deterministic: it imports no UI modules and performs no
network, clock, filesystem, or database operation.

It returns:

- `not-ready` with typed machine-readable reasons when input construction,
  population shape, source authorization/availability, evaluation timing,
  reference-hour alignment, votes/seeds, or platform-hour coverage are not
  eligible; or
- `failed` when evaluation threw, returned a rejection, or produced a result
  that is malformed, inconsistent, or for a different song population; or
- `ready` with the validated evaluation and eligibility evidence. `ready` is
  only permission to proceed to a future publication transaction; it is not a
  publication and causes no write.

The gate reuses the source-readiness contract for required source availability,
identity matching, duplicate/invalid coverage, the 168-hour window, and vote
and seed coverage. In the evaluator success path it applies the bridge's
existing chart-result shape and rank validation, then also verifies that the
result represents the complete active and Vault input population. For each
required active-song/platform/hour slot, it also rejects duplicate or invalid
Engine observations and requires the explicit observation value and lifecycle
to agree with the coverage result.

An explicit measured zero is distinct from `no-observation`. The gate refuses
`no-observation` coverage for any required active-song/platform/hour slot. It
does not manufacture a zero row, fill gaps, or alter/renormalize platform
weights. Invalid or duplicate coverage and observations rejected by Engine
evaluation cannot be published as a ready result.

The gate's evidence is point-in-time. It is deliberately not connected to chart
routes, voting, the hourly runner, persistence, or publication writes in this
phase.

## Required publication transaction invariants

A future trusted publication operation must perform the following in one
database transaction:

1. Lock/read the authoritative state head and confirm both the expected state
   revision and reference hour still match the evaluation.
2. Confirm that required source authorization/availability and every required
   input/coverage item still match the evaluated snapshot, including all active
   songs, each platform, and each hour in the 168-hour window. A point-in-time
   application gate result alone is not proof that these inputs stayed
   unchanged.
3. Persist the complete publication header and exactly the complete entry set:
   one row for each input song, with evaluated values/ranks for active songs
   and null result fields for Vault songs. Do not expose partial results as a
   complete publication.
4. Advance the singleton current-publication pointer to that complete
   publication.
5. Mark the evaluation run `published` and record its successful completion.

The operation must check affected-row counts and constraints and treat any
conflict, stale revision/hour, incomplete snapshot, or write error as failure.
If any step cannot be established, the transaction must roll back all
publication changes and leave the previous pointer unchanged. A failure record
may be handled separately; it must never make a failed publication appear
successful.

To prove source eligibility has not changed atomically, the future design needs
a transaction-visible source/coverage revision or snapshot identity (or an
equivalent locked re-read of authoritative persisted inputs and eligibility).
External authorization state cannot be protected merely by locking the
observation tables; its authoritative version and freshness policy must be
defined before activation.

## Phase 21 publication request and transaction contract

[`publication-transaction.ts`](../lib/bora-engine/publication-transaction.ts)
defines the typed input to a future privileged publication operation. The
request carries:

- a caller-supplied stable UUID `requestId`; it is never generated or replaced
  by the pure module;
- `evaluationReferenceHour` and the expected Engine state `revision` and
  `referenceHour`, which must agree;
- an explicit expected current pointer, either `{ status: 'initial' }` or a
  concrete existing publication UUID;
- a nonempty source/coverage snapshot identity, either an authoritative
  non-negative revision or stable identity;
- the evaluation result identity and literal `validationStatus: 'validated'`,
  its reference hour, explicit active and excluded-Vault song ID sets, and the
  chart header totals; and
- the entire ordered entry set. Active entries have contiguous zero-based
  positions and ranks `1..N` in rank order; Vault entries follow in ascending
  song-ID order and carry null rank/result values. The validator checks that
  the entries' IDs and lifecycles exactly match the evaluation's active and
  excluded-Vault ID sets. Song IDs and reference identities are validated,
  duplicates rejected, and values checked against the publication schema's
  numeric bounds.

The `validated` marker and result identity are binding request data, not
cryptographic proof that the caller ran the Engine. A future trusted caller
must derive them and every entry from a `ready` result of the publication gate.
The database operation must compare the submitted candidate with that bound
identity and must not trust an application assertion as its atomicity check.
Missing IDs, revisions, pointer state, source snapshot identity, or candidate
data are rejected; no defaults or replacement identifiers are supplied.

The transaction outcome union distinguishes `published`,
`already-published`, `not-ready`, `stale-state`, `lease-conflict`,
`invalid-publication`, `failed`, and `commit-unknown`. The pure
`validatePublicationRequest` validates shape and complete ordered entries;
`assessPublicationRetry` compares a retry with an authoritative existing
request record. A repeated request ID with the identical full candidate may
resolve to `already-published`, an in-progress lease conflict, or a
commit-unknown reconciliation state. Reusing the ID with any changed
evaluation identity, expected revision/pointer, source snapshot, header, or
entry is `invalid-publication` (`idempotency-key-reused`). These helpers only
decide from supplied values; they do not establish what is in the database.

If a timeout or connection loss occurs after a commit could have happened, the
caller must return `commit-unknown` with the same `requestId`. It must query a
future authoritative reconciliation operation by that ID before deciding what
to do. If the record is published with the same candidate, return the stored
publication ID; if an identical request is still in progress, do not start a
second publisher; if no commit or active claim exists, a retry may use the same
ID and structurally identical validated candidate. Never retry with a newly
generated ID to bypass an unknown result.

Concurrent callers must serialize/claim the publication slot for the
evaluation hour and lock the singleton publication head. The database must
compare the expected prior pointer under that lock; a second publisher based
on an obsolete pointer or state revision returns `stale-state`, rather than
silently replacing the first publisher's result. A stale worker must lose its
claim/lease and cannot advance the head. The pure module cannot enforce these
concurrency properties.

The future privileged database operation must commit all of the following as
one transaction:

1. Lock or claim the hour's publication slot and enforce request-ID
   idempotency, rejecting a different candidate for an existing ID.
2. Lock and verify the expected Engine state revision and reference hour and
   the expected current-publication pointer (including explicit initial state).
3. Re-read or lock the authoritative current source/coverage snapshot and
   verify it still matches the submitted snapshot identity and eligibility.
4. Validate the complete candidate and its evaluation identity, including
   every ordered entry and the exact active/Vault population.
5. Insert the evaluation-run/publication header and every entry; confirm the
   exact expected entry count.
6. Advance the current-publication pointer only after all candidate rows have
   been written and checked.
7. Persist the idempotency outcome and successful completion status with the
   publication.

Any failed precondition, mismatch, exception, or incomplete write must roll
back the whole transaction: no partial publication may become current, and the
previous pointer and its entries remain unchanged. If the transaction's commit
result cannot reach the caller, the result is `commit-unknown`; reconciliation
by `requestId` determines whether the atomic commit succeeded.

The request validator and retry helper are application-level validation only.
They are not a substitute for transaction isolation, locks, uniqueness,
row-count checks, or rollback. The current migrations do not express this
publication operation. A later migration will need a service-role-only
publication RPC/transaction plus durable idempotency/claim storage that binds a
request ID to its exact candidate and stored outcome. It must serialize
publishers by evaluation hour, protect the singleton head and state/snapshot
checks, and support lookup/reconciliation by request ID. Existing
`bora_engine_evaluation_runs.request_key` alone does not preserve the complete
candidate or a publication-attempt lease, and `bora_engine_publications` has no
per-hour uniqueness constraint. No migration or RPC was added in this phase.

## Exact future integration point and remaining prerequisites

The integration point is **after** `loadAndEvaluateBackendChart` has built the
Engine input and returned its validated `ready` evaluation, and **before** any
future publisher persists a publication. At that point, the future caller must
provide the evaluated input's reference hour/population, the authoritative
state revision, expected current publication, current source assessments and
per-song coverage snapshot, and the explicit evaluator outcome to
`assessPublicationGate`. Only a `ready` result may be converted into a complete
`PublicationTransactionRequest` and passed to a future trusted atomic
publication operation. Neither the gate nor request contract is currently
called from this or any live path.

Before activation, the project still needs:

- a trusted, authorized source/coverage loader that provides source identity
  and complete per-song/hour evidence alongside the exact evaluated state;
- a defined authoritative source-eligibility snapshot/version and freshness
  policy that the publication transaction can recheck;
- a publication persistence interface and trusted atomic SQL operation that
  implements all seven transaction steps above, including state revision,
  reference hour, exact snapshot, complete entries, pointer update, and
  successful-run completion, plus durable same-candidate idempotency,
  serialized slot claiming, and request-ID reconciliation for unknown commits;
- wiring at the specified integration point, with failure and stale-snapshot
  outcomes surfaced rather than treated as success; and
- separate rollout approval and end-to-end verification before any Engine
  activation or change to public chart behavior.

## Phase 25 coverage-evidence contract

The shared record model in
[`coverage-evidence.ts`](../lib/bora-engine/coverage-evidence.ts) identifies
input kind, song, UTC hour or explicit interval, expected and actual source,
evidence ID and/or revision, assessment time, outcome, currentness, and a
reason when unusable. Its canonical outcomes are `complete`, `checked-empty`,
`unavailable`, `failed`, `invalid`, `incomplete`, `stale`, and `unresolved`.
Missing rows are not empty coverage. An explicit zero is usable only when
backed by complete attributable evidence; checked-empty evidence does not
manufacture an observation value.

The internal evaluation gate now requires independent vote and seed evidence
and separately authoritative identity/revision for each active song, input
kind, and each of the 72 UTC hours `H-71 … H`. Platform history is
independent and requires source-matched evidence for every required
platform/song/hour in `H-167 … H`, with separately supplied per-song,
platform, and hour authority. The publication gate forwards the same
authoritative evidence references before it can return `ready`. The hourly
runner remains separate: it needs vote and seed evidence for the closed
transition hour and platform evidence over its existing 168-hour window. A
completed rollover does not prove 72-hour evaluation history.

Readiness must compare each evidence record with an independently supplied
authority (source identity plus revision or stable evidence ID). Matching an
evidence record against its own claimed identity is insufficient. The current
draft persistence schema and RPC responses do not provide that authority or
durable currentness/invalidation, so the persistence adapter reports missing
evidence as unresolved/not-ready rather than trusting status-only results.
No claim is made that a draft migration is applied or that evidence
provenance/freshness has been verified in a database.

A newly accepted late vote stays assigned to the UTC hour derived from its
original committed event timestamp. It invalidates the vote-history evidence
for that hour and dependent 72-hour evaluation snapshots containing that hour.
Reconciliation is required before those snapshots can again be considered
current. A future transaction must first deduplicate `(sourceSystem,
sourceEventId)` and compare the full event payload so exact retries do not
duplicate the event or invalidation and conflicting identity reuse fails
closed. Corrected platform observations must follow append-only
supersession; neither old evidence nor published snapshots may be silently
rewritten.

Before activation, persistence must atomically record accepted-event
deduplication, history updates and coverage invalidation, expose stable source
and evidence revision comparisons to evaluation, and support safe concurrent
updates and retry-safe reconciliation. A known transaction failure must be
distinguished from an unknown commit outcome. Publication still requires its
own immutable snapshot transaction, complete entries, explicit current-pointer
advancement, and successful completion record. None of those writers,
ingestion, public chart routes, voting behavior, or production publication is
activated by this contract.

For vote ingestion, the event row, exactly-once bucket update, and coverage
invalidation must be one transaction. A known rollback is a failure. If the
client loses the outcome after commit may have occurred, return
`commit-unknown` and reconcile by the original secure event ID plus its full
canonical payload before retrying; do not claim failure or retry with a new
identity. The current `0012` vote ledger and status-only coverage draft do not
implement that contract.
