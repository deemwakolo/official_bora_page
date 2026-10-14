# BORA Engine Corrected Durable-Ingestion Transaction Design

**Status:** Design only — a corrected, internally consistent revision of
`docs/bora-engine-durable-ingestion-design.md`, resolving the defects in
`docs/bora-engine-durable-ingestion-review.md`. Those two documents are preserved
unchanged as historical checkpoints. No application code, migration, RPC, SQL
function, or database state was created or changed to produce this document.

**Grounding.** Every correction cites the actual source and draft SQL:
`lib/bora-engine/{vote-event-ingestion,coverage-evidence,source-readiness,persistence,publication-gate,publication-transaction}.ts`
and `supabase/migrations/0012,0014,0015,0016`. Migrations are **unapplied drafts**.

**Proven PostgreSQL behavior relied upon** (distinct from assumptions needing
verification), under the default `READ COMMITTED` isolation used by
Supabase/PostgREST:
- **P1.** `SELECT … FOR UPDATE` on a nonexistent row locks **nothing**; there is no
  gap/predicate lock. It is therefore useless as an identity-claim mechanism.
- **P2.** `INSERT … ON CONFLICT (cols) DO NOTHING RETURNING …` **is** a safe claim:
  it speculatively inserts, **blocks** on an in-flight conflicting tuple until that
  transaction commits/aborts, and returns a row **iff** this transaction won the
  insert. It returns no row if a committed conflicting tuple already exists. This
  is the authoritative arbiter for `(source_system, source_event_id)`.
- **P3.** A caught PL/pgSQL exception rolls back to an **implicit savepoint**,
  discarding the failed INSERT and releasing locks taken inside the block; a
  subsequent statement runs with a **fresh snapshot** and sees the committed winner.
- **P4.** Table lock modes: plain `SELECT` = `ACCESS SHARE`; `SELECT … FOR UPDATE`
  = `ROW SHARE` + row lock; `INSERT/UPDATE/DELETE` = `ROW EXCLUSIVE`;
  `LOCK TABLE … IN SHARE MODE` = `SHARE`. `SHARE` conflicts with `ROW EXCLUSIVE`
  and with `FOR UPDATE` row locks; `SHARE` and `ACCESS SHARE` do **not** conflict.
- **P5.** Two transactions that acquire the **same** overlapping resources in the
  **same relative order** cannot deadlock on those resources.
- **P6.** `40P01` (deadlock) and `40001` (serialization) are only safely handled by
  retrying the **entire** transaction.

**Assumptions to verify during implementation** (not proven here):
- **A-α.** Supabase/PostgREST invokes a `security definer` RPC as a single
  transaction (so the whole claim+bucket+invalidation sequence is atomic).
- **A-β.** The `security definer` + `service_role` grant model matches how `0014`–`0016`
  are written (consistent, but deployment is unverified).
- **A-γ.** `public.vote_events` (0010) is present and carries the provenance columns
  the exact-retry comparison needs; its production status is a `[VERIFY]` item.

---

## A. Summary of defects corrected

| Ref | Defect (from review) | Correction (this document) |
| --- | --- | --- |
| F3 / §2 | Identity claimed with `SELECT … FOR UPDATE`, which locks nothing when the row is absent. | Replace with `INSERT … ON CONFLICT DO NOTHING RETURNING` as the claim; the unique index is the sole arbiter (§B). |
| F1 / §3 | Deadlock: ingestion locked `song_state` row **before** `vote_buckets`; `commit_hour` locks state head + six tables **before** updating `song_state`. | Define one canonical lock order that is a compatible subsequence of `commit_hour`'s; ingestion takes **no** `song_state` write lock (§C). |
| F5 / §3 | No bounded retry boundary for `40P01`/`40001`. | Specify whole-transaction retry with the same identity/payload, bounded + backoff; never retry a partial step (§C, §K). |
| F4 / §4 | "Row absent ⇒ commit did not occur" reasoning. | Unique index, not an absence read, is the arbiter; reconciler re-runs the **full** idempotent transaction (§D). |
| F2 / §5 | Publication could use stale evidence; state-head CAS cannot see an ingestion invalidation. | Add per-slot coverage **revision**; publication pins expected revisions, locks coverage rows `FOR SHARE`, rechecks currentness+revision inside the publish transaction (§E, §F). |
| §6 / G | Late-event vs rollover policy interplay undesigned. | Common coordination contract; options A/B/C compared, policy left unresolved (§G). |
| F6 / §7 | No deterministic bucket rebuild. | Ledger is authoritative; bucket is a derived projection with a recount/rebuild procedure (§H). |
| F7 / §8 | Bootstrap `× 506` vs evaluation `× 648`; readiness checks one hour not the window. | Corrected predicate requires authoritative, source-matched, COMPLETE+current evidence for all 648 slots (§I). |
| F9 / §J | Ledger lacks provenance columns for exact-retry comparison. | Add nullable provenance columns; exact-retry compares the full canonical payload (§B, §J). |

## B. Proposed transaction and identity-claim sequence

One stored procedure, `bora_engine_ingest_vote_event(p_event jsonb)`,
`security definer`, `service_role` only (§J). It performs identity claim, bucket
increment, coverage invalidation, and staleness marking in **one transaction**.
The unique constraint — not a pre-read lock — owns identity.

