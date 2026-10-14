# BORA Engine Durable Ingestion — Implementation Plan

**Status:** Planning and documentation ONLY. This plan authorizes no implementation.
No application code, migration, RPC, database state, voting path, flag, scoring
math, or deployment was created or changed to produce it.

**Design history (preserved, not rewritten):**
1. `docs/bora-engine-durable-ingestion-design.md` — original proposal.
2. `docs/bora-engine-durable-ingestion-review.md` — adversarial review (F1–F9).
3. `docs/bora-engine-corrected-transaction-design.md` — corrected model (§A–§M).
4. `docs/bora-engine-final-consistency-review.md` — verdict
(`CONDITIONAL GO: SPECIFIED CORRECTIONS REQUIRED`; C-1, C-2, C-3).

**Reading key.** ✅ verified repository fact (with file:line). 🛠 proposed change
(not implemented). 🛑 unresolved decision (product-owner approval required).
**[UNVERIFIED]** means source inspection could not confirm it.

## 0. Executive summary and readiness verdict

**Verdict: NOT READY FOR IMPLEMENTATION.** This plan is accepted as the execution
baseline; every implementation phase stays blocked until its schema prerequisites
and product-owner approvals are recorded.

Settled (reviewed sound, subject to C-1/C-2/C-3): single-transaction shape
(claim → bucket → invalidation); unique index as identity arbiter (`0012:78`);
bucket-first lock order compatible with `commit_hour` (`0014:437–442`);
whole-transaction idempotent-retry ownership;
publication `FOR SHARE` + revision-pin boundary.

Blocking any start: ledger provenance columns, coverage
`revision`/`currentness`/`source_identity`/`evidence_id`, invalidation ledger,
snapshot projection extension, ingest/rebuild/publish RPCs (all absent in
`0012`–`0017`); platform source feasibility per stated research; §4 approvals.

## 1. Verified current-state inventory

- ✅ Canonical event: `CanonicalAcceptedVoteEvent`
  (`lib/supabase/vote-event.ts:8–18`) — 9 fields; request/validation/outcome
  mirrored in `vote-event-ingestion.ts:16–88`. Field list frozen; §2.1 uses it verbatim.
- ✅ Ledger: `bora_engine_vote_events` (`0012:64–82`) has
  `UNIQUE (source_system, source_event_id)` (`0012:78`) but **no**
  `voter_ref`/`identity_method`/`identity_version`/`idempotency_key`.
- ✅ Buckets: PK `(song_id, hour_index)` with `version`/`phase` (`0012:87+`);
  rollover `commit_hour` writes buckets wholesale (`0014`), unusable for ingestion.
- ✅ Coverage: PK `(song_id, input_type, hour_index)`, status-only
  (`0012:169+`); `assessCoverageEvidence` (`coverage-evidence.ts`) can never pass
  from persisted rows today.
- ✅ Rollover locks: state head `FOR UPDATE`, then `LOCK TABLE … IN SHARE` over six
  tables (`0014:437–442`; vote_buckets `:438`, coverage `:441`), snapshot re-check
  (`0014:444–451`), state-head CAS. Canonical order: `docs/bora-engine-corrected-transaction-design.md`, §C (buckets-before-coverage rule, plan §2.2).
- ✅ Readiness/bootstrap: `0015` checks 506 slots/song; `0016` VOTES check is
  single-reference/single-hour. Full need is 648 (72+72+168×3).
- ✅ Publication contracts only: `PublicationTransactionRequest`
  (`publication-transaction.ts:43–67`); atomic DB claim demanded (`:535`); gate is
  pure (`publication-gate.ts`). No publish writer RPC exists.
- ✅ Trust: `persistence.ts` is server-only (`:1`) via service-role key
  (`:718–724`); secure-vote helper has no legacy fallback (`secure-vote.ts:104–106`);
  flag off by default (`:9–11`).

## 2. Explicit C-1, C-2, C-3 resolution

