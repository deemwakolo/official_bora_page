# BORA Engine Final Transaction Consistency Review

**Status:** Review only. This is the final, narrowly scoped technical review of
`docs/bora-engine-corrected-transaction-design.md` to decide whether it is safe to
proceed to implementation planning. No application code, existing design/review
document, migration, RPC, SQL function, or database state was created or modified.
No implementation was performed.

**Evidence.** Findings cite the corrected design by section/line and the supporting
source/schema by file:line — `supabase/migrations/0012`, `0014`, `0015`, `0016`;
`lib/bora-engine/coverage-evidence.ts`, `vote-event-ingestion.ts`,
`publication-transaction.ts`, `publication-gate.ts`, `persistence.ts`; and
`engine/src/engine/constants.ts`. Migrations are **unapplied drafts**.

**Proven PostgreSQL behavior treated as established** (distinct from assumptions):
- **PG1.** `INSERT … ON CONFLICT (cols) DO NOTHING RETURNING …` speculatively
  inserts; on a conflict with an **uncommitted** tuple it **waits** for that
  transaction; if that transaction **commits**, the statement skips and `RETURNING`
  yields **no row**; if it **rolls back**, the insert **proceeds** and `RETURNING`
  yields the new row. `RETURNING` is non-null **iff this transaction won the insert.**
- **PG2.** Under `READ COMMITTED` each **statement** takes a fresh snapshot. A
  **separate subsequent** `SELECT` therefore sees a row that a concurrent transaction
  committed while an earlier statement was blocked.
- **PG3.** A caught PL/pgSQL `unique_violation` rolls back to an implicit savepoint;
  subsequent statements run with a fresh snapshot and the transaction stays usable.
- **PG4.** Lock modes: plain `SELECT`=`ACCESS SHARE`; `SELECT … FOR UPDATE`=`ROW
  SHARE`+row lock; `SELECT … FOR SHARE`=`ROW SHARE`+shared row lock;
  `INSERT/UPDATE/DELETE`=`ROW EXCLUSIVE`; `LOCK TABLE … IN SHARE MODE`=`SHARE`.
  `SHARE` conflicts with `ROW EXCLUSIVE`; `SHARE`/`ACCESS SHARE` do not conflict;
  a row `FOR SHARE` conflicts with a concurrent row `UPDATE`.

---

## A. Executive verdict

**CONDITIONAL GO: SPECIFIED CORRECTIONS REQUIRED.**

The corrected design's core guarantees are sound and its PostgreSQL reasoning is
correct. It genuinely resolves the two Critical defects from the prior review:

- **Identity claim (F3):** resolved. Replacing `SELECT … FOR UPDATE` with
  `INSERT … ON CONFLICT DO NOTHING RETURNING` (design §B:94–100) makes the unique
  index the sole arbiter, and the design correctly uses a **separate fresh
  statement** (§B:105) — not a same-statement CTE — to read the winner.
- **Deadlock (F1):** resolved. Ingestion takes **no `song_state` write lock** (R1,
  §C.2:191–196); its bucket→coverage order is a compatible subsequence of
  `commit_hour`'s lock order (`0014:437–442`), so no circular wait exists.

The publication-freshness guarantee (F2) is **correctly designed** (§F) but is
**entirely contingent** on schema columns and a publish RPC that do not exist in the
drafts — honestly marked as prerequisites (§F.4, §J), not claimed as present.

Two **technical precision corrections** are required before implementation planning
(critical-severity of *documentation*, not of *safety*), plus the already-flagged
prerequisites and one product decision must remain explicit:

- **C-1 (Medium):** the §B exception handler for a `unique_violation` from a
  **non-identity** constraint conflates it with an identity conflict (see §B below).
- **C-2 (Medium):** the §C.3 Timeline-1 stale-detection mechanism is **mislabeled**,
  and the symmetric ordering (rollover wins the table lock, ingestion is blocked then
  proceeds into a closed hour) is not explicitly traced to the §G policy (see §C).