```
FUNCTION bora_engine_ingest_vote_event(p_event jsonb) RETURNS jsonb
  AUTH: if coalesce(auth.role(),'') <> 'service_role'
          then raise BORA_ENGINE_WORKER_REQUIRED;

  -- 1. Trusted validation (server-derived; mirrors VoteEventIngestionValidation)
  v_source_system := 'secure_vote_events';           -- fixed, never client-chosen
  v_source_event_id := validate_uuid(p_event->>'sourceEventId');
  v_song_id        := validate_uuid(p_event->>'songId');
  v_vote_type      := in ('up','down');
  v_occurred_at    := parse_committed_utc(p_event->>'occurredAt');
  v_provenance     := voter_ref / identity_method / identity_version / idempotency_key
                      (nullable; see §J).  NOT trusted from client without
                      source verification — read back from vote_events when
                      available (A-γ).
  if any required field invalid then
     return {'status':'invalid-input','reasons':[...]};   -- no writes

  -- hour from ORIGINAL committed timestamp, never now()
  v_hour := floor(epoch_ms(v_occurred_at) / 3600);

  -- 2. Song-state read is ACCESS SHARE only: validation + phase lookup.
  --    NO song_state row lock (removes the F1 deadlock edge; see §C).
  select lifecycle into v_lifecycle
    from bora_engine_song_state where song_id = v_song_id;
  if not found then return {'status':'invalid-input','reasons':['unknown-song']};

  -- 3. IDENTITY CLAIM — unique index is the arbiter (F3 fixed, P2).
  insert into bora_engine_vote_events
      (song_id, source_system, source_event_id, vote_type, hour_index,
       occurred_at, voter_ref, identity_method, identity_version, idempotency_key)
  values (v_song_id, v_source_system, v_source_event_id, v_vote_type, v_hour,
          v_occurred_at, ...)
  on conflict (source_system, source_event_id) do nothing
  returning id into v_event_row_id;

  if v_event_row_id is null then
     -- Committed row with this identity already exists (P2). Read it fresh and
     -- compare the COMPLETE canonical payload (all fields + provenance).
     select * into v_existing from bora_engine_vote_events
       where source_system = v_source_system
         and source_event_id = v_source_event_id;
     if canonical_payload_matches(v_existing, this_request) then
        return {'status':'already-ingested',      -- exact retry: NO bucket write,
                'sourceEventId': v_source_event_id};   -- NO invalidation
     else
        raise BORA_ENGINE_EVENT_IDENTITY_CONFLICT;    -- conflicting reuse → rollback
     end if;
  end if;

  -- 4. OWNERSHIP SETTLED (we inserted the row). Only now may the bucket move.
  --    Row lock on (song_id, hour) serializes concurrent distinct events (§C).
  insert into bora_engine_vote_buckets
      (song_id, hour_index, upvotes, downvotes, phase, version)
  values (v_song_id, v_hour,
          case when v_vote_type='up' then 1 else 0 end,
          case when v_vote_type='down' then 1 else 0 end,
          phase_for(v_hour, v_occurred_at), 1)
  on conflict (song_id, hour_index) do update
     set upvotes   = bora_engine_vote_buckets.upvotes   + excluded.upvotes,
         downvotes = bora_engine_vote_buckets.downvotes + excluded.downvotes,
         version   = bora_engine_vote_buckets.version + 1;

  -- 5. COVERAGE INVALIDATION + staleness, same transaction (§E).
  update bora_engine_hourly_input_coverage
     set currentness = 'invalidated',
         revision    = bora_engine_hourly_input_coverage.revision + 1,
         invalidated_reason = 'late-accepted-event',
         updated_at  = now()
   where song_id = v_song_id and input_type = 'VOTES' and hour_index = v_hour
     and status = 'COMPLETE';
  insert into bora_engine_vote_coverage_invalidation
      (song_id, hour_index, source_system, source_event_id, invalidates_revision,
       invalidated_at)
  values (...) on conflict (source_system, source_event_id) do nothing;
  -- (step 5 'revision' column + invalidation table are proposed in §J; absent today)

  return {'status':'ingested','sourceEventId':v_source_event_id,'eventHour':v_hour};
```

**Why a bucket increment cannot precede ownership.** The `INSERT … ON CONFLICT DO
NOTHING RETURNING` at step 3 either (a) returns a row → this transaction owns the
identity and proceeds to step 4, or (b) returns null → the branch returns
`already-ingested`/raises conflict **without ever reaching step 4**. The only way
to reach the bucket write is to have inserted the identity in this same
transaction. Exact retry and conflicting reuse are both decided before any bucket
statement executes. A rollback at any point undoes the identity insert and any
partial writes together (single transaction).

**Recovering a uniqueness conflict after an abort (P3).** Although `ON CONFLICT DO
NOTHING` **does not** abort on conflict (it returns null), a `unique_violation`
can still surface from a **partial unique index** or a constraint not named in the
`ON CONFLICT` target. The handler must be an inner `BEGIN … EXCEPTION WHEN
unique_violation` block: the failed insert rolls back to the savepoint (P3), then a
**fresh** `SELECT` reads the committed winner and the same
`canonical_payload_matches` comparison resolves to `already-ingested` or raises the
conflict. Because step 4 has not run yet (step 3 precedes it), no bucket increment
exists to unwind. **Never** perform the bucket write before the claim resolves.

## C. Consistent lock-order and concurrency model

### C.1 The observed rollover lock order (authoritative, from `0014`)

`commit_hour` (`0014:425–442`) acquires, in this exact order:

1. `bora_engine_hourly_state_head` row `FOR UPDATE` (`:425–426`).
2. `LOCK TABLE … IN SHARE MODE` on `song_state`, `vote_buckets`, `seed_hours`,
   `platform_observations`, `hourly_input_coverage`, `hourly_closures` (`:437–442`).
3. Snapshot re-check (`:444–451`), then `song_state` UPDATE, closure trace,
   state-head CAS (`:600–619`).

The comment at `:434–436` states the state head is locked **first** so two hour
commits cannot deadlock among themselves. So rollover's global order is:

```
state_head  <  {song_state, vote_buckets, seed_hours,
                platform_observations, hourly_input_coverage,
                hourly_closures}   (all SHARE, one batch)
```

### C.2 The canonical order for ingestion

Ingestion must take locks that are a **compatible subsequence** of rollover's
order (P5). Two rules make that provable:

