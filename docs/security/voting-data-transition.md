# Voting Data Model and Reconciliation Contract

Status: The typed secure-event boundary and pure Engine-hour mapping are
implemented. Database ingestion, cutover, reconciliation, and activation are
not implemented.

This document records the verified relationship between BORA's **legacy
aggregate voting system** and the **new secure per-voter event system**, based
on static inspection of the SQL migrations and application code. It does not
implement a cutover, activate the secure path, reconcile data, or change live
voting behavior.

Every claim below is tagged with its basis:

- **[SOURCE]** — established directly by reading the code/migration.
- **[UNKNOWN]** — not established by source; requires runtime or production
  verification and is explicitly not guessed here.

---

## 1. Current architecture and the active legacy path

Public voting today runs through the legacy RPC. The secure path exists but is
gated behind a default-off feature flag. **[SOURCE]**

- Active caller: `app/components/ChartWrapper.tsx` → `handleVote()`.
- Switch: `const SECURE_VOTING = process.env.NEXT_PUBLIC_BORA_SECURE_VOTING === 'true';`
  - The hardened path executes **only** when this value is the exact string
    `"true"`. Missing / empty / any other value → legacy path.
  - **[SOURCE]** The flag is **not** set in `.env.local` or any environment;
    public voting therefore continues on the legacy path.
- The secure branch performs **no** fallback to the legacy RPC on failure; it
  throws, which the existing `catch` turns into the current failure UI.
  **[SOURCE]**

Because the flag is off, `cast_vote_secure` and `vote_events` are present in
the schema (migration `0010` is applied on the production project) but are
**not yet written to** by the live public chart. **[SOURCE for code; verify
per-target whether 0010/0011 are actually deployed]**

---

## 2. Legacy versus secure data writes

### 2.1 Legacy `handle_song_vote(song_id uuid, vote_type text) RETURNS void`

Live production RPC. NOT `SECURITY DEFINER` (it relies on `anon` `UPDATE`
privileges on `public.songs`). **[SOURCE]**

Writes **only** aggregate columns on `public.songs`:

| Vote | Effect on `public.songs` |
|---|---|
| `'up'` | `upvotes + 1`, `momentum_score + 1` |
| `'down'` | `downvotes + 1`, `momentum_score - 1` |
| anything else | **silent no-op** (no write, no error) |
| unknown song id | **silent no-op** (updates 0 rows) |

It does **not** write a vote event, does **not** record any voter identity,
has **no** idempotency key, has **no** rate limiting, and does **not** write a
timestamp. `RETURNS void`, so the caller cannot distinguish "applied" from
"silently ignored". **[SOURCE]**

Executable by `PUBLIC`, `anon`, `authenticated`, `postgres`, `service_role`.
**[SOURCE]**

### 2.2 Secure `cast_vote_secure(p_song_id uuid, p_vote_type text, p_idempotency_key text) RETURNS jsonb`

`SECURITY DEFINER`, fixed `search_path = public, pg_temp`. **[SOURCE]**

Behavior, in order:

1. Resolve identity from `auth.uid()` (server-verified; a caller cannot forge
   another voter by changing a request field). Missing → error `28000`.
2. Validate `p_vote_type ∈ ('up','down')`; invalid → error `22023`.
3. Validate the song exists; missing → error `P0002`.
4. Validate `p_idempotency_key` is a valid UUID; missing/malformed → `22023`.
5. Rate limit: at most **60 accepted votes per `voter_ref` per rolling hour**;
   exceeding → error `P0001`. Migration `0011` serializes this per identity
   with `pg_advisory_xact_lock(hashtext(voter_ref::text))` **before** the count
   query to close the concurrent race. **[SOURCE]**
6. Insert a durable row into `public.vote_events`.
7. Update the **same** `public.songs` counters as the legacy RPC
   (`up` → `upvotes/momentum +1`; `down` → `downvotes +1`, `momentum -1`).
8. Return a `jsonb` result:
   - `status='accepted'` with a new `event_id`;
   - `status='duplicate'` for an **exact retry** (same voter + key + song +
     type) with **no** counter change;
   - a **raised error** (`23505`) if the key is reused with a *different*
     song/vote type (never a second accepted vote).

Idempotency is enforced at the database level by
`UNIQUE (voter_ref, idempotency_key)`. Executable by **`authenticated` only**
(`PUBLIC` and `anon` revoked). **[SOURCE]**

### 2.3 `public.vote_events` (created by migration `0010`)