### 2.1 C-1 — Identity-constraint discrimination (resolved)

🛠 Preserved guarantees: claim `(source_system, source_event_id)` with
`INSERT … ON CONFLICT (source_system, source_event_id) DO NOTHING RETURNING`.
If no row returns, a **separate fresh statement** reads the winner and compares
the **complete canonical payload**. Exact match → `already-ingested` (no counter,
no duplicate). Different payload → `conflicting-identity`. Never use a
same-statement CTE fallback. A savepoint recovery must first verify the fired
**constraint name**; any non-identity `unique_violation` (e.g. a PK collision or
future non-identity index) is a distinct, non-retryable integrity error — never
an identity result. `40P01`/`40001` always mean whole-transaction bounded retry
with the same payload.

✅ Canonical payload fields (frozen): `sourceSystem`, `sourceEventId`, `songId`,
`voteType`, `occurredAt`, plus `voterRef`, `identityMethod`, `identityVersion`,
`idempotencyKey` (`vote-event.ts:8–18`). 🛠 Schema gate: today's ledger
(`0012:64–82`) lacks the last four — full-payload comparison is impossible until
§6-P1 adds them. Unknown commit: always rerun the complete idempotent
transaction; an absent row never proves failure (unique index arbitrates).

### 2.2 C-2 — Accurate stale-state detection (resolved)

✅ `0014` snapshot coverage projection is status-only (`0014:159–164`), so
currentness/revision bumps are invisible to `v_snapshot->'coverage'`; the
observed stale-state trip for a concurrent ingest rides the **bucket
version/counts in `state`** (`0014:92–99`), not coverage revision. 🛠 Plan rule:
represent authoritative coverage revision/currentness in the snapshot or its
validation contract (§6-P3/P9; options: extend snapshot coverage projection, or a
separate revision-validation query — chosen at implementation, not here).
🛠 Checks work together: bucket-version CAS detects counter/phase drift in
`state`; coverage revision/currentness detects invalidation/staleness; both run
inside the transaction that owns each check. Rollover owns bucket-closure
consistency via `0014:444–451` plus its SHARE table locks; ingestion owns the
claim→bucket→invalidation atom (`0012:78` + PK). Lock order stays
buckets-before-coverage in both writers (`docs/bora-engine-corrected-transaction-design.md`, §C; plan §2.2). A failed CAS/currentness check
means fail-closed plus whole-transaction retry under the same identity.

### 2.3 C-3 — Exact publication lock set (resolved)

🛠 A candidate pins its complete dependent slots (each with revision/evidence):
every vote/seed hour in its window plus platform hours required by eligibility.
The publish transaction derives the **exact** row set to lock from that pinned
list — no assumed subset. Deterministic order: state head (`FOR UPDATE`,
CAS `expectedState`) → coverage slots (`FOR SHARE`, ascending
`(song_id,input_type,hour_index)`) → recheck currentness/revision/source per
`assessCoverageEvidence` → on any missing/changed/stale slot abort with no
pointer move → else insert immutable snapshot and CAS
`expectedCurrentPublication` advance. Because validation and the write share one
transaction holding `FOR SHARE`, a racing invalidation blocks instead of slipping
through. 🛠 Until the publish RPC and coverage revision columns exist, the
guarantee is specified, not implemented; snapshots remain immutable in all cases.

## 3. Minimum schema and transaction prerequisites

🛠 Nothing below exists in `0012`–`0017` today. No SQL is written here — each row
is a future change with its gate.

