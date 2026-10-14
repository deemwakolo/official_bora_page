# BORA Engine Durable Ingestion — Adversarial Concurrency Review

**Status:** Review only. No code, migration, RPC, SQL function, or database state
was created or changed. This document reviews
`docs/bora-engine-durable-ingestion-design.md` against the current source and
schema drafts, which are treated as authoritative.

**Evidence basis.** Claims cite the design (`§B`–`§H`) and actual source/schema:
`supabase/migrations/0012`, `0014`, `0015`, `0016`;
`lib/bora-engine/vote-event-ingestion.ts`, `coverage-evidence.ts`,
`publication-gate.ts`, `publication-transaction.ts`.

**Proven PostgreSQL behavior used in this review** (distinct from assumptions),
under the default `READ COMMITTED` isolation used by Supabase/PostgREST:
(1) `SELECT … FOR UPDATE` on a nonexistent row locks **nothing** — no gap/predicate
lock; two transactions can both observe "absent."
(2) Each statement takes a **new snapshot**, so a re-read after a block or a
savepoint rollback sees rows committed in the interim.
(3) A unique-constraint check against an in-flight conflicting tuple **blocks**
until that tuple commits/aborts; `unique_violation` is raised only after the
winner commits.
(4) A caught PL/pgSQL exception rolls back to an **implicit savepoint**, releasing
locks acquired inside the block; later statements run in a fresh subtransaction.
(5) Table lock modes: `SELECT … FOR UPDATE` = `ROW SHARE`; `INSERT/UPDATE/DELETE`
= `ROW EXCLUSIVE`; `LOCK TABLE … IN SHARE MODE` = `SHARE`. `SHARE` conflicts with
`ROW EXCLUSIVE`; `ROW SHARE` and `SHARE` do not conflict.
(6) `40001` (serialization_failure) and `40P01` (deadlock_detected) are only safely
handled by retrying the whole transaction.

---

## A. Executive verdict

**Safe only after specified changes.** The design's goals are correct and its
single-transaction framing (event + bucket + invalidation atomically) is sound.
Four defects must be corrected before implementation, and one policy chosen:

1. **Deadlock (Case B, Critical).** Ingestion locks `song_state` row **first** then
   the bucket; `commit_hour` locks `SHARE` tables **first** then `song_state` rows.
   The opposite order on `song_state` vs `vote_buckets`/`hourly_input_coverage`
   produces a real ingestion-vs-rollover deadlock.
2. **Publication freshness not serialized (Case D, Critical).** Ingestion
   invalidation does not bump the state head, so the design's state-head revision
   CAS cannot detect it; a non-locking coverage recheck does not contend with
   ingestion, so a stale publication can still commit.
3. **Misleading identity lock (Case A, High).** Step 3's `SELECT … FOR UPDATE`
   "lock the identity slot" locks **nothing** when the identity is absent.
   First-insert correctness rests entirely on the unique constraint plus a correct
   exception-handler re-read, which must be specified precisely.
4. **Closed-hour policy undecided (Case E, Blocking).** Late-event handling for a
   closed hour (U-3/U-4) is a business decision the design flags but must resolve
   before the transaction can be finalized.

Unknown-commit reconciliation (Case C) is **recoverable as designed**, but only if
"absence" is never treated as proof of non-commit and the retry always re-runs the
full idempotent transaction — a precision the current text needs.

## B. Findings ranked by severity