| Column | Type / constraint | Meaning |
|---|---|---|
| `id` | `uuid PK default gen_random_uuid()` | event id |
| `song_id` | `uuid NOT NULL` FK → `songs(id)` `ON DELETE CASCADE` | voted song |
| `vote_type` | `text NOT NULL CHECK in ('up','down')` | validated type |
| `voter_ref` | `uuid NOT NULL` | `auth.uid()` |
| `identity_method` | `text CHECK in ('guest','account')` | derived from JWT |
| `identity_version` | `integer NOT NULL default 1` | identity schema version |
| `idempotency_key` | `text NOT NULL` | per-action key |
| `created_at` | `timestamptz NOT NULL default now()` | server timestamp |

Indexes: `UNIQUE (voter_ref, idempotency_key)` (idempotency), plus
`(voter_ref, created_at)` (rate-limit window), `(song_id)`, `(created_at)`.
RLS **enabled with no policies** and **no** `anon`/`authenticated` table
grants → the table is unreachable by direct guest writes; the RPC is the only
boundary. **[SOURCE]**

No personally identifying information (email/phone/IP) is stored — only the
opaque `voter_ref` plus method/version. **[SOURCE]**

---

## 3. Shared versus separate guarantees — comparison table

| Property | Legacy `handle_song_vote` | Secure `cast_vote_secure` |
|---|---|---|
| Writes `songs.upvotes` | Yes (+1 on up) | Yes (+1 on up) |
| Writes `songs.downvotes` | Yes (+1 on down) | Yes (+1 on down) |
| Writes `songs.momentum_score` | Yes (+1 up / −1 down) | Yes (+1 up / −1 down) |
| Writes a vote **event** row | **No** | Yes (`vote_events`) |
| Records voter **identity** | **No** | Yes (`voter_ref = auth.uid()`) |
| Records event **timestamp** | **No** (no per-event time) | Yes (`created_at`) |
| **Idempotency** guarantee | **None** (retry double-counts) | `UNIQUE(voter_ref, idempotency_key)` |
| **Rate limiting** | **None** | 60 accepted / voter / rolling hour |
| Server-side input validation | **Silent no-op** on bad input | Explicit errors (`22023`/`P0002`/`28000`) |
| Distinguishes applied vs ignored | **No** (`RETURNS void`) | Yes (`accepted` / `duplicate` / error) |
| Execution grant | `PUBLIC`, `anon`, `authenticated`, … | `authenticated` only |
| `SECURITY DEFINER` | No | Yes (fixed `search_path`) |

**Shared:** the three aggregate columns on `songs` are the *same* columns and
the *same* arithmetic in both systems. **[SOURCE]**

**NOT shared:** per-voter event history, identity attribution, timestamps,
idempotency, and rate limiting exist **only** in the secure system. Legacy
voting leaves no attributable trace beyond the running totals. **[SOURCE]**

**No reconciliation exists.** Neither migration nor application code contains
any backfill, deduplication, or merge step between the two systems.
**[SOURCE]**

---

## 4. Canonical event ownership and Engine mapping

The shared typed contract is
`lib/supabase/vote-event.ts::CanonicalAcceptedVoteEvent`. It represents
only an event backed by a committed `public.vote_events` row. Its stable
ingestion identity is `(sourceSystem, sourceEventId)`, with the source event
ID taken from `vote_events.id`. It preserves the song, direction, database
timestamp, verified voter identity and method/version, and per-voter
idempotency key.

Source ownership rules:

- `cast_vote_secure` is authoritative for secure events: only a successful
  transaction creates the row; rejected RPC calls create no accepted event.
- An exact retry returns `duplicate` and the already-created event ID. It is
  the same event, not a second accepted vote.
- Any future ingestion into `bora_engine_vote_events` must use
  `source_system = 'secure_vote_events'` and `source_event_id = vote_events.id`.
  Its unique `(source_system, source_event_id)` constraint is the final
  deduplication guard. Re-reading/retrying ingestion must upsert or skip by
  that identity, never allocate a new source ID.
- `voter_ref` plus `idempotency_key` is the source action identity protected by
  `vote_events`' unique constraint. It is retained by the typed contract for
  audit and reconciliation; it is not a substitute for the stable event-row
  identity.
- The legacy RPC cannot produce a trustworthy event: it has no event ID,
  timestamp, voter identity, or idempotency key, and returns `void`. Its
  aggregate updates are not eligible for canonical event ingestion.
- The `legacy_vote_event` value allowed by the Phase 2 ledger constraint does
  not establish a legacy event source. Do not write that source until an
  authoritative legacy event producer exists.