| # | Prerequisite | Current state (evidence) | Required change | Phase | Acceptance | Product? |
|---|---|---|---|---|---|---|
| P1 | Ledger provenance for full-payload compare | Ledger lacks 4 fields (`0012:64–82`) | Add `voter_ref`, `identity_method`, `identity_version`, `idempotency_key` (nullable; contract `vote-event.ts:8–18`) | Schema-A | `canonical_payload_matches` runs against stored row | Privacy: retention model (§4.3) |
| P2 | Identity uniqueness + atomic ingest RPC | Arbiter `UNIQUE (source_system, source_event_id)` (`0012:78`) exists; no ingest RPC exists | New RPC: validate → `ON CONFLICT DO NOTHING RETURNING` → bucket `+1 … ON CONFLICT` → coverage invalidate → audit row, one transaction | Txn-A | C-1 behaviors (§K-1/2/3) pass under concurrency | No |
| P3 | Exactly-once buckets + unknown-commit recovery | Bucket PK `(song_id,hour_index)` exists; no +1 path (rollover overwrites) | Bucket `+1 … ON CONFLICT` in P2; recovery = rerun full idempotent txn (§D, Caution-2) | Txn-A | One event ↔ one increment incl. reconnect storms | No |
| P4 | Coverage identity/revision/currentness | Table status-only (`0012:169+`); `assessCoverageEvidence` (`coverage-evidence.ts`) needs source+revision/evidenceId+currentness | Add `source_identity`, `revision`, `evidence_id`, `assessed_at`, `currentness`; wire `VoteHistoryInvalidation` (`coverage-evidence.ts:90–99`) | Schema-A | Eligibility passes per-slot on rows, not memory | No |
| P5 | Append-only invalidation audit | No invalidation table | New table keyed `(source_system, source_event_id)` (+song/hour/superseded evidence) with immutability trigger (pattern of `0013`/`0017`) | Schema-A | One retry = one record; conflicts fail closed | No |
| P6 | Seed-history authority | Design leans on `seed_hours` + closure snapshot; U-5 open | Record seed source+revision at injection (rollover writes authority, not client); define trusted checked-empty for verified empty hours | Schema-A + Rollover-B | Seed coverage assessable like vote coverage | **Yes** (§4.5) |
| P7 | Readiness proving authoritative/current slots | `0016` readiness single-reference/single-hour; `persistence.ts` checks exist (`:48`,`BoraEngineReadinessCheck`) | Readiness predicate = per-slot authoritative+source-matched+complete+current over full windows; extend RPC/contract, keep `C_WINDOW_HOURS`, `PLATFORM_WINDOW_HOURS` | Readiness-C | 648 satisfied slots/song, no zero-from-missing | No |
| P8 | 648-slot coverage set | See §1: 72+72+168×3 | Enforce per-song/input-kind/hour evidence, vote/seed independent | Readiness-C | §K-11 scenario passes | No |
| P9 | Fix `0015` 506-vs-648 + `0016` narrow check | `0015` expects 506/song; `0016` single hour | Correct predicate to full-window satisfied-slot set (§2.2; **not** a blind number swap); backfill/completeness method fixed without fabricating history (Option-B below) | Bootstrap-C | Bootstrap can't pass while evaluation window incomplete | **Yes** (§4.6) |
| P10 | Honest bootstrap without fabricated history | No bootstrap writes history today except approvals/state | Complete coverage only from authoritative checks; gaps stay `not-ready`, never zero-filled | Bootstrap-C | Operator readout distinguishes missing/failed/unavailable | **Yes** (§4.6) |
| P11 | Publish RPC + pinned locking | Request/gate contracts exist (`publication-transaction.ts:43–67`, gate), `assessPublicationRetry` needs atomic claim (`:535`); no writer RPC | New RPC: state-head CAS (`expectedState`) → lock **exact** pinned slots (`FOR SHARE`, §2.3 order) → revalidate `assessCoverageEvidence` → immutable snapshot → pointer CAS (`expectedCurrentPublication`) | Publish-D | §K-10 scenario passes on live races | No |

## 4. Product-owner approval register

🛑 No option below is selected. Until a decision is approved, the system stays
fail-closed on that dimension (default behaviors listed). Technical prerequisites
are not product decisions and vice versa.