| # | Severity | Finding | Reference |
| --- | --- | --- | --- |
| F1 | **Critical** | **Deadlock: ingestion vs rollover lock order.** Ingestion order = `song_state` row `FOR UPDATE` → event → `vote_buckets` (`ROW EXCLUSIVE`) → `hourly_input_coverage` (`ROW EXCLUSIVE`). `commit_hour` order = run row → state head `FOR UPDATE` → `LOCK TABLE … IN SHARE MODE` on six tables → `song_state` row updates. Ingestion holds `song_state` row and waits for `vote_buckets`; rollover holds `vote_buckets` SHARE and waits for `song_state` row. Circular wait. | Design `§B` step 2, `§E`; `0014` lines 422–442, 600–606 |
| F2 | **Critical** | **Publication freshness not serialized (Case D).** Ingestion invalidation updates coverage currentness but does **not** bump `bora_engine_hourly_state_head.revision`. Publication's `expectedState.revision` CAS therefore cannot detect it. The coverage recheck is a non-locking `READ COMMITTED` read, so it does not contend with ingestion's `ROW EXCLUSIVE` write. A publication can read "current," a late vote can commit invalidation, and the publication can still commit stale. | Design `§H` steps 1–3, `§E` lines 345–350; `0014` lines 608–619; `publication-transaction.ts` lines 121–129 |
| F3 | **High** | **Identity lock is a no-op when absent (Case A).** Step 3 `SELECT … FOR UPDATE` locks nothing for an unseen identity; two transactions both see `null`. The "lock the identity slot" comment is inaccurate. Correctness depends wholly on `unique (source_system, source_event_id)` plus a correct `unique_violation` handler re-read. For the *same* song the `song_state` lock coincidentally serializes; for a *conflicting-song* identity it does not. | Design `§B` step 3 (lines 100–104), `§E` lines 335–339; `0012` line 78 |
| F4 | **High** | **Unknown-commit "absent ⇒ retry" under-specified (Case C).** `§E` states "row absent → the commit did not occur." A single non-locking read cannot prove non-commit while the original may still be in flight. The safe action (re-run the full idempotent transaction) is correct but the *reason* must be the unique constraint as arbiter, not the absence read. | Design `§E` lines 368–379 |
| F5 | **Medium** | **No deadlock/serialization retry boundary.** Neither design nor RPC contract states callers must retry `40P01`/`40001` with bounded backoff. The transaction is idempotent so retry is safe, but it must be explicit. | Design `§E` lines 358–363 |
| F6 | **Medium** | **No deterministic bucket rebuild/recount (Case F).** Buckets are aggregates over immutable events; the design specifies no recount-from-`bora_engine_vote_events` procedure to detect/repair drift, and leaves recompute policy open (U-4). | Design `§F` item 5, U-4; `0012` lines 87–106 |
| F7 | **Medium** | **Bootstrap/readiness mismatch confirmed.** `0015` requires `active × 506`; evaluation needs `active × 648`. `0016` vote/seed readiness also checks only the single `v_closed_hour`, not the 72-hour window. | `0015` lines 147–166; `0016` lines 106–115; design `§F` item 8 |
| F8 | **Low** | **Bucket `phase_for(hourIndex, now())` for late events.** For a first late event creating a bucket row for an already-closed hour, `phase_for` must yield `CLOSED`; the `ON CONFLICT DO UPDATE` does not rewrite `phase`, so an existing row keeps its phase but a new row depends on `phase_for` correctness. | Design `§B` step 5 |
| F9 | **Low** | **Provenance columns absent from ledger (design F.1).** Exact-retry payload comparison needs `voter_ref`/`identity_method`/`identity_version`/`idempotency_key`; `0012` lacks them. Confirmed prerequisite, not optional. | `0012` lines 64–82; design `§7`, `§F` item 1 |

## C. Concurrency timeline for each material race

### Case A — First insert race (same previously-unseen identity)

```
I1                                     I2
-- validate                          -- validate
SELECT ... FOR UPDATE  -> null       SELECT ... FOR UPDATE  -> null  (nothing locked; F3)
INSERT event (E)      -> ok          INSERT event (E)  -> BLOCKS on unique index (proven #3)
bucket +1             -> ok
COMMIT                            ->  unique_violation raised (winner committed)
                                        handler re-reads E (fresh snapshot; proven #2,#4)
                                        payload matches -> already-ingested; NO increment
```
**Verdict:** Safe *only* because the unique constraint is the arbiter. If the
loser instead ran a bare `resolve_identity_collision` that assumed absence meant
"not committed" (F4), it could double-insert. Note the same-song `song_state`
lock does **not** serialize the conflicting-song identity case; only the unique
index does. The correct loser action is to catch `unique_violation`, re-read in
the handler, and compare payload — never to re-insert.

### Case B — Deadlock (ingestion vs rollover) — F1