- **R1 — ingestion never takes a `song_state` write lock.** Step 2 is `ACCESS
  SHARE` (read-only). This removes the exact edge that caused the F1 deadlock
  (ingestion holding a `song_state` row lock while rollover's post-lock
  `song_state` UPDATE at `:600` waited on it, and rollover holding `vote_buckets`
  SHARE while ingestion's bucket write waited on that). `SHARE` and `ACCESS
  SHARE` do not conflict (P4), so ingestion's read never blocks rollover.
- **R2 — ingestion takes row-level write locks, in rollover's table order.**
  Ingestion's write resources are only `vote_events` (identity insert),
  `vote_buckets` (row), `hourly_input_coverage` (row), and the new
  `bora_engine_vote_coverage_invalidation` (insert). Of these, only
  `vote_buckets` and `hourly_input_coverage` are also in rollover's SHARE set, and
  ingestion touches them in rollover's relative order (`vote_buckets` before
  `hourly_input_coverage`). `vote_events` and the invalidation table are
  ingestion-exclusive (rollover never touches them), so their position is
  unconstrained; we place them first for clarity.

Ingestion's canonical sequence:

```
(1) INSERT vote_events            [identity claim; ingestion-exclusive]
(2) vote_buckets row   (upsert)   [ROW EXCLUSIVE; conflicts with rollover SHARE]
(3) hourly_input_coverage row (update) [ROW EXCLUSIVE; conflicts with rollover SHARE]
(4) INSERT coverage_invalidation  [ingestion-exclusive]
```

Ingestion **skips** `state_head` and `song_state` entirely for locking. This is
safe because (per §G) ingestion does not advance the reference hour and does not
mutate song lifecycle state; it only contributes to a bucket for an hour that is
`OPEN`/`TRANSITION` (or, under a chosen late-event policy, a closed hour handled
via the correction path — never by racing the rollover's own state).

**Why this is deadlock-free against rollover.** Consider ingestion `I` and
rollover `C`:
- If `C` acquires its SHARE batch before `I` reaches step (2): `I`'s bucket upsert
  (ROW EXCLUSIVE) blocks on `vote_buckets` until `C` commits. `C` holds no lock
  that `I` needs beyond those, and `I` holds only `ACCESS SHARE` on `song_state`
  (compatible with `C`'s SHARE) plus its exclusive `vote_events` row (not in
  `C`'s set). No cycle.
- If `I` reaches step (2) first: `I` holds a `vote_buckets` **row** lock.
  `C`'s `LOCK TABLE vote_buckets IN SHARE MODE` waits for that row lock to clear
  (table SHARE conflicts with the ROW EXCLUSIVE the upsert took). `I` proceeds to
  (3), (4) and commits — it never waits on anything `C` holds. No cycle.

Because `I` acquires its two shared-set resources in the same relative order `C`
does (P5), and holds nothing in `state_head`/`song_state`, there is no circular
wait. The review's Option D1 (drop `song_state` row lock; serialize via the
`vote_buckets` PK) is therefore **validated**: the bucket upsert's row lock is the
serialization point for same-song-hour events, and it is ordering-compatible with
`0014`. We keep `song_state` as a read for validation (D1's "validation read"),
not as a lock.

### C.3 Concurrent timelines

**Timeline 1 — two distinct events, same song-hour (`I1`,`I2`), vs rollover (`C`).**

```
I1: INSERT vote_events E1            -> ok (owns E1)
I1: upsert vote_buckets (X,H)        -> takes ROW EXCLUSIVE row lock (X,H)
C : LOCK state_head FOR UPDATE       -> ok
C : LOCK ... vote_buckets IN SHARE   -> BLOCKS (I1 holds ROW EXCLUSIVE on (X,H))
I1: UPDATE coverage (X,H)            -> ok
I1: INSERT invalidation              -> ok
I1: COMMIT                           -> releases row lock
C : ...acquires SHARE                -> proceeds; snapshot re-check sees I1's bucket
```
No deadlock; `C` re-checks coverage/bucket after acquiring SHARE (`0014:444–451`)
and will detect I1's change via the coverage `revision` bump (§E) → `stale-state`
→ rollover retries. Correct.

**Timeline 2 — two ingestions of the SAME identity (`I1`,`I2`).**

```
I1: INSERT vote_events E (ON CONFLICT DO NOTHING) -> returns id (owns E)
I2: INSERT vote_events E (ON CONFLICT DO NOTHING) -> BLOCKS on unique index (P2)
I1: upsert bucket; update coverage; insert invalidation; COMMIT
I2: -> unblocks; DO NOTHING returns null (P2)
     fresh SELECT reads E; canonical_payload_matches -> true
     return already-ingested   (NO bucket write, NO invalidation)
```
One event, one increment. No `song_state` involvement required for identity (F3
resolved).

**Timeline 3 — conflicting payload, same identity (`I1`,`I2`).** Same as Timeline 2
but `canonical_payload_matches` is false → `I2` raises
`BORA_ENGINE_EVENT_IDENTITY_CONFLICT` → whole transaction rolls back → no bucket
write, no invalidation. Deterministic conflict.

### C.4 Retry boundary for `40P01` / `40001`

Deadlock (`40P01`) and serialization failure (`40001`) **propagate out** of the
RPC to the caller (the worker). The RPC must **not** swallow them into
`persistence-failure`, because the transaction was rolled back atomically and is
safe to re-run. The worker owns the retry:

- Retry the **entire** `bora_engine_ingest_vote_event` with the **same**
  `sourceEventId` and **identical** canonical payload.
- Bounded attempts (e.g. 5) with exponential backoff + jitter.
- Idempotency is preserved across retries because the identity claim (§B step 3)
  is the first write: a retry that loses the race resolves to `already-ingested`,
  never a second increment.
- A retry that exhausts attempts becomes `persistence-failure` (known rollback) —
  **not** `commit-unknown` (the server told us it aborted).

Retries occur **only** at the whole-transaction boundary. No step is retried in
isolation; that is what guarantees no duplicate side effects.

## D. Unknown-commit reconciliation protocol

The correction to F4: **a read that finds no event is never proof that the
original transaction can no longer commit.** Under `READ COMMITTED`, a concurrent
in-flight transaction is invisible to a reader until it commits; absence in one
read therefore only means "not committed *as of my snapshot*," not "will never
commit." The reconciliation protocol must not branch on absence. Instead, the
unique event identity and full canonical payload are the arbiter, and the safe
action is always to **re-run the complete idempotent transaction**.

### D.1 Three outcome classes

| Class | Server signal | Reconciler action | Result |
| --- | --- | --- | --- |
| **Confirmed commit** | RPC returned `ingested`/`already-ingested` (a definite response). | None; done. | Terminal. |
| **Confirmed rollback** | RPC returned `invalid-input`, `conflicting-identity`, or `persistence-failure` — a definite **error** the server committed to. | `invalid-input`/`conflicting-identity`: drop/alert (non-retryable). `persistence-failure`: re-run is safe but the server affirmatively rolled back. | Terminal or re-run. |
| **Commit outcome unknown** | Connection dropped, timeout, `40P01`, `40001`, or worker crash after send. | **Re-run the full transaction** with the same identity + payload (§D.2). | Resolved by re-run. |

The critical distinction the earlier design blurred: `40P01`/`40001` are
**retryable** (server rolled back; re-run is clean). A **connection loss after
send** is **unknown** (server may have committed). Both are *handled* by re-running
the full idempotent transaction, but they are **not interchangeable**: the
`40P01`/`40001` path is an in-worker bounded retry (§C.4); the connection-loss path
is a **deferred reconciliation** that re-runs the same transaction after an
arbitrary delay and must tolerate the original having committed meanwhile.

### D.2 Why re-running the full transaction is always safe

The reconciler does **not** run a "check then increment" sequence. It re-invokes
`bora_engine_ingest_vote_event` verbatim. That transaction is safe under every
interleaving because its **first write is the identity claim** (§B step 3):

- **Original did commit.** The re-run's `INSERT … ON CONFLICT DO NOTHING` returns
  null (the committed row exists), the handler compares the full payload, finds a
  match, and returns `already-ingested` — **no** bucket increment, **no** second
  invalidation.
- **Original did not commit (rolled back or never ran).** The re-run's claim
  succeeds and it performs the single increment.
- **Original is still in flight (uncommitted) when the re-run starts.** The re-run's
  `ON CONFLICT DO NOTHING` **blocks** on the unique index until the original
  resolves (P2). If the original commits, the re-run unblocks, sees the conflict,
  and returns `already-ingested`. If the original aborts, the re-run's insert
  proceeds and it becomes the single commit. Either way exactly one increment.

Because the identity claim is the **first** statement and the bucket increment is
**strictly after** a successful claim, no interleaving of an in-flight original and
a re-running reconciler can produce two increments. The bucket row lock (§C.2 step
2) additionally serializes the *distinct-event* case so that two different events
for the same song-hour both increment, exactly once each.

### D.3 Concurrent reconcilers

Two reconcilers `R1`,`R2` for the same identity, plus a possibly-live original `O`:

```
O : INSERT vote_events E ...   [in flight, uncommitted]
R1: re-run -> INSERT E (ON CONFLICT DO NOTHING) -> BLOCKS on O (P2)
R2: re-run -> INSERT E (ON CONFLICT DO NOTHING) -> BLOCKS on O (P2)
O : outcome:
   case commits  -> R1,R2 unblock; DO NOTHING -> null; both read E; match;
                    both return already-ingested; bucket incremented ONCE (by O)
   case aborts   -> exactly one of R1/R2 wins the insert (index serializes);
                    the other blocks then sees conflict -> already-ingested;
                    bucket incremented ONCE (by the winner)
```

The unique index plus the claim-first ordering guarantee at most one increment no
matter how many reconcilers race the original. Absence is never consulted as a
precondition; only the claim's outcome (row returned vs. conflict) decides.

### D.4 Reconciliation is not a separate code path

There is **one** writer. "Reconciliation" is simply "call the same idempotent
transaction again." This is what removes the F4 hazard: no code path exists that
reads absence and then force-increments. The unique index is the single source of
truth for whether the event is durably owned.

## E. Coverage revision and invalidation model

The F2 root cause: `hourly_input_coverage` (0012:169–183) is **status-only** — it
has `status`/`detail`/`checked_at` but **no revision, no currentness, no
invalidation link**. Ingestion could flip a row to "invalidated" in the earlier
design only by inventing a state the schema cannot store, and the state-head
revision (`0014`) cannot see per-slot changes. The corrected model adds an
authoritative, monotonic **per-slot revision** and a durable invalidation record,
using the existing `coverage-evidence.ts` contract unchanged.

### E.1 Authoritative revision per coverage slot

Each `bora_engine_hourly_input_coverage` row gains (proposed, §J):
- `revision bigint not null default 0` — monotonic; bumped on every invalidation
  and every successful re-assessment for that `(song, input_type, hour)`.
- `currentness text check (currentness in ('current','invalidated','stale','unresolved'))`
  — defaults to `'unresolved'`; only an authoritative check sets `'current'`.
- `evidence_id uuid` — stable identity used when a true source revision is
  unavailable (so we never fabricate a monotonic number; matches
  `assessCoverageEvidence`'s `revision === null && !evidenceId` guard).
- `assessed_at timestamptz`, `source_identity text` — attribution to
  `secure_vote_events` for vote-history.

The revision is **authoritative** because it lives in the same row as the coverage
fact and is mutated only by the two trusted writers: the ingestion transaction
(§B step 5, invalidation) and a re-assessment/reconciliation operation. It is not
an application counter.

### E.2 Invalidation semantics (reuse `coverage-evidence.ts`)

The mapping to the existing shared contract:
- `doesVoteEventInvalidateCoverage({kind:'vote-history', period}, H)` is true
  exactly when the slot's hour equals `H` (or the interval contains `H`). Ingestion
  invalidates the single `(song,'VOTES',H)` slot for event hour `H`.
- `doesVoteEventInvalidateEvaluation(R, H)` is true for every reference hour
  `R ∈ [H, H+71]`. This is the **dependent-window** rule: an event at `H` makes
  every 72-hour evaluation whose window contains `H` stale.
- `VoteHistoryInvalidation` is persisted to the new
  `bora_engine_vote_coverage_invalidation` table (append-only, immutable trigger
  like `0013`/`0017`), carrying `sourceSystem`, `sourceEventId`, `eventHour` (from
  the original committed timestamp, never ingest time), `invalidatesRevision` /
  `invalidatesEvidenceId` (the superseded values, or null if none existed — never
  zero), and `reason: 'late-accepted-event'`.

Because the invalidation is written in the **same transaction** as the event and
bucket (§B), there is no window where the bucket shows the vote but the coverage
still reads `current`. Late events cannot leave affected coverage marked current.

### E.3 Independent attribution, vote vs seed isolation

- Coverage is isolated by `(song_id, input_type, hour_index)` — the existing PK.
  `vote-history`, `seed-history`, and each platform are separate `input_type`s, so
  they never contaminate one another.
- Vote coverage is attributed to `source_identity = 'secure_vote_events'`.
  Seed coverage is attributed to the rollover's seed injection (§I.3) — an
  independent authority. `assessVoteSeedHistoryCoverage` already requires both
  independently; the design only makes the persisted rows carry the identity and
  revision those checks compare.
- `assessCoverageEvidence(record, expected)` remains unchanged; it already
  enforces source-match, revision/evidenceId match, assessment-time validity, and
  `currentness === 'current'`. The schema change simply lets persisted rows satisfy
  (rather than always fail) those checks.

### E.4 Complete H-71…H and H-167…H evidence

Unchanged windows: `C_WINDOW_HOURS = 72`, `PLATFORM_WINDOW_HOURS = 168`. For
reference hour `R`, readiness needs current, source-matched evidence for every
hour in `[R-71, R]` for both VOTES and SEED (72 each) and for every hour in
`[R-167, R]` for each of youtube/spotify/boomplay (168 each). This design's only
job is to ensure the stored rows carry identity + revision + currentness so those
existing checks can pass; the window arithmetic itself is not redesigned (§I).

## F. Evaluation/publication serialization boundary

The F2 defect: a publication could read coverage as `current`, a late vote could
commit an invalidation, and the publication could still commit using the stale
snapshot, because (a) ingestion did not bump any revision the publication compares,
and (b) the coverage recheck was a non-locking `READ COMMITTED` read that does not
contend with ingestion's write. The corrected boundary closes both.

### F.1 Pin expected revisions into the candidate

The evaluation/publication candidate pins, for every required coverage slot, the
`(song, input_type, hour, revision, currentness)` it evaluated against — exactly
the identity `assessCoverageEvidence` already compares. These are carried in the
request as `expectedCoverageRevisions` alongside the existing
`expectedState { revision, referenceHour }`
(`publication-transaction.ts:47–50`). A candidate whose evidence lacked a stable
revision or evidenceId is **not ready** (it cannot be pinned), matching the
existing `evidence-identity-missing` guard.

### F.2 Serialize publication against invalidation with a locking recheck

The publish transaction (a future `bora_engine_publish_chart` RPC, §J) must, in
**one** transaction:

1. `SELECT … FOR UPDATE` the `bora_engine_hourly_state_head` row and confirm the
   pinned `expectedState.revision`/`referenceHour` still match (CAS guard already
   implied by `0014`'s state-head model). Mismatch → `stale-state`, abort.
2. Take a **shared row lock** on every coverage slot the candidate depends on:
   `SELECT … FOR SHARE` over the `(song, input_type, hour)` rows in the pinned
   set. This is the serialization point: a concurrent ingestion invalidation
   (`UPDATE` → `ROW EXCLUSIVE`) **blocks** on these `FOR SHARE` locks, and the
   publication's recheck (`FOR SHARE`) **blocks** on an in-flight invalidation.
   This replaces the non-locking read that caused F2.
3. Inside those locks, re-run `assessCoverageEvidence` for every slot against the
   **current** row values: require `currentness === 'current'` **and** `revision`
   equal to the pinned value **and** source-identity match. Any `invalidated` /
   `stale` / revision-mismatch → `not-ready`, **no** pointer advance, no write.
4. Only if all rechecks pass: insert the immutable publication header + entries,
   then advance `bora_engine_publication_head` guarded by
   `expectedCurrentPublication` (the existing CAS in `publication-transaction.ts`).

### F.3 Why the stale-publication timeline cannot succeed

```
Publication P                          Ingestion I (late vote, song X hour H)
----------------                       ----------------
SELECT ... FOR SHARE coverage(X,H)     
   [holds row lock]
                                      I: INSERT event E; upsert bucket(X,H)
                                      I: UPDATE coverage(X,H) currentness=invalidated,
                                            revision+1  -> BLOCKS on P's FOR SHARE
reassess coverage(X,H): currentness='current', revision==pinned -> PASS
insert snapshot; advance pointer
COMMIT -> releases FOR SHARE
                                      I: unblocks; commits invalidated + revision+1
```

Two orderings, both safe:
- **P locks first:** `I`'s invalidation blocks until `P` commits. `P` legitimately
  publishes a snapshot that was current at its commit; `I` then invalidates for
  the **next** evaluation. Committed publication stays immutable (F-d in review);
  invalidation affects future eligibility only.
- **I commits first:** `P`'s `FOR SHARE` recheck reads `currentness='invalidated'`
  and/or `revision != pinned` → `not-ready`, abort, **pointer not advanced**. No
  stale publication.

Either way the "read current → invalidation commits → publish stale" sequence is
impossible, because `P` holds `FOR SHARE` from before its recheck through its
commit, so `I` cannot commit in that window. The revision pin catches the case
where `I` committed before `P` even started.

### F.4 Missing database guarantee, stated explicitly

The draft schema does **not** currently provide this. Required but absent (see §J):
- a `revision`/`currentness`/`source_identity`/`evidence_id` on
  `bora_engine_hourly_input_coverage` (so a recheck has something authoritative to
  compare and a row to lock);
- a `bora_engine_publish_chart` RPC that performs the `FOR SHARE` recheck and the
  pointer CAS atomically (the drafts define publication **tables** and a **pure**
  `publication-transaction.ts`, but **no** publication writer RPC).

Until those exist, publication cannot be considered safe against concurrent
ingestion; the gate (`publication-gate.ts`) is a pure, unwired contract and cannot
provide the serialization itself. This is a prerequisite, not an assumption.

## G. Late-event/rollover options and consequences

**Business policy is deliberately unresolved.** This section designs the
*coordination contract* so that whichever option the product owner selects can be
implemented safely; it does **not** choose one.

### G.0 The shared coordination contract (common to all options)

Regardless of policy, ingestion and rollover must never silently overwrite or
contradict each other. The shared protocol is:

1. **The closure snapshot is immutable.** `bora_engine_hourly_closures` rows and
   the committed `RolloverStep` values are never rewritten by ingestion. A late
   event never edits a closure.
2. **The coverage revision is the staleness signal.** Any late event that must
   affect a closed hour writes the invalidation + revision bump (§E) in its
   transaction. Rollover's own snapshot re-check (`0014:444–451`) already compares
   `coverage`; with the revision column (§E.1) a late event makes that comparison
   fail → `stale-state` → rollover retries rather than committing a contradicted
   closure.
3. **Lock order is shared (§C).** Ingestion takes bucket→coverage row locks in
   rollover's relative order and holds no `song_state`/`state_head` lock. Rollover
   holds SHARE on both. They serialize; no silent overwrite.
4. **Deterministic outcome per policy.** Each option adds exactly one outcome to
   the ingestion result set (e.g. `late-hour-rejected`), decided *before* any write,
   so a late event's disposition is auditable and never ambiguous.

`phase_for(hour, occurredAt)` must deterministically classify a past hour as
`CLOSED` (review F8); the policy then decides what a `CLOSED` classification
*does*.

### G.1 Option A — Reject events for closed hours

Ingestion computes the hour; if the hour is already closed (behind the state-head
reference), return `late-hour-rejected` with **no** writes.

| Dimension | Effect |
| --- | --- |
| Event ledger | Late event **not** inserted into `bora_engine_vote_events`. |
| Bucket counts | Unchanged; the vote never reaches Engine history. |
| Hour closure | Untouched; closure snapshot stays authoritative. |
| Coverage currentness | Unchanged; no invalidation written. |
| Historical evaluations | Unaffected. |
| Future publication | Unaffected (no new staleness). |
| Auditability | The `vote_events` source row still exists (secure path); Engine simply declines it. Must log the rejection with reason for reconciliation. |

Simplest and safest for Engine integrity; the cost is Engine history diverges from
the secure source for late votes. Whether that divergence is acceptable is a
product decision (source `vote_events` remains the durable truth).

### G.2 Option B — Accept via explicit correction + requalification

Late event is persisted; a controlled correction path then re-derives the affected
hour and re-qualifies coverage before any dependent evaluation can proceed.

| Dimension | Effect |
| --- | --- |
| Event ledger | Late event **inserted** (identity-claimed, §B). |
| Bucket counts | Incremented **and** the affected hour's derived C recomputed from the ledger via the §H rebuild, gated behind an operator/worker step. |
| Hour closure | Closure row left immutable; a **correction** record references it (append-only). |
| Coverage currentness | Slot set `invalidated`, revision bumped (§E); requires a fresh authoritative re-check to return to `current`. |
| Historical evaluations | Any committed evaluation for a window containing `H` is marked stale for **future** eligibility; committed publications remain immutable. |
| Future publication | Blocked until the affected slot is reconciled to `current` with a matching revision (§F). |
| Auditability | Strongest: full invalidation history + correction link + rebuild trace. |

Most faithful to source truth and most operationally complex; needs the §H rebuild
and a requalification worker.

### G.3 Option C — Accept into historical buckets with defined reconciliation

Late event is accepted into the historical bucket immediately; a reconciliation
procedure periodically verifies/repairs aggregate-vs-ledger drift.

| Dimension | Effect |
| --- | --- |
| Event ledger | Late event **inserted**. |
| Bucket counts | Incremented live at the historical hour (the §B step-5 upsert runs even for `CLOSED`). |
| Hour closure | Closure snapshot immutable; its recorded `source_bucket_version` may now differ from the live bucket — the discrepancy is tolerated and later reconciled. |
| Coverage currentness | Slot `invalidated`, revision bumped (§E). |
| Historical evaluations | Dependent windows become stale; a later evaluation reads the updated bucket. |
| Future publication | Blocked until requalification (same as B) OR explicitly allowed to proceed on the reconciled bucket — **must be decided**. |
| Auditability | Good if the §H recount is run; risk is the closure-vs-bucket version gap going unreconciled. |

The dangerous ambiguity in C is that a closed hour's bucket changes *after* the
rollover already computed and persisted `C` from it, so replay/recompute semantics
must be pinned (this is exactly design U-4). C is only safe if the §H rebuild is
the declared authority and is actually run.

### G.4 Decision required

The three options differ in whether Engine history may diverge from source, whether
closed-hour aggregates may change post-closure, and how much reconciliation
machinery is required. **The product owner must select one** (or an explicit hybrid)
before implementation; this design does not select. The coordination contract
(G.0) makes any of them implementable without silent contradiction.

## H. Bucket integrity and reconciliation

### H.1 Authority vs. derived projection

- **Authoritative:** `bora_engine_vote_events` (immutable ledger; one row per
  canonical event). This is the source of truth for "what votes happened."
- **Derived projection:** `bora_engine_vote_buckets.upvotes/downvotes` (a materialized
  sum per song-hour). It is a cache for fast C computation, **not** truth.
- **Also derived:** closure `C` values, which are computed from buckets at rollover.

Stating the authority direction explicitly is what makes drift detectable and
repairable: if the projection ever disagrees with the ledger, the **ledger wins**.

### H.2 Exactly-once guarantees (atomic relationship)

Event insert, bucket increment, coverage invalidation, and dependent-evaluation
staleness commit **together** or not at all (single transaction, §B):

| Scenario | Event row | Bucket | Coverage/staleness |
| --- | --- | --- | --- |
| New canonical event | inserted | +1 once | invalidated + revision bumped |
| Exact retry (same identity + payload) | already present; **no** new row | **no** change (early return §B) | **no** change |
| Conflicting identity reuse | **no** insert (raise) | **no** change (rollback) | **no** change |
| Known rollback (`40P01`/`40001`/error) | rolled back | rolled back | rolled back |
| Unknown commit (connection loss) | resolved by idempotent re-run (§D) | at most one increment (§D) | at most one invalidation (§D) |
| Concurrent distinct events, same song-hour | both inserted (distinct identities) | both increment, serialized by bucket row lock (§C) | both invalidate (idempotent slot update) |

The ordering invariant that makes this hold: **the identity claim is the first
write; the bucket increment occurs only after a successful claim; the coverage
invalidation follows the increment — all in one transaction.** No partial durable
effect is possible.

### H.3 Deterministic rebuild when the projection drifts

Because the bucket is a derived sum, a separate, trusted **rebuild** procedure is
required as the canonical repair and drift detector (review F6). It is a
`security definer`, `service_role`-only operation (§J), run outside the live
ingestion path:

```
FUNCTION bora_engine_rebuild_vote_bucket(p_song_id uuid, p_hour bigint)
  AUTH: service_role only.
  -- Serialize with ingestion for this song-hour via the same bucket row lock (§C).
  select coalesce(sum(case when vote_type='up' then 1 else 0 end),0),
         coalesce(sum(case when vote_type='down' then 1 else 0 end),0)
    into v_up, v_down
    from bora_engine_vote_events
   where song_id = p_song_id and hour_index = p_hour;

  insert into bora_engine_vote_buckets (song_id, hour_index, upvotes, downvotes, phase, version)
  values (p_song_id, p_hour, v_up, v_down, phase_for(p_hour, ...),
          coalesce((select version from bora_engine_vote_buckets
                     where song_id=p_song_id and hour_index=p_hour),0) + 1)
  on conflict (song_id, hour_index) do update
     set upvotes=v_up, downvotes=v_down,
         version = bora_engine_vote_buckets.version + 1;
  return {'status':'rebuilt','up':v_up,'down':v_down};
```

Properties:
- **Deterministic:** the recount reads only the immutable ledger, so the same
  `(song, hour)` always yields the same counts.
- **Race-safe:** it takes the same bucket row lock as ingestion (§C), so a
  concurrent ingest either precedes the recount (and is included) or follows it
  (and re-increments on top of the rebuilt base). Because it *sets* (not adds) from
  the authoritative ledger, a concurrent ingest that commits after the read is
  re-applied by its own +1 on the rebuilt row — never lost, never doubled, provided
  the recount's read and the bucket write are in one transaction holding the row
  lock.
- **Verification (read-only):** a separate check compares each bucket against the
  ledger recount; any mismatch blocks readiness until repaired. This is the audit
  that surfaces drift without mutating anything.

The rebuild also discharges design U-4: an invalidated hour is repaired by
recounting from the ledger, never by trusting a possibly-drifted aggregate.

## I. Corrected bootstrap/readiness predicate

### I.1 Verified logical slots per active song

Windows are **unchanged** (`C_WINDOW_HOURS = 72`, `PLATFORM_WINDOW_HOURS = 168`):

| Input | Hours required | Count |
| --- | --- | --- |
| VOTES (`vote-history`) | `[R-71, R]` | 72 |
| SEED (`seed-history`) | `[R-71, R]` | 72 |
| YOUTUBE | `[R-167, R]` | 168 |
| SPOTIFY | `[R-167, R]` | 168 |
| BOOMPLAY | `[R-167, R]` | 168 |
| **Total** | | **648 logical slots / active song** |

Confirmed against source: `assessVoteSeedHistoryCoverage` iterates the 72-hour
window for both VOTES and SEED (`vote-event-ingestion.ts`), and
`source-readiness.ts` requires each platform across its 168-hour window.

### I.2 Why the draft's 506 is insufficient

`bora_engine_bootstrap_state` (`0015:147–166`) counts coverage rows where:
- `(input_type in ('VOTES','SEED') and hour_index = p_reference_hour)` → 1 + 1 = **2**
- `(input_type in ('YOUTUBE','SPOTIFY','BOOMPLAY') and hour_index between ref-167 and ref)` → 3 × 168 = **504**

and requires `count = active × 506`. The gap is the vote/seed window: bootstrap
checks **only the single reference hour** for VOTES/SEED (2 slots) where the
evaluation gate needs **72 + 72 = 144** slots. The 504 platform slots match. Net
shortfall: **648 − 506 = 142 per song**, entirely vote/seed. So bootstrap can pass
while `assessVoteSeedHistoryCoverage` still reports the song `not-ready` for lack
of 71 prior vote hours and 71 prior seed hours. This is confirmed from the actual
SQL, not inferred.

Additionally, `bora_engine_readiness` (`0016:106–115`) reports the VOTES check only
for `hour_index = v_closed_hour` (single hour), not the 72-hour window — the same
under-scoping on the readiness side.

### I.3 Corrected predicate (row count alone is not sufficient)

The readiness predicate must require that **every one of the 648 logical slots per
active song** carries **authoritative, source-matched, COMPLETE, and current**
evidence — not merely that 648 rows exist. Concretely, for each active song and
each required `(input_type, hour)`:

1. A coverage row exists with `status = 'COMPLETE'`.
2. `currentness = 'current'` (not `invalidated`/`stale`/`unresolved`) — this is what
   makes a late event block readiness (§E).
3. `source_identity` matches the expected authority for that input type
   (`secure_vote_events` for VOTES; the seed authority for SEED; the platform
   provider identity for each platform).
4. A stable evidence identity is present: `revision` (non-null) **or** `evidence_id`
   (UUID), so `assessCoverageEvidence` can compare without fabricating a revision.
5. `assessed_at` is a valid, interpretable timestamp.

This is exactly the conjunction `assessCoverageEvidence` already enforces; the
correction is that readiness must **call it** for all 648 slots (and bootstrap must
require the same 648, not 506). A bare `count(*) = active × 648` is still not
enough if rows can be `COMPLETE` but `stale`, or source-unattributed — hence the
per-slot predicate, not a blind numeric replacement.

### I.4 Seed-history authority without inventing history

Seed coverage gets a trusted authority from the rollover's own committed seed
injection: `bora_engine_seed_hours` (0012:147–164) rows carry `version` and
`origin_event_id`, are written by `commit_hour` in the closure transaction, and are
the Engine's established seed source. A seed slot is `COMPLETE`+`current` only when
a seed row (or an explicit, authoritative checked-empty backed by the closure) backs
it, attributed to `source_identity = 'seed-history'` with the closure's revision.
**Missing rows are never `checked-empty`** and never zero: only a successful,
authoritative check can produce `checked-empty` (the existing `coverage-evidence.ts`
outcome). This satisfies the "no invented history, no missing-implies-zero"
constraint while giving seed evidence an authority independent of vote evidence
(U-5 remains the product confirmation of this choice).

## J. Minimum required schema and RPC guarantees

Described only — **no migration, function, or RPC is created or edited by this
document.** Each is forward-only and additive.

### J.1 Schema additions (the exact missing database guarantees)

1. **`bora_engine_vote_events` provenance columns** (enables §B exact-retry
   comparison). Add nullable `voter_ref uuid`, `identity_method text`,
   `identity_version integer`, `idempotency_key uuid`. The existing
   `unique (source_system, source_event_id)` (0012:78) is retained as the arbiter
   and needs no change.
2. **`bora_engine_hourly_input_coverage` authoritative-revision columns** (enables
   §E/§F). Add `revision bigint not null default 0`, `currentness text` with the
   four-value check, `source_identity text`, `evidence_id uuid`,
   `assessed_at timestamptz`, `invalidated_reason text`. `currentness` defaults to
   `'unresolved'`.
3. **`bora_engine_vote_coverage_invalidation`** (append-only, immutable trigger like
   `0013`/`0017`): `song_id`, `hour_index`, `source_system`, `source_event_id`,
   `invalidates_revision`, `invalidates_evidence_id`, `invalidated_at`, with
   `unique (source_system, source_event_id)` so an exact retry cannot append a
   second invalidation.

### J.2 RPC guarantees (all `security definer`, `service_role`-only)

1. **`bora_engine_ingest_vote_event(p_event jsonb)`** — the §B transaction:
   identity claim via `ON CONFLICT DO NOTHING RETURNING`, then bucket upsert, then
   coverage invalidation, atomically. Rejects `40P01`/`40001` to the caller (does
   not swallow). Grants `service_role`; execute revoked from `public`/`anon`/
   `authenticated`.
2. **`bora_engine_rebuild_vote_bucket(p_song_id uuid, p_hour bigint)`** — the §H
   deterministic recount, `service_role`-only.
3. **`bora_engine_publish_chart(...)`** — the §F publication transaction: state-head
   CAS + `FOR SHARE` coverage recheck + immutable snapshot + pointer advance,
   atomically. **This does not exist in the drafts**; publication tables and the
   pure `publication-transaction.ts` exist, but no writer RPC.
4. **Readiness/bootstrap predicate change** — `0016` extended to the full 72-hour
   vote/seed window and `0015`'s `× 506` replaced by the 648-slot authoritative
   predicate (§I). This is a change to the draft RPCs' logic, not a new object, and
   is listed here as a required guarantee, not implemented.

### J.3 Security boundary retained (unchanged constraints)

- Ingestion, rebuild, and publish are **server-trusted** operations only.
- Every privileged RPC is `security definer` with a fixed `search_path`, a
  `service_role`-only `auth.role()` guard, and `EXECUTE` revoked from `public`,
  `anon`, `authenticated` — matching `0014`–`0016`.
- The service-role key (`BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY`) stays server-side;
  `persistence.ts` is `import 'server-only'`; no secret reaches browser code.
- Client-submitted event identities and provenance are **not trusted**: the server
  re-derives/validates `source_system`, `sourceEventId`, `songId`, `voteType`, and
  `occurredAt`, and reads provenance back from the trusted `vote_events` source
  where available (A-γ).
- **No fallback to legacy aggregate counters** (`handle_song_vote`) on secure-
  ingestion failure; failures surface as `persistence-failure`/`commit-unknown`,
  never as a silent legacy write.
- `NEXT_PUBLIC_BORA_SECURE_VOTING` remains **unchanged and off**; the live voting
  path is not touched.
- **Voter provenance retention** is governed by an approved privacy/retention
  policy: `voter_ref` is an opaque `auth.uid()` UUID, but it is still a stable
  identifier. Whether it is stored long-term in the Engine ledger or reduced to a
  salted/hash fingerprint after a retention window is **unresolved** (carried
  forward as design U-2 / §M) and must be decided before the ledger columns are
  populated at scale.

## K. Failure matrix with expected outcomes and retry ownership

| # | Failure / condition | Postgres signal | Durable effect | Result status | Retryable? | Retry owner & boundary |
| --- | --- | --- | --- | --- | --- | --- |
| K1 | New valid event | none (commit) | event + bucket +1 + invalidation | `ingested` | n/a | — |
| K2 | Exact retry (same identity + payload) | `ON CONFLICT DO NOTHING` → null | none (early return) | `already-ingested` | no | — (terminal) |
| K3 | Conflicting payload, same identity | raise custom | full rollback | `conflicting-identity` | **no** | operator/alert |
| K4 | Invalid input (bad UUID/timestamp/type) | validation, no write | none | `invalid-input` | **no** | operator/alert |
| K5 | Unknown song | no `song_state` row | none | `invalid-input` | no | — |
| K6 | Deadlock with rollover/other | `40P01` | full rollback | (surfaced) | **yes** | worker: whole-txn retry, bounded backoff (§C.4) |
| K7 | Serialization failure | `40001` | full rollback | (surfaced) | **yes** | worker: whole-txn retry, bounded backoff (§C.4) |
| K8 | Connection loss after send | none received | **unknown** (may/may not have committed) | `commit-unknown` | via re-run | deferred reconciler: re-run full txn (§D), not a blind increment |
| K9 | Worker crash after send | none received | **unknown** | `commit-unknown` | via re-run | as K8 |
| K10 | Exhausted bounded retries (K6/K7) | repeated aborts | full rollback | `persistence-failure` | re-run safe | reconciler treats as known-rollback; re-run is clean |
| K11 | Bucket/coverage constraint violation | constraint error | full rollback | `persistence-failure` | re-run safe | reconciler / operator |
| K12 | Late event, policy = reject (if chosen) | none (pre-write return) | none | `late-hour-rejected` | no | — (policy G.1) |
| K13 | Concurrent distinct events, same song-hour | none (row-lock serialize) | both increment once | `ingested` ×2 | n/a | — |

Retry-ownership rule: **only whole transactions are retried**, never individual
steps. `40P01`/`40001` are in-worker bounded retries (the server rolled back);
connection loss / crash are `commit-unknown` resolved by a **deferred idempotent
re-run** (the server may have committed). `invalid-input` and `conflicting-identity`
are **never** retried — they are deterministic rejections. This keeps the three
conditions non-interchangeable while giving each a correct, single retry path.

## L. Approval gates and phased implementation plan

Each phase has explicit prerequisites and an approval gate. No phase activates
ingestion, publication, or the live voting path on its own.

- **P1 — Schema groundwork.** Add §J.1 (provenance columns, coverage
  revision/currentness columns, invalidation table). *Prerequisite:* confirm
  `0010`/`0012` applied in target; provenance available in source (A-γ).
  *Gate:* schema review; forward-only additive statements; no semantic change to
  existing columns.
- **P2 — Ingest RPC.** Add §J.2.1 `bora_engine_ingest_vote_event` with the §B
  claim-first ordering and §C lock order. *Prerequisite:* P1.
  *Gate:* security review (service_role-only, no anon path); concurrency test
  proving one increment under same-identity race and no deadlock against a
  `commit_hour`-shaped transaction; `40P01`/`40001` surface to caller.
- **P3 — Rebuild RPC + verification.** Add §J.2.2 and the read-only drift check.
  *Prerequisite:* P1. *Gate:* rebuild matches ledger; verification blocks
  readiness on injected drift.
- **P4 — Readiness/bootstrap alignment.** Extend `0016` to the 72-hour vote/seed
  window; replace `0015`'s `× 506` with the §I 648-slot authoritative predicate.
  *Prerequisite:* P1. *Gate:* confirm the predicate rejects `COMPLETE`-but-`stale`
  and source-unattributed rows; no blind numeric swap.
- **P5 — Persistence adapter + worker.** Add `ingestVoteEvent` /
  `reconcileUnknownCommit` to `persistence.ts`; a trusted poller reads newly
  accepted `vote_events` and calls the RPC; implements §C.4 and §D retry/reconcile
  ownership. *Prerequisite:* P2. *Gate:* `commit-unknown` ≠ `persistence-failure`;
  no legacy fallback; no `server-only` leak to client.
- **P6 — Late-event policy implementation.** Implement the product-owner-selected
  option (§G) on top of the shared coordination contract. *Prerequisite:* P2 + the
  §M policy decision. *Gate:* explicit product sign-off on one option; `phase_for`
  deterministic for closed hours.
- **P7 — Publication RPC.** Add §J.2.3 `bora_engine_publish_chart` with the §F
  `FOR SHARE` recheck + pointer CAS. *Prerequisite:* P1–P5.
  *Gate:* publication activation is a separate, explicit approval; stale-candidate
  test proves the pointer does not advance; committed snapshots immutable.

Prerequisites for authorizing implementation overall: P1–P7 gates satisfied, the
§M product decisions made, and the security boundary (§J.3) reviewed.

---

## M. Explicit assumptions and unresolved decisions

### M.1 Assumptions (must be verified during implementation)

- **A-α:** Supabase/PostgREST executes a `security definer` RPC as one transaction
  (atomicity of §B depends on it). *Not proven from source; verify at deploy.*
- **A-β:** The `security definer` + `service_role` grant model matches how
  `0014`–`0016` are written. *Consistent in the drafts; deployment unverified.*
- **A-γ:** `public.vote_events` (0010) is present and carries `voter_ref`,
  `identity_method`, `identity_version`, `idempotency_key`, `created_at`, and `id`
  as the canonical `sourceEventId`. *Schema read from 0010; production status is a
  `[VERIFY]` item.*
- **A-δ:** `phase_for(hour, occurredAt)` can deterministically classify a past hour
  as `CLOSED`. *Design assumption; must be pinned in P6.*
- **A-ε:** The `ON CONFLICT DO NOTHING` + bucket-row-lock serialization behaves as
  P2/P5 describe under the deployed Postgres version. *Standard behavior; verify
  under load in P2.*

### M.2 Unresolved decisions (require product/owner approval; not chosen here)

- **U-1 — Backfill scope:** ingest pre-existing `vote_events` history, or start from
  cutover forward (implication for the 72-hour vote/seed window).
- **U-2 — Voter-retention policy:** long-term `voter_ref` in the ledger vs. a
  salted/hash fingerprint after a retention window (privacy decision; §J.3).
- **U-3 / §G — Late-event policy:** Option A (reject), B (correction +
  requalification), or C (accept + reconciliation). **Product owner must select.**
- **U-4 / §H — Invalidation vs. recompute:** resolved *technically* by making the
  ledger authoritative and the rebuild canonical; the *product* must still confirm
  that a recomputed bucket may differ from a committed closure's recorded value.
- **U-5 / §I.4 — Seed authority source:** confirm the rollover closure/seed_hours is
  the accepted seed evidence authority.
- **U-6 / §I — Bootstrap shape:** change `0015` to the 648-slot predicate vs. gate
  bootstrap on a full-window check (operational pre-staging difference).
- **U-7 / §E — Revision fabrication:** confirm the `revision`/`evidence_id` split is
  the accepted way to avoid synthesizing a monotonic number when the source cannot
  establish one.

---

## Confirmation of boundaries

Design and documentation only. No application code, existing design/review
document, migration, RPC, SQL function, or database state was created or modified;
no migration was applied; no live voting, scoring, chart behavior, or feature flag
was changed; ingestion was not connected to any production path; the dev server was
not deployed, restarted, or stopped; no tests, builds, TypeScript checks, or lint
were run; all existing worktree changes are preserved. This document adds exactly
one file, `docs/bora-engine-corrected-transaction-design.md`.
`NEXT_PUBLIC_BORA_SECURE_VOTING` remains off.