No finding rises to *fundamental guarantee unproven*. A GO here authorizes **only**
preparing an implementation plan — not writing SQL, creating migrations, or
activating ingestion.

## B. PostgreSQL identity-claim findings

The design's claim (§B:94–100) is: `INSERT … ON CONFLICT (source_system,
source_event_id) DO NOTHING RETURNING id INTO v_event_row_id`, then a **separate**
`SELECT` (§B:105) to read the winner when `v_event_row_id IS NULL`. This is the
correct construction. Verified against `0012:64–82` (`unique (source_system,
source_event_id)` at `:78`).

**Case A — T1 inserts unseen identity, uncommitted; T2 attempts same identity.**
`RETURNING` yields **no row** for T2. Per PG1, T2's speculative insert **waits** on
T1's in-flight tuple; the statement does not return yet. No `unique_violation` is
raised (the `DO NOTHING` target matches the constraint). The transaction remains
usable — it is simply blocked in one statement.

**Case B — T1 commits while T2 waits.** T2 unblocks; the conflict is now a committed
tuple, so `DO NOTHING` skips and `RETURNING` yields **no row** (`v_event_row_id IS
NULL`). T2 proceeds to the separate `SELECT` (§B:105), which under PG2 takes a fresh
snapshot and **sees T1's committed winner**. `canonical_payload_matches` runs on a
non-null row. No new savepoint or whole-transaction retry is needed — one extra
statement suffices.

**Case C — T1 rolls back while T2 waits.** T2 unblocks; the conflicting tuple is
gone, so T2's insert **proceeds** and `RETURNING` yields T2's new id. T2 owns the
identity and reaches step 4 (bucket). This is the only interleaving in which T2
increments, and it is correct because T1 left nothing behind.

**Case D — T1 commits; T2's subsequent query reads the winner.** This is Case B's
read step. The design uses a **separate statement**, so PG2 guarantees visibility.
The design does **not** rely on a same-statement CTE / `WITH … AS (INSERT …)
SELECT` fallback — which is correct, because such a CTE's `SELECT` shares the
statement's original snapshot and would **not** necessarily see a row committed
concurrently after the insert blocked. If an implementer refactors §B:105 into a
CTE to "save a round-trip," the Case-B/C guarantees break. The two-statement shape
is load-bearing and must be preserved.

**Case E — same identity, different canonical payload.** `DO NOTHING` returns no
row; the separate `SELECT` reads the committed winner; `canonical_payload_matches`
returns false → `BORA_ENGINE_EVENT_IDENTITY_CONFLICT` → whole-transaction rollback
(§B:112). No bucket write occurs (step 4 was never reached). **Prerequisite, not a
present capability:** the full nine-field comparison (including `voter_ref`,
`identity_method`, `identity_version`, `idempotency_key`) is impossible against
today's `0012` ledger, which has **no** provenance columns (`0012:64–82`). The
design marks this a §J.1 prerequisite (provenance columns); against the current
draft only `song_id`/`vote_type`/`hour_index`/`occurred_at` are comparable. Full
conflict detection therefore depends on the §J.1 schema change — it is a
prerequisite, not something the current schema enforces.

**Case F — uniqueness conflict from another constraint.** The design's P3 note
(§B:155–163) is correct that `ON CONFLICT (source_system, source_event_id)` does
**not** intercept a `unique_violation` from a **different** unique index (e.g. the
`id` PK `gen_random_uuid()` — astronomically unlikely — or a future partial unique
index). Such a violation **aborts the statement**; per PG3, catching it in an inner
`BEGIN … EXCEPTION WHEN unique_violation` block rolls back to a savepoint, after
which a fresh `SELECT` reads the committed winner and the same payload comparison
resolves the outcome. The transaction remains usable (PG3); no whole-transaction
retry is required for this path.

**Correction C-1 (Medium).** The §B:155–163 handler text states that after a
non-target `unique_violation`, "the same `canonical_payload_matches` comparison
resolves to `already-ingested` or raises the conflict." That reasoning is **only
valid when the fired constraint is the identity constraint.** If the violation came
from a *different* unique index, the re-`SELECT` at §B:105 is keyed on
`(source_system, source_event_id)` and may return **no row** (the identity insert was
rolled back to the savepoint), leaving `canonical_payload_matches(NULL, …)`
undefined. The handler must **first inspect which constraint fired** (via
`PG_EXCEPTION.DETAIL` / `RETURNED_SQLSTATE` + constraint name) and:
- if it is the identity unique index → re-read + payload-compare (as written);
- otherwise → raise a distinct, non-retryable error **without** the identity
  payload-comparison, because a non-identity unique violation is an integrity fault,
  not a duplicate event. Technical correction; no product decision.

**Why no losing transaction can increment the bucket.** Step 4 (bucket upsert,
§B:118) is placed **strictly after** the claim resolves with a non-null id. In Cases
A/B/E the loser's claim resolves to **null** and control returns/raises before step
4. In Case C there is no loser. In Case F the statement aborted to a savepoint before
step 4. Because claim and bucket are in one transaction, a rollback at any point also
undoes any earlier write. The "no bucket increment before ownership" invariant
(§B:146–153) holds in every interleaving examined.

**Proven vs assumed.** PG1–PG4 are documented. What is **assumed**, not proven here:
(a) Supabase/PostgREST issues the whole procedure as one transaction (design A-α);
(b) the deployment isolation level is `READ COMMITTED` (design preamble; if a
transaction were `REPEATABLE READ`/`SERIALIZABLE`, Case B/C read-visibility and
retry taxonomy change — `40001` handling in §C.4 already covers `SERIALIZABLE`, but
the Case-B fresh-snapshot read would instead require a retry). Implementation must
confirm the actual isolation level.

## C. Rollover/ingestion locking findings

Verified against the actual `commit_hour` (`0014:364–640`). Its lock order is:
run row `FOR UPDATE` (`0014:404–408`) → state head `FOR UPDATE` (`0014:422–426`) →
`LOCK TABLE … IN SHARE MODE` on `song_state`, `vote_buckets`, `seed_hours`,
`platform_observations`, `hourly_input_coverage`, `hourly_closures`
(`0014:437–442`, in that order) → snapshot re-check (`0014:444–451`) → closure
inserts (`0014:551–598`) → `song_state` UPDATE (`0014:600–606`) → state-head CAS
(`0014:608–619`) → run completed (`0014:621–638`).

Ingestion's order (design §B) is: `song_state` SELECT `ACCESS SHARE` (`:89`) →
`vote_events` INSERT (`:94`) → `vote_buckets` upsert `ROW EXCLUSIVE` (`:118`) →
`hourly_input_coverage` UPDATE `ROW EXCLUSIVE` (`:130`) → invalidation INSERT
(`:137`).

**The bucket-first ordering is compatible — validated.** The only resources both
transactions touch are `vote_buckets` and `hourly_input_coverage`. Rollover takes
SHARE on them at `0014:438` then `:441` (vote_buckets **before** coverage);
ingestion takes ROW EXCLUSIVE at §B:118 then §B:130 (vote_buckets **before**
coverage). Identical relative order on the shared resources → no circular wait (P5).
Rollover's `song_state` UPDATE (`0014:600`) does **not** conflict with ingestion's
`ACCESS SHARE` on `song_state` (PG4: `ACCESS SHARE` conflicts only with `ACCESS
EXCLUSIVE`), which is precisely why dropping the `song_state` write lock (R1)
removed the F1 edge. Ingestion's `vote_events` row lock is never in rollover's set.

**Timeline A — new event while rollover is claiming/committing.** `claim_hour`
(`0014:191+`) takes only the run row; it does **not** take the six SHARE locks, so
ingestion is unimpeded during a claim. During `commit_hour`, if ingestion reaches its
bucket upsert first, rollover's `SHARE vote_buckets` (`0014:438`) waits on
ingestion's ROW EXCLUSIVE; ingestion then takes coverage (rollover has not yet
reached `:441`), commits, releases; rollover proceeds. If rollover takes SHARE first,
ingestion blocks at the bucket upsert until rollover commits. Either way ingestion
holds only `ACCESS SHARE song_state` + its own rows while blocked — nothing rollover
needs. **No circular wait.**

**Timeline C — rollover over many songs vs ingestion on one.** Rollover's
`vote_buckets` SHARE (`0014:438`) is **table-level**, so it blocks ingestion for
**all** songs, not just the song rollover is processing. This is a throughput
characteristic (ingestion is globally paused during a rollover commit, not per-song),
**not** a correctness defect. Worth recording for capacity planning.

**Timeline D — two distinct events, same song-hour.** Both claim distinct
`vote_events` identities (no conflict); both upsert bucket `(X,H)`. The first takes
the row lock; the second blocks, then — under `READ COMMITTED` `ON CONFLICT DO
UPDATE` — re-reads the committed row (EvalPlanQual) and applies `+1` on top. Both
increment exactly once; no lost update. Correct.

**Timeline E — ingestion invalidation vs coverage read.** A plain coverage
`SELECT` (readiness, or the rollover snapshot) is `ACCESS SHARE` and does **not**
block, nor is blocked by, ingestion's `ROW EXCLUSIVE` coverage UPDATE. For
**readiness**, a stale-current read is caught by a later locking recheck. For
**publication**, this is exactly the F2 race, which §F fixes with `FOR SHARE`. For
the **rollover snapshot**, `0014:441` takes table SHARE on `hourly_input_coverage`
**before** the snapshot at `0014:444`, so a concurrent ingestion coverage write for
the closed hour **blocks** until rollover commits — the rollover snapshot is taken
against a stable coverage set. The design does not call this out explicitly, but it
is the correct existing protection.

**Correction C-2 (Medium).** The design's §C.3 Timeline 1 (`:256–258`) states rollover
"will detect I1's change via the coverage `revision` bump (§E) → `stale-state` →
rollover retries." That attribution is wrong against the actual `0014` code, though
the *outcome* (retry) happens to be right for a different reason:

- The rollover snapshot's coverage projection selects **only `status`**
  (`0014:159–164`: `songId, inputType, hourIndex, status`). The design's invalidation
  (§B:130–136) sets `currentness`/`revision` and leaves `status='COMPLETE'`. So a
  coverage currentness/revision change is **invisible** to `v_snapshot->'coverage'`,
  even after §J adds those columns — because the snapshot query does not read them.
- What actually trips `stale-state` in Timeline 1 is the **bucket** change: the
  snapshot projects bucket `upvotes/downvotes/version` into `state`
  (`0014:92–99`), so I1's `+1` and `version+1` make `v_snapshot->'state'` differ from
  the loaded `p_expected_state`, and `0014:448` returns `stale-state`. The design
  cites the wrong column family.

Two concrete consequences for implementation:
1. **Coverage-only invalidations are not detected by the rollover re-check.** If an
   ingestion (or a future re-assessment) changes only `currentness`/`revision`
   without touching a bucket, `0014`'s re-check will not notice. For the closed hour
   this is masked because `0014:441` takes table SHARE on coverage *before* the
   snapshot, so a concurrent coverage write blocks and lands after commit (§G
   territory). But the design must not claim the re-check provides this guard.
2. **If the re-check is to detect coverage revisions, the snapshot must project
   them.** Extending `0014:159–164` to include `revision`/`currentness` is a
   **schema/RPC prerequisite** — not something the current draft provides, and not
   something §J currently lists. Minimum correction: add it to the §J prerequisite
   list, or state explicitly that rollover relies on the `0014:441` SHARE (not the
   re-check) to order coverage writes, and the re-check guards only buckets/state.

Both are documentation-precision fixes; neither reopening the lock-order proof nor
the identity claim. Technical; no product decision.

**Other checks — all clear.** No circular wait (above). No missing serialization for
absent rows: rollover's **table-level** SHARE serializes ingestion's bucket upsert
even when no `(X,H)` row exists yet (the ROW EXCLUSIVE INSERT still conflicts with
table SHARE), so the "row does not exist yet" gap is closed by the table lock, not
the row lock. Stale loaded-state commits cannot occur: the `0014:444–451` re-check
runs under the SHARE locks held from `:437` through commit, so no ingestion can
mutate the checked inputs mid-commit. A rollover closing an hour while ingestion
changes that hour's inputs is serialized by `0014:441` (ingestion waits, then writes
into a closed hour) — the §G late-event policy governs the *consequence*, and the
design correctly leaves it unresolved. One benign asymmetry: if no coverage row
exists for `(X,VOTES,H)`, the §B:130 UPDATE matches zero rows, yet the §B:137
invalidation-ledger INSERT still records the event — harmless (absent coverage is
already not-ready), noted for completeness.

## D. Publication freshness findings

The design's boundary (§F) is: pin every slot's `(song, input_type, hour, revision)`
in the candidate (§F.1), then in **one** publish transaction take state-head
`FOR UPDATE`, then `SELECT … FOR SHARE` on every dependent coverage slot, re-run
`assessCoverageEvidence` inside those locks, and only then insert the immutable
snapshot and advance the pointer (§F.2–F.3). Traced against
`publication-transaction.ts` (state-head CAS at :47–50; pointer CAS via
`expectedCurrentPublication`) and `coverage-evidence.ts` (`assessCoverageEvidence`
:222+, requiring source-identity + revision/evidenceId + `currentness='current'`).

**Both lock orders are deterministic — verified.**
- **P locks first (FOR SHARE on slot X/H):** ingestion's `UPDATE coverage(X,H)`
  (ROW EXCLUSIVE) **blocks** on P's FOR SHARE. P rechecks (sees `current`, revision
  == pinned) → passes → inserts snapshot → advances pointer → commits → releases.
  Ingestion then commits the invalidation. The publication legitimately captured a
  state that was current at its commit; invalidation affects only the *next*
  evaluation. Committed publication stays immutable. Deterministic, safe.
- **Ingestion commits first:** P's FOR SHARE recheck reads `currentness='invalidated'`
  and/or `revision != pinned` → `assessCoverageEvidence` returns
  `history-changed`/`revision-mismatch` → `not-ready` → **no pointer advance, no
  write**. Deterministic, safe.

Because P holds FOR SHARE from before its recheck through its commit, ingestion
cannot commit an invalidation inside that window (it blocks), so the "read current →
invalidation commits → publish stale" sequence is impossible. The revision pin
catches the case where ingestion committed *before* P began.

**Publication locks the same rows ingestion updates — confirmed.** Ingestion's
invalidation is `UPDATE … WHERE song_id AND input_type='VOTES' AND hour_index`
(§B:130), i.e. the `(song, input_type, hour)` row. P's FOR SHARE (§F.2 step 2) locks
that identical key. Same rows, so the contention is real.

**All required slots must be included — a completeness obligation.** The guarantee
holds only if P locks **every** slot its evaluation depends on: 72 vote + 72 seed per
song, plus 168×3 platform (the §I.1 set). Missing any slot reopens the F2 hole for
that slot. The design says "every coverage slot the candidate depends on" (§F.2) but
does not enumerate them in the RPC contract; the implementation must derive the lock
set from the same window set that readiness uses, not from a hand-maintained list.

**Prerequisites (design §F.4 — correct to mark them, not claim them).** None of this
exists today:
- `hourly_input_coverage` is **status-only** (`0012:169–183`) — no `revision`,
  `currentness`, `source_identity`, or `evidence_id` to pin, recheck, or lock on a
  revision comparison. A FOR SHARE on the row is possible today, but the *revision
  comparison* is not.
- There is **no** `bora_engine_publish_chart` RPC in the drafts; publication tables
  exist (`0012` publication tables) and `publication-transaction.ts` is a **pure,
  unwired** contract, but no writer RPC performs the FOR SHARE recheck + pointer CAS
  atomically.
- `publication-gate.ts` is a pure function; it cannot provide serialization.

So publication freshness is **correctly specified but not yet enforceable**. It is a
**prerequisite-gated** guarantee, exactly as the design labels it (§F.4, §J). A
previously committed publication remains immutable — the design does not claim
revocation, and the drafts enforce immutability on published snapshots.

**One addition the design should make explicit:** the publish transaction's lock
order (state head → coverage FOR SHARE) must also be a compatible subsequence of the
rollover order, otherwise publication-vs-rollover deadlocks. State head is first in
both (`0014:422` and §F.2 step 1), and rollover takes coverage SHARE at `0014:441`
*after* state head — so P's state-head-then-coverage is consistent with rollover.
Worth stating explicitly in §F so an implementer does not reorder them.

## E. Coverage/bootstrap findings

Verified from the actual schema and constants, not from earlier reports.

**Logical slots per active song.** `C_WINDOW_HOURS = 72` and
`PLATFORM_WINDOW_HOURS = PLATFORM_WINDOW_DAYS(7) × 24 = 168`
(`engine/src/engine/constants.ts:42, 45–48`). Per active song:
- VOTES (`vote-history`): `[R-71, R]` → **72**
- SEED (`seed-history`): `[R-71, R]` → **72**
- YOUTUBE: `[R-167, R]` → **168**
- SPOTIFY: `[R-167, R]` → **168**
- BOOMPLAY: `[R-167, R]` → **168**
- **Total = 72 + 72 + 168 + 168 + 168 = 648** — matches the design's §I.1 and the
  task's expected value. Confirmed.

**The bootstrap draft's 506 is insufficient — confirmed from SQL.**
`bora_engine_bootstrap_state` (`0015:147–161`) counts rows where
`(input_type in ('VOTES','SEED') AND hour_index = p_reference_hour)` — **1+1 = 2** —
OR `(input_type in ('YOUTUBE','SPOTIFY','BOOMPLAY') AND hour_index between
p_reference_hour-167 AND p_reference_hour)` — **3×168 = 504** — and requires
`count = active × 506` (`0015:161`). The vote/seed window is collapsed to the single
reference hour; the evaluation gate needs 72 vote + 72 seed = 144. **Shortfall = 648
− 506 = 142 per song, entirely vote/seed.** Bootstrap can therefore pass while
`assessVoteSeedHistoryCoverage` still reports `not-ready` for 71 missing prior vote
hours and 71 missing prior seed hours. The design's §I.2 is correct.

**Readiness is under-scoped on the same axis.** `bora_engine_readiness` (`0016:106–110`)
filters the VOTES check to `c.hour_index = v_closed_hour` (single hour) and requires
`count(COMPLETE) = v_active_count` (`0016:112–114`) — not the 72-hour window. Same
under-scoping as bootstrap, on the readiness side. Confirmed.

**Row count alone is not sufficient — the design is right to require more.** Both
drafts gate on `status = 'COMPLETE'` and a row count. Neither checks
`currentness`, `source_identity`, or `revision`/`evidence_id`, because those columns
do not exist (`0012:169–183`). A `COMPLETE` row can be `stale`/`invalidated` (after
§J) or unattributed and still satisfy a bare count. The corrected predicate (§I.3)
must, per `(input_type, hour)`, require: row exists; `status='COMPLETE'`;
`currentness='current'`; `source_identity` matches the expected authority; and a
stable evidence identity (`revision` non-null **or** `evidence_id` present) — exactly
the conjunction `assessCoverageEvidence` enforces (`coverage-evidence.ts:222+`), which
also rejects `revision===null && !evidenceId` as `evidence-identity-missing`
(`:268–286`). The design's "no blind numeric replacement" instruction is correct: a
`× 648` count would still admit `COMPLETE`-but-`stale` rows.

**Logical slots vs physical records.** In the draft schema these are **1:1**: the
coverage PK is `(song_id, input_type, hour_index)` (`0012:181`), so one logical slot
= one physical row. They diverge only after §J: a slot is *satisfied* only if its
single row carries `currentness='current'` + source match + evidence identity. A row
can exist (occupying the slot) yet not satisfy readiness. So "648 satisfied slots"
≠ "648 rows exist" — the predicate must count satisfied slots, which is why the
per-slot `assessCoverageEvidence` call (not a count) is required.

**Seed authority without inventing history.** Seed coverage is attributed to the
rollover's committed seed injection: `bora_engine_seed_hours` (`0012:147–164`) rows,
written by `commit_hour` (`0014:591–592` reads `sh.version`), carry `version` and
`origin_event_id`. A seed slot is `COMPLETE`+`current` only when a seed row (or an
authoritative checked-empty backed by the closure) exists, attributed to
`source_identity='seed-history'` with the closure's revision. `coverage-evidence.ts`
already treats a missing row as `missing` (never `checked-empty`) and requires an
explicit successful check to produce `checked-empty`; the design's §I.4 honors "no
invented history, no missing-implies-zero." U-5 (confirm seed authority) remains a
product confirmation.

**Verdict for §E:** the 648 arithmetic, the 506 insufficiency, and the
count-vs-satisfied-slot distinction are all correct and grounded in the actual SQL.
The corrected predicate is prerequisite-gated (needs the §J columns) but correctly
specified.

## F. Remaining technical assumptions

These are not proven from the current files; each must be verified during
implementation planning. They are carried forward from the corrected design (§M.1)
plus two this review adds.

- **A-α (transaction atomicity).** The whole claim→bucket→invalidation sequence is
  executed as **one** database transaction. Supabase/PostgREST invokes a
  `security definer` RPC in a single transaction in practice, but this is a platform
  behavior, not something the SQL enforces. If a future caller split the steps across
  calls, the exactly-once and atomicity guarantees (§B, §H of the design) collapse.
  *Verify at deploy.*
- **A-β (grant model).** `security definer` + `service_role`-only + fixed
  `search_path` behaves as written in `0014`–`0016`. Consistent in the drafts;
  deployment-specific. *Verify.*
- **A-γ (source provenance availability).** `public.vote_events` (0010) carries
  `voter_ref`, `identity_method`, `identity_version`, `idempotency_key`, `created_at`,
  and `id` as the canonical `sourceEventId`. The schema source reads that way, but
  0010's production status is a `[VERIFY]` item, and the full nine-field
  `canonical_payload_matches` (design §B, §J.1) depends on these columns existing in
  the Engine ledger — which they do **not** yet (`0012:64–82`). *Verify source + plan
  the §J.1 ledger columns.*
- **A-δ (phase classification).** `phase_for(hour, occurredAt)` can deterministically
  label a past hour `CLOSED`. Design assumption; must be pinned before the §G
  late-event policy is implemented. *Verify.*
- **A-ε (isolation level).** The deployment runs `READ COMMITTED` (the PostgreSQL
  default). The §B/§C proofs (PG1–PG4) are stated for `READ COMMITTED`. Under
  `REPEATABLE READ`/`SERIALIZABLE`, the fresh-snapshot re-read (§B Case B) would not
  see the committed winner and would instead raise `40001`, shifting the burden to the
  §C.4 whole-transaction retry. Correctness is preserved but the code path differs.
  *Confirm the actual isolation level.*
- **A-ζ (this review, new).** The `0014` snapshot projection is the *only* thing the
  rollover re-check compares. Any guarantee that depends on the re-check "seeing" a
  new column (e.g. coverage `revision`) requires **extending the snapshot query**
  (`0014:159–164`), not just adding the column. This is a prerequisite, not an
  assumption, but it is easy to miss — flagged in C-2.
- **A-η (this review, new).** A single publication locks ~648 rows/song via
  `FOR SHARE`. With many songs this is a large lock set held across the publish
  transaction. It is correct but has throughput implications and increases exposure
  to `40P01` against concurrent ingestion. The §C.4 retry boundary covers this, but
  the lock-set size should be an explicit capacity consideration, not an afterthought.

None of these undermine the design's guarantees; they are the boundary between what
the SQL proves and what the deployment must confirm.

## G. Required corrections and approval gates

| # | Correction | Severity | Type | Gate |
| --- | --- | --- | --- | --- |
| C-1 | §B exception handler must discriminate **which** unique constraint fired (`PG_EXCEPTION` constraint name) before choosing the identity re-read. Non-identity unique violations must raise a distinct, non-retryable error — never the identity payload-comparison. | Medium | Technical | Correct the handler text before planning SQL. |
| C-2 | §C.3 Timeline 1 must attribute the rollover stale-state retry to the **bucket version in `state`** (`0014:92–99`), not to a coverage-revision comparison the snapshot cannot perform (`0014:159–164` projects only `status`). Separately, add extending the snapshot coverage projection to include `revision`/`currentness` to the §J prerequisite list (or state explicitly that rollover relies on the `0014:441` SHARE for coverage ordering and the re-check for buckets/state only). | Medium | Technical | Correct before planning; add snapshot extension to prerequisites. |
| C-3 | §F must state the publish-transaction lock order (state head → coverage `FOR SHARE`) and require the locked set to equal the full pinned dependent-slot set (all `assessCoverageEvidence` slots), derived from the same window set as readiness — not a hand-maintained list. | Medium | Technical | Codify the lock-set derivation before planning the publish RPC. |
| P-J | §J prerequisites remain unsatisfied: ledger provenance columns; coverage `revision`/`currentness`/`source_identity`/`evidence_id`; invalidation table; ingest RPC; rebuild RPC; **publish RPC** (`bora_engine_publish_chart`); readiness/bootstrap predicate change; snapshot projection extension (C-2). | Blocking (for guarantees) | Technical | Each is a gate on the phase that needs it. |
| P-G | §G late-event policy (A reject / B correction + requalification / C accept + reconciliation) is **unresolved** and governs closed-hour correctness, closure-vs-bucket version semantics, and what readiness blocks on. | Blocking (for closed hours) | **Product-owner approval** | Explicit sign-off required; implementation plan must branch on the choice. |
| P-U | Remaining unresolved items carried from the design's §M.2: backfill scope (U-1), voter-retention policy (U-2), recompute-vs-closure confirmation (U-4), seed authority (U-5), bootstrap shape (U-6), revision/evidenceId split (U-7). | Blocking (per item) | Product-owner approval | Each needs an explicit decision at its phase. |

`40P01`/`40001`/`commit-unknown` handling (§C.4, §D) needs **no** correction: whole-transaction retry ownership is correctly assigned and must simply be preserved verbatim in the plan.

## H. Final recommendation for the next phase

**Verdict: CONDITIONAL GO — proceed to implementation planning with the specified corrections and prerequisites explicitly gated.**

The next phase (implementation planning) is authorized to:
1. Apply corrections C-1, C-2, C-3 as documentation edits to the corrected design.
2. Sequence the §J prerequisites (schema columns → snapshot extension → ingest RPC → rebuild → readiness/bootstrap → publish RPC) with the §G product decision front-loaded before any closed-hour handling.
3. Verify assumptions A-α–A-η against the actual deployment target.

It is **not** authorized to write SQL, create or apply migrations, build a publish writer, connect ingestion to production, activate publication, or touch voting/scoring/flags/live behavior. Publication freshness remains prerequisite-gated (the F2 guarantee exists only after §J exists), and open-hour ingestion safety is established (claim-first ordering + bucket-first lock order + idempotent re-run).

---

## Confirmation of boundaries

Review and documentation only. No corrected-design or prior review document, application code, migration, RPC, SQL function, or database state was created or modified; no migration applied; no live behavior, flag, score, vote, rank, or publication changed. No tests, builds, TypeScript, or lint were run; the dev server was untouched; all existing worktree changes are preserved. This phase adds exactly one document, `docs/bora-engine-final-consistency-review.md`. `NEXT_PUBLIC_BORA_SECURE_VOTING` remains off.

Stop. Implementation planning may proceed only after the verdict's conditions are recorded.