```
Ingestion (event for song X, hour H)      commit_hour (closing hour H)
------------------------------------      ----------------------------------
lock song_state row X  (FOR UPDATE)
                                          lock run row H
                                          lock state head  (FOR UPDATE)
                                          LOCK TABLE vote_buckets IN SHARE MODE  -> ok
                                          LOCK TABLE hourly_input_coverage IN SHARE -> ok
INSERT event  -> ok
INSERT bucket (X,H) -> ROW EXCLUSIVE
     BLOCKS: vote_buckets held SHARE
                                          update song_state (all ACTIVE, incl. X)
                                               BLOCKS: row X held FOR UPDATE by ingestion
  *** DEADLOCK: ingestion waits on vote_buckets, rollover waits on song_state row X ***
```
PostgreSQL detects `40P01` and aborts one. The abort is a *correct* outcome but
an avoidable liveness failure; under load it recurs. See §D for the fix.

### Case C — Unknown commit (in-flight original)

```
T0  ingestion commits event+bucket+invalidation; response lost
T1  reconciler SELECT identity -> ABSENT (uncommitted? no—committed but...)
    ...if T0 truly committed, read shows it (proven #2). If the "commit" is still
    unresolved (e.g. replica lag is not a concern for the primary, but an
    in-flight uncommitted txn is), the read shows ABSENT though it may yet commit.
T2  "absent => retry immediately" (design §E) -> re-runs transaction
```
**Verdict:** Retrying the transaction is safe **because the unique index
arbitrates** (if the original later commits, the retry blocks then collides →
already-ingested). It is **not** safe to conclude "no commit occurred" from the
absence read itself (F4). Correct action is always "re-run the idempotent
transaction," never "the increment is definitely missing, force it."

### Case D — Evaluation/publish vs late vote — F2

```
Publication P                                Ingestion I (late vote, song X hour H)
----------------------                       ----------------------
load coverage: X/H = current
evaluate chart (uses X/H)
                                             COMMIT: event + bucket
                                                   + coverage[X/H] := invalidated
                                                   (state head revision UNCHANGED)
recheck coverage (READ COMMITTED read)
  -> may still read pre-commit "current"
     if recheck snapshot taken before I commits
publish snapshot + advance pointer  -> commits  (stale input, F2)
```
The state-head CAS does not fire (revision unchanged by ingestion). The coverage
recheck is non-locking, so it does not wait for I. A stale publication commits.
See §F for the required serialization boundary.

### Case E — Late vote during rollover — shares F1 lock ordering

Covered by the deadlock timeline above. Additionally, if the ingestion commits
*before* `commit_hour` takes its SHARE locks, `commit_hour`'s snapshot re-check
(`0014` lines 444–451) compares coverage against the loaded snapshot and returns
`stale-state`, which is the **correct** protective behavior — but only for the
snapshot fields it actually compares. Whether the late bucket increment should be
allowed at all for a closed hour is policy U-3 (§G).

### Case F — Bucket integrity

Same-transaction atomicity (event insert before bucket increment) plus the unique
constraint means: one new event ⇒ one increment; exact retry ⇒ zero (early return
at step 3); conflicting identity ⇒ zero (raise before step 5); rollback ⇒ neither.
Reconciliation re-running the idempotent transaction cannot repeat an increment.
The residual risk is **aggregate drift** from any path that writes buckets outside
this transaction; see §H.

## D. Recommended transaction and lock-order model

**One global lock order** that is compatible with `commit_hour`. `commit_hour`
acquires, in order: run row → state head → SHARE on `{song_state, vote_buckets,
seed_hours, platform_observations, hourly_input_coverage, hourly_closures}`. The
safe rule for ingestion is: **take the `song_state` row lock LAST among the
Engine-state tables, or (better) do not take a row lock that conflicts with the
SHARE table locks at all.** Two defensible options:

- **Option D1 (bucket-first, no song_state row lock).** Drop the `FOR UPDATE` on
  `song_state`. Serialize same-song events via the `vote_buckets` primary key
  instead: `SELECT … FOR UPDATE` on the `(song_id, hour_index)` bucket row (creating
  it if absent via `INSERT … ON CONFLICT DO NOTHING` first, then `FOR UPDATE`).
  Lock order becomes: event identity (unique index) → `vote_buckets` row →
  `hourly_input_coverage` row. This never touches `song_state` for locking, so the
  rollover's `song_state` update cannot circularly wait. The `song_state` read for
  song validation becomes a plain `ACCESS SHARE` read.