| ID | Decision | Options | Consequences | Blocked until decided | Fail-closed default |
|---|---|---|---|---|---|
| D1 | Late events for a closed hour | A. Reject them. B. Correction/requalification path. C. Accept into historical buckets + reconcile | A: simplest; ledger/buckets diverge from source for late votes. B: strongest audit, heaviest. C: closure `source_bucket_version` can trail live bucket until rebuilt | Rollover-B close path + §K-9 case + closure audit wording | **None active:** if a closed hour is targeted, do not write until D1 is approved (treat as invalid, no mutation) |
| D2 | Historical backfill scope/sources | B1. Forward-only from cutover. B2. Bounded re-derivation from `vote_events` source rows. B3. Wider platform history rebuild | Determines whether the 72h/168h windows can ever be satisfied; bounds work and audit load | Bootstrap-C, Readiness-C | **B1 only:** no backfill of any kind; gaps stay `not-ready` |
| D3 | Voter retention/privacy | R1. Store opaque `voter_ref` long-term. R2. Store then reduce to salted hash after window. R3. Minimal: store only while needed for retry window | R1 simplest exact-retry; R2/R3 need keyed-hash + rotation/provenance policy | Schema-A P1 population | **Do not persist provenance** beyond in-transaction validation until D3 approved |
| D4 | Recompute vs closure-confirmation | Q1. Ledger authoritative; buckets derived and rebuildable. Q2. Closures authoritative; later writes are corrections | Q1 allows repair; Q2 freezes history and forces correction records | Rollover-B + §K rebuild cases | **Q1 declared only after D4:** until then any drift blocks readiness (no silent trust of either side) |
| D5 | Seed-history authority/provenance | S1. Rollover closure snapshot + `seed_hours` version. S2. Separate seed-source ledger | S1 reuses existing commit (`0014`); S2 adds a producer + review surface | Schema-A P6 + Rollover-B | **No seed coverage passes** until S1/S2 approved |
| D6 | Bootstrap shape + incomplete history | G1. Full-window satisfied-slot predicate. G2. Staged bootstrap with explicit known-incomplete marker | G1 is honest but may never pass without backfill (§4 D2); G2 permits staged standup with the marker | Bootstrap-C, Readiness-C | **Fail closed:** incomplete history reports `not-ready`, never synthesized |
| D7 | `evidenceId` vs `revision` | V1. Separate concepts (per `assessCoverageEvidence`: revision-match **or** evidenceId-match, `coverage-evidence.ts:268–286`). V2. One versioned identity | V1 matches code; V2 is a contract change requiring reason-mapping updates (`vote-event-ingestion.ts:514–543`) | Schema-A P4 + contract freeze | **V1 (code as written):** both accepted exactly as `assessCoverageEvidence` defines |

### Pointed cautions the plan carries (address the one-shot concerns)

**Caution-1 — Unknown-commit reconcile inputs and C-1 follow-up.** Reconciliation
rereuns the complete idempotent transaction and resolves identity by the unique
arbiter — but its *inputs* (the original event identity + full canonical payload)
must survive the transport failure. 🛠 Resolution: the worker persists an outbound
attempt record **before** sending (identity + canonical payload + idempotency
fingerprint), so reconciliation never reconstructs an event from memory; and any
savepoint recovery **after** an `ON CONFLICT DO NOTHING` returning no row must
still verify the fired constraint name before choosing identity-retry vs
integrity-error — even in the deferred path. This closes the C-1 loop between the
transaction design (§2.1) and the recovery protocol.

**Caution-2 — Seed injection data integrity.** Rollover writes seed hours into the
same history readers trust (design §G.2/`seed_hours`+closure). Treat seed
*values* like vote buckets: authoritative source row + derived projection, with a
deterministic recount/verification path and operator sign-off, so a corrupted
injection cannot quietly become "history." Adds a seed-verification acceptance
item to Rollover-B (not a new table — a verification contract over §6-P6).