For a future cutover, declare an explicit UTC activation instant and route each
vote through exactly one authoritative RPC. Before activation, legacy writes
remain aggregate-only; secure-source rows at/after activation are prospective
events and must not be used to synthesize or replay the legacy opening totals.
The secure failure path must remain fail-closed: never retry a failed secure
request through `handle_song_vote`. A rollback to legacy writes ends prospective
event capture for that interval; it does not reverse or reconcile prior secure
events. The existing feature flag already avoids fallback, but does not itself
record this operational cutover boundary.

`mapAcceptedVoteEventToEngineInput` validates secure event fields and the
timestamp, derives `hourIndex = floor(epochMilliseconds / HOUR_MS)` (UTC epoch
hours, matching the Engine), preserves the event timestamp and song identity,
and applies one up/down vote to a supplied or new `VoteBucket`. The caller must
supply the bucket phase; if an existing bucket is supplied, its hour and phase
must match. The helper does not access a database, deduplicate events, update
K, or evaluate the chart. Ingestion must deduplicate before calling it.

The current `bora_engine_vote_events` draft does not retain `voter_ref`,
`identity_method`, `identity_version`, or `idempotency_key`. The application
contract preserves them, but a future durable ingestion implementation cannot
preserve the full event contract in that table without a separately approved
schema change. No migration is created or applied in this phase.

---

## 5. Consequences of switching between voting paths

Both systems increment the **same** `songs` aggregate columns, so the live
chart totals keep moving in either mode. The differences are what is *not*
recorded. **[SOURCE]**

**Secure ON after only legacy history (the realistic first cutover):**
- New votes become durable, attributable `vote_events` with idempotency and
  rate limiting.
- All prior history remains aggregate-only: it is reflected in the `songs`
  totals but has **no** corresponding event rows and **no** voter attribution.
- Result: `songs.upvotes` (legacy total) will be **greater than** the count of
  `vote_events` rows for that song, because pre-cutover votes were never
  logged as events. This divergence is **expected and permanent** unless a
  separately approved reconciliation is performed. **[SOURCE for the write
  paths; the divergence itself is a logical consequence]**

**Switching OFF after secure votes were recorded:**
- New votes revert to legacy aggregates.
- Existing `vote_events` rows are **not deleted** and are **not** updated; they
  simply stop growing. No new attribution is added by the legacy path.
- The mix of legacy and secure votes inside the aggregate counters becomes
  indistinguishable at the `songs` total level. **[SOURCE]**

**Switching repeatedly** compounds the divergence: each window uses whichever
path was active, and only the secure windows produce attributable events.
**[Logical consequence of the two write paths]**

---

## 6. Why disabling the flag is a routing rollback, not a data rollback

Turning `NEXT_PUBLIC_BORA_SECURE_VOTING` to anything other than the exact
string `"true"` changes **only which code path runs on the next frontend
build**. It is a traffic-routing control. **[SOURCE]**

Disabling it does **not**:

- delete rows from `vote_events`;
- reverse or adjust any `songs` counter or `momentum_score`;
- un-apply migrations `0010` / `0011`;
- remove `cast_vote_secure` or its grants;
- reconcile secure events back into the legacy aggregate history.

Therefore **rollback cannot undo accepted votes.** Any `vote_events` already
written and any counters already incremented remain as-is. Rollback restores
the legacy *behavior*, not the legacy *data state*. **[SOURCE]**

---

## 7. Historical aggregate counts versus attributable vote events

These are two fundamentally different kinds of data, and the difference cannot
be erased by code:

- **Historical aggregate counts** (what legacy produced): running totals in
  `songs.upvotes` / `songs.downvotes` / `songs.momentum_score`. They encode
  *how many* votes a song has, and nothing else. There is no record of *who*
  voted, *when*, *in what order*, or *with which idempotency key*.
- **Attributable vote events** (what the secure system produces): one durable
  row per accepted vote in `vote_events`, each carrying a server-verified
  `voter_ref`, a server timestamp, a validated `vote_type`, and an
  idempotency key.

The secure system's guarantees (no double-count, per-voter rate limiting,
per-voter audit) depend on **event rows and voter identity**. The legacy
aggregate history **does not contain** the information required to reconstruct
those. In particular: **[SOURCE + reasoning]**

- You **cannot** derive `voter_ref` from a legacy total — no voter was ever
  recorded.
- You **cannot** derive per-vote `created_at` from a legacy total — no per-event
  time was ever recorded.
- You **cannot** derive `idempotency_key` from a legacy total — none existed.

Consequently, aggregate-only history **cannot be converted into individual
voter events without fabricating the missing identity, time, and key fields**.
Any "merge" that produced event rows from aggregates would be inventing data.
This document explicitly does **not** claim such a merge is safe or lossless.
**[SOURCE + reasoning]**