- **Option D2 (song_state last).** If a `song_state` lock is genuinely needed for
  lifecycle checks, take it **after** `vote_buckets` and
  `hourly_input_coverage` — matching the direction rollover ultimately needs — and
  keep it a row lock only (never escalate). This is more fragile; D1 is preferred.

**Deadlock/serialization retry boundary (F5).** The RPC must let `40P01`/`40001`
propagate to the caller (do not swallow them into `persistence-failure`). The
caller (worker/poller) retries the **entire** transaction with the **same**
identity and payload, bounded attempts + exponential backoff + jitter. Because the
transaction is idempotent (unique index + early `already-ingested` return), a
retry after any abort re-enters cleanly. Never retry only the bucket increment.

**Ordering inside the transaction** (revised): validate → read `song_state`
(ACCESS SHARE, validation only) → `INSERT` event (unique index arbitrates) →
lock/upsert `vote_buckets` row (+1) → update `hourly_input_coverage` currentness +
insert invalidation. All writes are in one transaction; a rollback removes all.

## E. Safe unknown-commit reconciliation protocol

The invariant: **the unique index, not a read, is the source of truth about
whether an event committed.** Absence in one read is never proof of non-commit
while the original may still be in flight.

1. After a `commit-unknown`, the reconciler does **not** decide from a single
   `SELECT`. It re-runs the **full idempotent ingestion transaction** with the same
   identity and payload.
2. The re-run's own `INSERT … event` collides with the unique index **iff** the
   original committed. If it collides → catch `unique_violation`, re-read, compare
   full payload → `already-ingested` (original committed) or `conflicting-identity`
   (fail closed). If it does not collide → the original did not commit; this run
   performs the insert + single increment.
3. Concurrent reconciliations and an original that is still resolving are all
   serialized by the same unique index; at most one insert wins, all others resolve
   to `already-ingested`. Exactly-once increment holds regardless of interleaving.
4. Three-way outcome distinction:
   - **Confirmed commit:** a read (after the transaction's outcome is known, or a
     post-retry `already-ingested`) shows the identity with matching payload.
   - **Confirmed rollback:** the original call returned a definite error
     (`persistence-failure`, a raised exception surfaced to the client). No commit
     occurred; a fresh run will insert.
   - **Commit outcome still unknown:** the transport dropped. Never report failure;
     never force an increment. Resolve only through step 2's idempotent re-run.

This corrects F4: the design's *action* (re-run the transaction) is right; its
*justification* ("row absent → commit did not occur") must be replaced with "the
unique index arbitrates; a re-run is safe under every timing."

## F. Evaluation/publication freshness boundary

Invalidation alone cannot revoke an already-committed publication, and the
state-head revision CAS cannot see an ingestion invalidation (F2). The minimum
shared serialization boundary:

- **F-a: Make ingestion bump a monotonic, publication-visible revision.** Route
  coverage invalidation through a counter the publication compares-and-sets on.
  Concretely, either (i) ingestion increments `bora_engine_hourly_state_head.
  revision` for the affected hour's window (couples ingestion to rollover state —
  heavier), or (ii) add a per-`(song_id, input_type, hour_index)` `revision` on
  `hourly_input_coverage` that ingestion bumps on invalidate and that the
  publication recheck reads and pins. Option (ii) is the cleaner boundary.
- **F-b: Recheck under a lock that contends with ingestion.** The publication
  transaction must not use a bare non-locking read for the freshness recheck. It
  should `SELECT … FOR SHARE` (or `FOR UPDATE`) the coverage rows it depends on, or
  take `LOCK TABLE hourly_input_coverage IN SHARE MODE`, so a concurrent ingestion
  `UPDATE` (ROW EXCLUSIVE) either (a) blocks until the publication commits — making
  the ingestion the later writer, which then correctly invalidates for the *next*
  evaluation — or (b) commits first, causing the recheck to observe `invalidated`
  and abort. Either way the stale publication is prevented.
- **F-c: Pin revisions into the snapshot.** The publication request carries the
  expected coverage `revision`/`evidence_id` per slot (as `expectedState` does for
  the state head). The commit step asserts they are unchanged; any mismatch →
  `stale-state`, no write.
- **F-d: Immutable history preserved.** A publication that has already committed
  is never revoked; a late vote only invalidates *future* eligibility. This matches
  the design `§D` and `publication-transaction.ts` immutability contract.