**Caution-3 — Eligibility provenance must fail closed in code paths, not just in
the predicate.** `assessVoteSeedHistoryCoverage` (`vote-event-ingestion.ts:418–512`)
already fails closed on `source-identity-unavailable` (`:471–478`) and
`revision-unavailable` (`:479–486`) and only calls `assessCoverageEvidence`
(`:491–498`) after both checks. 🛠 Preserve this ordering in any refactor; do not
shortcut provenance validation when the new columns make rows "look complete."

## 5. Phased implementation roadmap (part 1: Phases 0–4)

Each phase is small, reviewable, gated. Nothing here executes — future work
orders only. **Out-of-scope for every phase:** writing SQL beyond its own draft
text, touching live voting, changing scoring math, mutating any DB.

### Phase 0 — Contract freeze (workstream 1)

- **Objective:** lock `assessCoverageEvidence` semantics + C-1/C-2/C-3 as normative.
- **Likely touched:** docs only (this plan + corrected-design errata); no code.
- **Prereqs:** final review verdict recorded. **Work:** publish C-1 constraint-name
  rule, C-2 snapshot-projection rule, C-3 lock-set derivation as normative text.
- **Acceptance:** all three have line-level references in §2.
- **Verification:** walkthrough of §2 vs corrected design §B/§C/§F.
- **Rollback:** n/a (docs only). **Gate →** Phase 1.

### Phase 1 — Product-owner decisions (workstream 2)

- **Objective:** resolve §4 D1–D7 individually (no package deals).
- **Prereqs:** Phase 0. **Work:** signed decision per ID with rationale.
- **Acceptance:** signed register; chosen branch per decision.
- **Verification:** approver + date per entry. **Rollback:** reversible pre-impl.
- **Gate →** Phases 2–3 on technical tracks only (D-gated work parked).

### Phase 2 — Coverage/provenance schema prerequisites (workstream 3)

- **Objective:** add §6-P1 (provenance), P4 (coverage identity/revision), P5
  (invalidation audit), P6 (seed authority), C-2 snapshot extension — forward-only
  additive, unapplied.
- **Likely touched:** new `00xx` migration file(s) only; `0012` untouched.
- **Prereqs:** Phase 0; D3 (retention), D5 (seed authority), D7 (identity model).
- **Work:** nullable columns + checks + new invalidation table + immutability
  trigger (`0013`/`0017` pattern); extend coverage projection readers.
- **Acceptance:** `assessCoverageEvidence` satisfiable from a row; Caution-3
  fail-closed ordering preserved.
- **Verification:** schema diff review; contract fixtures (not DB) for evidence shape.
- **Rollback:** additive-only; drop script drafted, never applied without a gate.
- **Out-of-scope:** backfill, RPCs, readiness changes. **Gate →** Phases 3–4.

### Phase 3 — Atomic idempotent ingestion transaction (workstream 4)

- **Objective:** §2.1 RPC (validate → claim → bucket → invalidate → audit) +
  retry ownership + unknown-commit reconcile path.
- **Likely touched:** one new RPC migration + `persistence.ts` caller (server-only).
- **Prereqs:** Phase 2; D3 for provenance population.
- **Work:** exact SQL per §2.1–§2.2 incl. C-1 constraint discrimination; caller
  bounded-retry same payload; reconcile = rerun full txn; outbound attempt record
  persisted before send (Caution-1).
- **Acceptance:** matrix §7 rows 1–9 pass in review + concurrency walkthrough.
- **Verification:** statement trace per interleaving; no DB execution in this plan.
- **Rollback:** revoke execute — path fails closed.
- **Out-of-scope:** rollover/readiness/publication/backfill. **Gate →** Phases 4–5.

### Phase 4 — State snapshot and stale-state validation (workstream 5)

- **Objective:** enforce §2.2: snapshot (or validation contract) carries
  bucket-version **and** coverage revision/currentness, each check owned by its txn.