## 8. Exact questions that must be resolved before a future cutover

These are open questions the current source cannot answer. None should be
assumed; each needs an explicit owner decision before secure voting is enabled
in any environment.

1. **Reconciliation intent.** Is `vote_events` intended to eventually become the
   authoritative vote record, with `songs` aggregates derived from it? Or are
   aggregates intended to remain the source of truth with `vote_events` as an
   audit append-log? The two systems write the *same* counters today, so the
   answer determines whether a future migration recomputes `songs` from
   `vote_events` or treats them as independent. **[UNKNOWN — decision]**
2. **Legacy history.** Should the pre-cutover aggregate totals be preserved as
   a baseline (frozen snapshot), reset, or carried forward? Because legacy votes
   carry no per-voter identity, they can only ever be represented as an opaque
   opening balance, never as events. **[UNKNOWN — decision]**
3. **Anonymous identity scope.** Should a guest's `voter_ref` survive across
   devices/browsers (requires a real account), or is per-browser-session
   identity acceptable? The current helper relies on the browser Supabase Auth
   session, so clearing storage creates a new identity. **[UNKNOWN — decision]**
4. **Rate-limit policy.** Is 60 votes per identity per hour the intended
   production limit, and is per-identity (not per-IP) enforcement acceptable
   given that a guest can mint multiple identities? **[UNKNOWN — decision]**
5. **Deployment of `0011`.** The advisory-lock race fix is written but not
   deployed. It must be applied to the target project before secure voting is
   enabled. **[VERIFIED not deployed to production]**
6. **Integration test evidence.** End-to-end behavior (anonymous sign-in → RPC
   → duplicate/accept) has not been exercised against a live project. This is a
   prerequisite gate, not optional. **[VERIFIED untested]**

## 9. Proposed future reconciliation strategy (PROPOSAL — not implemented)

> **This section is a design proposal for future consideration. It is NOT
> implemented behavior, and nothing here is currently active.**

A safe reconciliation, if ever approved, should follow these principles:

1. **Never fabricate history.** Do not synthesize `vote_events` rows from
   legacy aggregate totals. Aggregates lack voter identity, per-event time, and
   idempotency keys, so any such rows would be invented data.
2. **Record an explicit opening baseline.** At cutover, snapshot the current
   `songs.upvotes / downvotes / momentum_score` per song into a dedicated,
   auditable baseline (e.g. a dated row), rather than silently mixing legacy
   aggregates with new per-voter events.
3. **Pick one authoritative source going forward.** From the cutover hour
   onward, treat `vote_events` as the durable event record and either (a) keep
   the counter-bump in `cast_vote_secure` as-is, or (b) derive `songs`
   aggregates from `vote_events` via a recompute job — but never both
   independently, or counts will double.
4. **Attribute, don't merge.** Legacy votes remain an unattributable opening
   balance; new votes are attributable. Reconciliation is the act of clearly
   separating these two, not combining them into a false single history.
5. **Validate with a differential check.** Before any cutover, shadow-run both
   paths and compare resulting counters, so the owner can see the exact delta
   the change introduces.

## 10. Actions explicitly prohibited until a reconciliation strategy is approved

Until §8 (or an owner-approved alternative) is accepted, the following must not
be done:

1. Do **not** backfill or synthesize `vote_events` rows from legacy aggregate
   counters.
2. Do **not** reset or zero existing `songs.upvotes / downvotes / momentum_score`
   to "align" the two systems.
3. Do **not** enable `NEXT_PUBLIC_BORA_SECURE_VOTING` in any environment before
   migrations `0010` (if absent) and `0011` are applied and anonymous sign-in is
   verified.
4. Do **not** claim legacy and secure histories can be merged losslessly.
5. Do **not** treat the disabled flag as a data rollback of any votes already
   recorded in `vote_events`.
6. Do **not** introduce a second, competing counter write path alongside
   `cast_vote_secure` without a differential-consistency plan.

---

## Source basis

Every behavioral claim above is tagged:

- **[SOURCE]** — established directly from the migrations / helper / runbook.
- **[SOURCE + reasoning]** — derived from source facts plus explicit reasoning
  stated inline.
- **[VERIFIED …]** — confirmed state (e.g. `0011` not deployed; integration
  untested).
- **[UNKNOWN — decision]** — cannot be established from source; requires an
  owner decision and is intentionally not guessed.

No claim of production readiness, lossless merge, or end-to-end correctness is
made. See `docs/security/secure-voting-cutover.md` for the activation/rollback
runbook and `supabase/migrations/0010_hardened_guest_voting.sql` /
`0011_serialize_vote_rate_limit.sql` for the authoritative SQL.