The decisive point: **F-b provides the mutual exclusion; F-a/F-c provide the
detect-and-abort.** The current design has neither wired for ingestion
invalidations, which is why F2 is Critical.

## G. Late-event versus rollover decision required

The design flags U-3/U-4 but leaves the policy open. It must be selected before
implementation; this review does **not** choose it. The options:

- **G1: Reject late events for closed hours.** Ingestion checks the bucket's
  `phase`; if `CLOSED` (or the hour is behind the state-head reference), return a
  deterministic `late-hour-rejected` outcome with **no** event/bucket/invalidation
  write. Simplest; keeps closure snapshots authoritative and avoids re-opening a
  decayed hour. Cost: those votes never reach Engine history (they remain in
  `vote_events` as source truth).
- **G2: Accept and reconcile through a controlled correction path.** The event is
  persisted (ledger append) and invalidation recorded, but the bucket/decay is
  repaired via an explicit correction workflow rather than a silent +1 on a closed,
  already-decayed hour. Requires a defined recompute (U-4/§H) and an operator
  gate.
- **G3: Accept and increment the closed-hour bucket live.** The design's step-5
  `+1` proceeds even for a closed hour; the closure snapshot stays immutable and
  the next evaluation reads the updated bucket. Risk: the closed hour's `C` no
  longer matches the closure's recorded `source_bucket_version`, so replay/recompute
  semantics must be pinned.

Whichever is chosen, `phase_for(hourIndex, now())` (F8) must deterministically
classify a late hour as `CLOSED`, and the chosen policy must be reflected in the
deterministic result set (a new outcome like `late-hour-rejected` for G1).

## H. Bucket-integrity and reconciliation recommendation

The single-transaction design already gives: one new event ⇒ one increment; exact
retry ⇒ none; conflicting identity ⇒ none; rollback ⇒ neither; reconciliation
re-run ⇒ never repeats (unique index arbitrates). The residual risk is **drift**:
aggregate bucket counters (`upvotes`/`downvotes`) are a materialized sum over the
immutable `bora_engine_vote_events` rows. Any writer outside this transaction — a
future migration, a manual repair, a bug — can desynchronize them, and nothing in
the schema or design detects it.

Recommendation:
- **Deterministic rebuild procedure.** Provide (as a future, separately-approved
  trusted operation) a recount that recomputes each `(song_id, hour_index)` bucket
  as `count(*) filter (vote_type='up')` / `filter (vote_type='down')` directly from
  `bora_engine_vote_events`, in the same transaction shape, guarded so it cannot
  run concurrently with ingestion for the affected songs. This is the canonical
  repair and the authority for detecting drift.
- **Verification query** (read-only, for readiness/audit): compare each bucket's
  counters against the event recount; any mismatch blocks readiness until repaired.
- **Do not** treat the bucket as authoritative over the ledger; the ledger is the
  immutable source, the bucket is a cache. This resolves the direction of U-4: an
  invalidated hour is repaired by recount from the ledger, not by trusting a
  possibly-drifted aggregate.
- Keep the optional `last_source_event_id` on the bucket (design `§F` item 5) as an
  audit breadcrumb, but the recount — not the breadcrumb — is the integrity proof.

## I. Verified coverage arithmetic and bootstrap discrepancy

**Logical coverage slots per active song (evaluation-complete):**
- vote-history: `C_WINDOW_HOURS` = 72 hours (`H-71 … H`).
- seed-history: 72 hours (`H-71 … H`).
- platform-observation-history: `PLATFORM_WINDOW_HOURS` = 168 hours × 3 platforms
  (YouTube, Spotify, Boomplay) = 504.
- **Total = 72 + 72 + 504 = 648 logical slots per song.**

This is confirmed from the actual readiness logic: `assessVoteSeedHistoryCoverage`
loops `hourIndex = startHour … referenceHour` for a 72-hour window over both
`VOTES` and `SEED` (`vote-event-ingestion.ts` lines 418–419, using
`C_WINDOW_HOURS`), and `source-readiness.ts` requires platform coverage across the
168-hour window for each of the three platforms.

**Bootstrap draft (`0015`) actually checks 506 (confirmed from SQL):**
```
(c.input_type in ('VOTES','SEED') and c.hour_index = p_reference_hour)   -- 1 + 1 = 2
or (c.input_type in ('YOUTUBE','SPOTIFY','BOOMPLAY')
    and c.hour_index between p_reference_hour - 167 and p_reference_hour) -- 168*3 = 504
=> 506 per active song                      (0015 lines 153–161: `<> v_active_count * 506`)
```