- **Likely touched:** `0014` snapshot-projection extension (new migration text)
  and/or revision-validation helper contract.
- **Prereqs:** Phase 2 (columns); Phase 1 D4 if rebuild semantics involved.
- **Work:** extend projection or add parallel validation query; document
  bucket-CAS vs coverage-check split.
- **Acceptance:** coverage-only invalidation observable; bucket drift still trips
  state mismatch.
- **Verification:** projection field audit line-by-line.
- **Rollback:** additive projection is backward-compatible.
- **Gate →** Phases 5–6.

## 5. Phased roadmap (part 2: Phases 5–9)

### Phase 5 — Invalidation and dependent evaluation (workstream 6)

- **Objective:** wire `VoteHistoryInvalidation` (`coverage-evidence.ts:90–99`)
  into durable behavior; event-hour from committed timestamp; slot + window
  staleness with reconcile-to-current.
- **Prereqs:** Phases 2–3; **D1 decided first.** **Work:** closed-hour
  disposition per D1; requalification criteria; seed verification hook (Caution-2).
- **Acceptance:** every 72h window containing an invalidated hour reads
  not-ready; committed publications immutable.
- **Verification:** window-arithmetic fixtures (`getCoverageWindow`).
- **Out-of-scope:** window-size changes. **Gate →** Phases 6–7.

### Phase 6 — Readiness and bootstrap completeness (workstream 7)

- **Objective:** replace 506/single-hour predicates with the full-window
  satisfied-slot predicate (§6-P7–P10), never fabricating history.
- **Likely touched:** `0015`/`0016` successor text + readiness surface.
- **Prereqs:** Phases 2, 5; D2 (backfill), D6 (bootstrap shape).
- **Work:** per-slot authoritative+source-matched+complete+current over 648
  slots; honest missing/failed/unavailable readout.
- **Acceptance:** bootstrap cannot pass with any window hour unsatisfied;
  no zero-from-missing. Required slots per active song (72+72+168+168+168=648):

  | Coverage category | Required slots per active song |
  |---|---:|
  | Vote history | 72 |
  | Seed history | 72 |
  | YouTube | 168 |
  | Spotify | 168 |
  | Boomplay | 168 |
  | Total | 648 |
- **Verification:** predicate walkthrough vs `0015:147–161` and `0016` baseline.
- **Out-of-scope:** platform evidence modeling. **Gate →** Phases 7–8.

### Phase 7 — Publication transaction and pinned locking (workstream 8)

- **Objective:** publish RPC per §2.3: state-head CAS → exact pinned `FOR SHARE`
  set → revalidate → immutable snapshot → pointer CAS. Terminal F2 gate.
- **Likely touched:** one new RPC migration; gate/transaction contracts stay pure.
- **Prereqs:** Phases 2, 4, 6. **Work:** lock set = pinned list exactly;
  missing/changed/stale aborts with no pointer move.
- **Acceptance:** live-race walkthrough (§7 row 10) passes both lock orders.
- **Verification:** lock-order proof vs `docs/bora-engine-corrected-transaction-design.md`, §C and plan §2.2 (buckets-before-coverage); pointer-CAS review.
- **Rollback:** revoke grant; pointer never moves without passing recheck.
- **Out-of-scope:** publication activation (§8). **Gate →** Phases 8–9.

### Phase 8 — Source integration, feasibility separate (workstream 9)

- **Objective:** per-source evidence producers; secure-vote stream first.
- **Prereqs:** Phases 2–3; per-source feasibility sign-off.
- **Work:** secure-vote reader (identity + canonical payload per Caution-1);
  platform collectors **only** against approved evidence models.
- **Feasibility (stated research, [UNVERIFIED] here):** YouTube cumulative views
  alone ≠ trustworthy hourly views; Spotify stream counts unavailable via standard
  API; Boomplay has no established supported public track-level source. Each needs
  its own evidence-model prerequisite.
- **Acceptance:** no collector writes history without an approved evidence model.
- **Out-of-scope:** scoring-math changes. **Gate →** Phase 9 only per approved source.

### Phase 9 — Controlled activation readiness (workstream 10)

- **Objective:** define (not execute) the gate checklist: schema applied → RPCs
  granted → worker dry-run → reconcile drill → readiness green → publish dry-run
  with pointer frozen; per-gate evidence + rollback reviewed (not run).
- **Prereqs:** Phases 0–8 + §4 decisions + §8 gates.
- **Acceptance:** named approver + reviewed rollback per gate.
- **Out-of-scope:** everything in §8 — activation itself is **not** authorized.

## 6. Failure and concurrency matrix

Required result per scenario + the phase that implements/verifies it. Retry rule
everywhere: whole transaction, same identity/payload, bounded + backoff; never a
partial step. `invalid-input` and `conflicting-identity` are terminal (never retried).

| # | Scenario | Required result | Phase |
|---|---|---|---|
| 1 | Concurrent exact retries (same identity+payload) | Exactly one wins the claim; losers read winner → `already-ingested`, no counter, no extra invalidation (C-1 two-statement rule) | Phase 3 |
| 2 | Same identity, conflicting payload | Fresh-statement full compare → `conflicting-identity`, whole-transaction rollback, no bucket/invalidation write | Phase 3 (+P1 columns) |
| 3 | Original commits, client loses response | `commit-unknown`; deferred reconciler reruns the **full** idempotent txn (§D); unique arbiter resolves to `already-ingested` | Phase 3 (+ persisted attempt record, Caution-1) |
| 4 | Original rolls back while retry waits | Waiting claim unblocks; insert proceeds; single increment; original left nothing | Phase 3 |
| 5 | Deadlock (`40P01`) or serialization failure (`40001`) | Surfaced to caller (never swallowed); bounded whole-txn retry; exhaustion → `persistence-failure` | Phase 3 |
| 6 | Missing identity row during reconciliation | Do **not** infer failure; reconciler reruns full txn and lets the claim decide (absence ≠ proof) | Phase 3 |
| 7 | Stale bucket version | CAS/state mismatch → fail closed + retry; drift surfaced by recount-verify, repaired only via approved rebuild path | Phases 3–4 |
| 8 | Stale or missing coverage evidence | Per-slot `assessCoverageEvidence` fails → gap, never zero-fill; missing rows stay `not-ready` | Phases 2, 6 |
| 9 | Late event invalidating an existing evaluation window | Slot + dependent 72h windows marked stale; evaluation blocked pending requalification; committed publications immutable; close-hour disposition per chosen D1 | Phase 5 (+D1) |
| 10 | Coverage invalidation concurrent with publication | Racing invalidation blocks on P's `FOR SHARE`, or P aborts on recheck mismatch — pointer never advances on stale inputs (§2.3) | Phase 7 |
| 11 | Missing one of 648 required slots | Bootstrap/readiness `not-ready` with the exact missing slot; never synthesized | Phase 6 (+D2/D6) |
| 12 | Unknown or unsupported source provenance | Provenance gate stays closed (`vote-event-ingestion.ts:471–498` ordering preserved); record unattributable → `unresolved`, never usable | Phases 2, 8 |

## 7. Activation and safety gates

These restrictions are preserved by this plan and by every future phase:

- `NEXT_PUBLIC_BORA_SECURE_VOTING` **stays off** (verified `secure-vote.ts:9–11`).
- No live secure-voting activation; no migration application or DB mutation.
- No deployment; no dev-server restart, stop, or kill.
- No changes to existing voting behavior or dirty worktree content
  (`Chart*.tsx`, `ChartWrapper.tsx`, `Navbar.tsx` untouched).
- No scoring-weight or scoring-math changes; no fabricated vote/platform
  evidence; no assumption that source integrations are operational.