**Discrepancy = 648 − 506 = 142 per song**, entirely in the vote/seed windows:
bootstrap checks only the single reference hour for VOTES and SEED (2 slots) where
evaluation needs 72 + 72 (144 slots); the 504 platform slots match.

**Logical slots vs physical rows.** In this schema they are 1:1: the coverage
contract models one evidence record per `(song, input kind, UTC hour)`, and the
physical table `bora_engine_hourly_input_coverage` has PK
`(song_id, input_type, hour_index)` — exactly one row per logical slot. So 648
logical slots = 648 rows per song when fully populated. The distinction matters
only because a physical row can exist with a non-`COMPLETE` status, or (after
design `§F` item 2) with `currentness <> 'current'`; those still occupy a slot but
do not satisfy readiness. Therefore a corrected predicate must count **satisfied**
slots (status `COMPLETE` **and** `currentness = 'current'` with matching
identity/revision), not mere rows.

**Recommended readiness predicate (do not implement here):** replace the `× 506`
constant with the evaluation-complete requirement — VOTES and SEED complete and
current for all 72 hours, and each of the three platforms complete for all 168
hours — i.e. `active × 648` satisfied slots, and align `0016`'s vote/seed check to
the full 72-hour window rather than the single `v_closed_hour`. This closes the
gap that lets bootstrap pass while the evaluation gate is `not-ready`.

## J. Explicit prerequisites for authorizing implementation

Implementation must not begin until all of the following are satisfied:

1. **Lock-order fix (F1) accepted.** Choose Option D1 (preferred: no `song_state`
   row lock; serialize via the `vote_buckets` PK) or D2, and document the single
   global lock order shared with `commit_hour`. Confirm by inspection that no
   ingestion path takes `song_state` before `vote_buckets`/`hourly_input_coverage`.
2. **Publication freshness boundary (F2) designed.** Adopt §F: a
   publication-visible per-slot revision (or state-head bump) **plus** a recheck
   under a lock that contends with ingestion (`FOR SHARE` / `LOCK TABLE … IN SHARE`),
   **plus** pinned revisions in the publication request. Without all three, a stale
   publication remains possible; this gates any future publication work.
3. **Identity-race specification (F3) corrected.** Replace the "lock the identity
   slot" language with: the unique index is the arbiter; the `unique_violation`
   handler re-reads in a fresh snapshot and compares the full payload; never
   re-insert on collision.
4. **Unknown-commit justification (F4) corrected.** State that reconciliation
   always re-runs the full idempotent transaction; absence in a read is never
   proof of non-commit; the unique index arbitrates.
5. **Deadlock/serialization retry boundary (F5) specified.** `40P01`/`40001`
   propagate to the caller and are retried as whole idempotent transactions with
   bounded backoff; never swallowed as `persistence-failure`.
6. **Late-hour policy (Case E / U-3, U-4) chosen** from §G (G1/G2/G3) and
   reflected in the deterministic result set. `phase_for` must classify late hours
   deterministically (F8).
7. **Bucket rebuild/recount (F6) specified** as the canonical drift repair, with a
   readiness verification query; ledger is authoritative, bucket is a cache.
8. **Provenance columns (F9) added** to the ledger (design `§F` item 1) so
   exact-retry payload comparison is possible.
9. **Bootstrap/readiness alignment (F7)** planned: `× 506` → evaluation-complete
   `× 648` satisfied slots, and `0016` vote/seed check extended to the full 72-hour
   window.
10. **Schema-gap items in design `§F`** (coverage enrichment, invalidation table,
    seed authority) confirmed as prerequisites, not optional.

---

## Confirmation of boundaries

Review and documentation only. No application code, migration, RPC, SQL function,
or database state was created or modified; no migration was applied; no live
voting, feature flag, scoring, or publication behavior was changed. No tests,
builds, TypeScript checks, or lint were run; the dev server was untouched. All
existing worktree changes are preserved. This review adds exactly one document,
`docs/bora-engine-durable-ingestion-review.md`. `NEXT_PUBLIC_BORA_SECURE_VOTING`
remains off.