Evidence required before activation could **even be proposed** (none exists
today): schema prerequisites applied and reviewed (§6-P1–P6); ingest/rebuild
RPCs granted service-role-only with concurrency walkthroughs; readiness green
on 648 satisfied slots with named missing-slot readout; publish dry-run with the
pointer frozen and race matrix §6-10 passing; all §4 approvals signed; platform
evidence models approved per source. This task does not authorize activation.

## 8. Facts that could not be verified

- Platform source feasibility claims (YouTube/Spotify/Boomplay) are stated
  research, marked **[UNVERIFIED]** — each needs its own evidence-model prerequisite.
- Whether `public.vote_events` (0010/0011) is applied anywhere: treated as
  **unapplied draft**, never assumed.
- Runtime behaviors (actual isolation level, PostgREST single-transaction RPC
  semantics, lock timing under load): must be confirmed on the deployment target
  during implementation; proofs here assume `READ COMMITTED` + one transaction
  per RPC.
- Line citations for `0015:147–161`, `0016` single-hour check, and
  `0014:437–451` are taken from the checkpoint documents' verified quotes; the
  plan's own logic does not depend on any uncited line.

## 9. Boundary confirmation

Planning/documentation only. Created exactly one file:
`docs/bora-engine-durable-ingestion-implementation-plan.md`. No source, migration,
database, flag, server, or deployment changed; pre-existing tracked/untracked
changes preserved; no `git reset`/`clean`; no tests, lint, typecheck, build, or
benchmarks run. The four design-history documents are untouched.

---

# FINAL REPORT

**A. Plan created.** Yes — `docs/bora-engine-durable-ingestion-implementation-plan.md`
(new file; §§0–9 plus this report).

**B. Exact file changed.** Only that file. No other file created, edited, or moved.

**C. How C-1, C-2, C-3 are addressed.** C-1: §2.1 keeps `ON CONFLICT DO NOTHING
RETURNING` + separate fresh-statement read + full-payload compare, forbids CTE
fallback, and requires constraint-name discrimination in savepoint recovery
(§6-P2, §7 rows 1–2). C-2: §2.2 attributes rollover stale-state to the bucket
version in snapshot `state` (`0014:92–99`), and gates coverage-revision detection
on extending the `0014:159–164` projection (§6-P3/P9). C-3: §2.3 derives the
publish lock set exactly from the pinned dependency set in deterministic
state-head → `FOR SHARE` order with in-transaction revalidation and pointer CAS.

**D. Key schema/RPC prerequisites.** Ledger provenance (P1); coverage
identity/revision/currentness + invalidation audit (P4/P5); ingest RPC (P2);
bucket recovery by full-txn rerun (P3); seed authority (P6); per-slot readiness
+ 648 set + bootstrap predicate fix (P7–P10); publish RPC with pinned locking
(P11); snapshot-projection extension (C-2 addendum).

**E. Product-owner decisions still required.** D1 late-event policy (A/B/C);
D2 backfill scope; D3 voter retention/privacy; D4 recompute-vs-closure; D5 seed
authority; D6 bootstrap shape; D7 evidenceId-vs-revision — each with fail-closed
defaults in §4.

**F. Phase order and major gates.** 0 contract freeze → 1 decisions → 2 schema
prereqs → 3 ingest txn → 4 snapshot/stale-state → 5 invalidation → 6
readiness/bootstrap → 7 publication txn → 8 source integration (feasibility
separate) → 9 activation readiness (checklist only). Gates before: schema text,
RPC grants, data backfill, and publication activation.

**G. Facts that could not be verified.** §8: platform feasibility research,
0010/0011 applied status, runtime isolation/transaction semantics under load.

**H. No source code, migration, database, feature flag, server, or deployment
was changed.** Verified via git status: only pre-existing modifications remain;
the sole addition is the untracked plan document.

**I. No tests, lint, typecheck, or build were run.** Planning task; no
verification commands executed.

STOP. Do not begin implementation.








