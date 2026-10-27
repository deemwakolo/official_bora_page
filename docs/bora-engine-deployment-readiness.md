# BORA Engine Deployment Readiness

This inventory describes repository source only. It does not establish the
state of any deployed environment or database. No deployment gate below is
considered complete without independent operational evidence.

## 1. Database migrations

The repository contains migration files `0012` through `0021`. The verified
live Supabase migration history records migrations `0012`–`0017` as applied.
Migrations `0018`–`0021` are present in the repository source as forward-only
additive migrations but may require independent deployment verification. This
confirms their recorded migration status in the inspected project; it does not
establish that the BORA Engine is initialized, that all historical input data
is present, or that the hourly evaluation and publication workflows are
operational. The migration definitions remain available in the repository for
source review.

| Migration | Purpose and dependency |
| --- | --- |
| `0012_bora_engine_data_foundation.sql` | Defines private Engine song state, canonical vote events and hourly vote buckets, platform-hour projections, seed-hour records, per-input coverage, hourly run/closure history, evaluation-run history, and publication snapshots/head. Uses the established UUID identity `public.songs.id`; it does not redefine `songs`, alter existing vote paths, or provide a trusted worker/RPC. |
| `0013_bora_engine_platform_observation_history.sql` | Adds append-only platform observation history, source identity, provenance, and correction chains while leaving the one-per-hour projection in place. Depends on the projection and base Engine foundation from `0012`. |
| `0014_bora_engine_hourly_atomic_operations.sql` | Adds the state head and service-role-only snapshot, claim, load, release, and atomic commit functions. It enforces database-time eligibility and lease checks, state/coverage comparison, rollover trace persistence, and completed-hour recording. Depends on `0012` and `0013`; it intentionally does not initialize the state head. |
| `0015_bora_engine_state_bootstrap.sql` | Adds an approval record and service-role-only bootstrap/check functions. Bootstrap requires explicit initial state and coverage matching persisted rows, refuses an existing state head, and refuses incomplete required history. Depends on `0012`–`0014`. |
| `0016_bora_engine_readiness.sql` | Adds a read-only, service-role-only readiness RPC for bootstrap state and vote, seed, and per-platform coverage/record counts, including explicit zero records. Depends on `0012`–`0015`. |
| `0017_bora_engine_youtube_snapshot_history.sql` | Defines append-only cumulative YouTube view-count snapshots, distinct from hourly observations, with stable source identity, retry deduplication, revision/invalidation links, and server-only table access. Depends on `0012` for the song foreign key. |
| `0018_bora_engine_durable_ingestion_validation.sql` | Adds the immutable vote-event invalidation ledger (`bora_engine_vote_event_invalidations`) with append-only trigger enforcement, and the atomic `bora_engine_ingest_vote_event` RPC which is the sole authority for secure-vote identity claim and bucket counting. Depends on `0012`–`0017`. |
| `0019_bora_engine_full_window_readiness.sql` | Replaces `bora_engine_readiness` with a full-window predicate enforcing 648 satisfied slots per active song across the 72-hour + 168-hour required intervals, plus vote/seed coverage assessment for the complete window. Depends on `0012`–`0018`. |
| `0020_bora_engine_bootstrap_full_window.sql` | Replaces `bora_engine_check_hour` to enforce full-window completeness (648 slots) during bootstrap eligibility, correcting the prior 506-slot expectation. Depends on `0012`–`0019`. |
| `0021_bora_engine_publish_eligibility.sql` | Adds the service-role-only publication-readiness RPC `bora_engine_publish_eligibility(p_closed_hour)`, which delegates to `bora_engine_readiness` for the 648-slot full-window predicate, enforces reference-hour match, and rejects publication if any invalidated vote events fall within the 72-hour preceding window. Depends on `0012`–`0020`. |

## 2. Private configuration

Configure these values only in the deployment platform's protected server-side
configuration. **Never expose them to browser code, responses, logs, or commit
them to environment files.** This document intentionally contains no values,
credentials, or user IDs.

| Variable | Purpose |
| --- | --- |
| `BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY` | Private credential used by `lib/bora-engine/persistence.ts` for privileged Engine RPCs. It must remain server-only and must never be included in a client bundle. |
| `BORA_ENGINE_OPERATOR_USER_IDS` | Server-only comma-separated allowlist of explicitly approved Supabase user IDs. `lib/bora-engine/operator-authorization.ts` matches the verified `auth.getUser()` identity against this list. Missing or malformed configuration fails closed. |
| `BORA_ADMIN_USER_IDS` | Server-only comma-separated allowlist of Supabase user UUIDs authorized as **site administrators**. `lib/administrator-authorization.ts` matches the verified `auth.getUser()` identity against this list. This is a **distinct scope** from `BORA_ENGINE_OPERATOR_USER_IDS` (Engine operators and site administrators are not automatically equated) and must contain the same administrator identities that carry the database `app_metadata.role = 'bora_administrator'` claim (see section 6). Missing or malformed configuration fails closed. |
| `BORA_YOUTUBE_API_KEY` | Private key used by the server-only YouTube Data API v3 client. It is required for provider requests and must never be exposed to browser code, responses, or logs. |
| `NEXT_PUBLIC_SUPABASE_URL` | Existing Supabase project URL used to construct both the trusted Engine client and the existing authenticated server client. It is public configuration, not a credential. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Existing publishable/anon credential used by the cookie-backed Supabase auth client to verify the current operator session. It is not the privileged Engine credential. |

The service-role credential and operator allowlist are distinct: the former
authorizes the persistence adapter's restricted RPC calls; the latter controls
who may request readiness through the internal operator boundary.

## 3. Historical data prerequisites

Before bootstrap, prepare and reconcile explicit persisted history for every
Engine song that is active at the reference hour:

- A complete, operator-approved initial Engine state and its reference hour.
  Do not derive it from public chart ranks, `momentum_score`, `slot_number`,
  `previous_rank`, or aggregate vote counters.
- Vote event history and explicit hourly vote coverage. Existing legacy
  aggregate counters cannot reconstruct trustworthy historical vote events.
  The draft foundation notes that the default legacy vote path does not write
  the secure vote-event source.
- Seed-hour records and explicit seed coverage. Seed rows and coverage are
  distinct; a missing seed is not a zero seed.
- YouTube coverage for every active song across the inclusive 168-hour window
  ending at the requested closed/reference hour.
- Spotify coverage for every active song across the same 168-hour window.
- Boomplay coverage for every active song across the same 168-hour window.

For a rollover hour, the runner additionally requires vote and seed coverage
for that closed hour. The platform window is the closed hour and preceding 167
hours. `COMPLETE` coverage with no value row represents a checked, empty
period; an explicit numeric zero requires an actual zero-valued record.
Missing, `UNAVAILABLE`, and `FAILED` inputs are not zero and cannot satisfy
readiness. Do not manufacture events, seeds, observations, or missed-hour
coverage.

## 4. Operational prerequisites

| Capability | Source status | Deployment/operational status |
| --- | --- | --- |
| Trusted operator authorization | Implemented in `operator-authorization.ts`: verifies the user with the server Supabase client and checks the private ID allowlist. `operator-readiness.ts` only calls readiness after `authorized`. | Not established until `BORA_ENGINE_OPERATOR_USER_IDS` is provisioned with approved IDs and the normal authenticated server client works. No route, action, or UI exposes this entry point. |
| Readiness RPC | Defined in migration `0016`, restricted to `service_role`. Recorded as applied in the verified live Supabase migration history. | Not operationally verified until private persistence configuration exists, grants/RLS are confirmed, and the RPC is successfully invoked through an authorized operator boundary. |
| Bootstrap and state-head initialization | Bootstrap validation/RPC call exists in `persistence.ts`; SQL proposal is in `0015`, with the state head defined by `0014`. It requires explicit approval metadata, matching persisted state/coverage, and an uninitialized head. | Not initialized or operationally verified. No automatic default state is created. |
| Hourly claim, lease, and atomic commit | `hourly-runner.ts` and the service-role adapter in `persistence.ts` call the proposed `0014` atomic operations. The runner uses the existing Engine rollover logic. | Not operational until migrations are applied, trusted configuration is provisioned, reconciled state/history exist, and database behavior is verified. The adapter is not evidence that the SQL has been deployed. |
| Hourly invocation | `hour-entry.ts` validates one explicit closed hour and invokes the runner. | No controlled operator/worker invocation mechanism is registered. The function is internal only: there is no public route, server action, UI handler, or scheduler. |
| Platform source readiness and evaluation eligibility | `source-readiness.ts` defines source states, interval coverage outcomes, and a deterministic gate using the existing 168-hour window and rollover grace period. `publication-gate.ts` adds pure publication eligibility validation but is unwired. The internal operator readiness result includes current platform assessments. | No source currently has an established `available` assessment for the Engine's required hourly measurements; no chart evaluation caller invokes the eligibility gate. No activated collector or connected trusted server-side song-to-video mapping source exists. |
| Platform collectors/provider credentials | Pure observation validation exists; a server-only YouTube Data API client and cumulative snapshot/derivation contracts are implemented. | No activated collector or connected trusted server-side song-to-video mapping source exists. YouTube API key configuration remains outstanding. No Spotify or Boomplay collectors or credentials are established. |
| Chart publication integration | Migration `0012` defines evaluation/publication tables and a publication head. `publication-gate.ts` and `publication-transaction.ts` define pure, unwired validation/request/retry contracts. Engine evaluation code exists separately. No publication RPC or transaction is defined. | No connected publication workflow moves an Engine result to the public chart. Durable idempotency, publication-slot concurrency control, source-snapshot recheck, atomic entry/header/pointer/completion commit, and request-ID reconciliation require a future privileged database operation and migration. Public charting remains on its existing behavior. |

The application persistence adapter reads `NEXT_PUBLIC_SUPABASE_URL` and
`BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY`; the operator helper reads
`BORA_ENGINE_OPERATOR_USER_IDS`. The existing cookie-auth client uses
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

The repository's `vercel.json` has Git deployments disabled and contains no
cron configuration. This is source configuration only; it does not prove the
status of any external deployment platform or provide an hourly worker.

### YouTube-specific source status

Server-only source code now calls the official YouTube Data API v3
`videos.list` endpoint with `part=statistics` for an explicitly supplied video
ID. It returns cumulative `viewCount` snapshots without converting them to
hourly activity. The API's `videos.list` request costs one quota unit; any
future collector needs an intentionally controlled cadence and quota budget,
not a tight polling loop.

The repository has an Operations `youtube_id` field, but its existing reader is
a client component. No trusted server-side song-to-video mapping loader is
connected to the collector, so that client-supplied value must not be passed as
trusted mapping. No provider request or snapshot persistence is activated.

Two cumulative snapshots can yield a numeric interval delta only when counts
are nondecreasing and both retrieval timestamps are exactly one UTC hour apart
at hour boundaries. Such a pair is reported as a candidate, not an Engine
observation: the second snapshot is at the exclusive period end, while the
current Engine observation contract requires `observedAt` inside the measured
hour. YouTube count-update delays, later adjustments, and API counter behavior
also mean a delta may not equal the exact views that occurred during that
clock hour. Keep the snapshots as evidence; do not coerce a candidate into
`views_per_hour`.

### Cross-platform source and eligibility status

`lib/bora-engine/source-readiness.ts` defines platform-level source states
separately from per-song/hour coverage and evaluation eligibility. Current
assessments are YouTube `not-configured` for the required hourly metric,
Spotify `not-authorized` for standard API-derived listenership metrics under
the current permission assumptions, and Boomplay `unsupported` because no
suitable authorized track-level interface is established. These statuses
describe the evidence currently in the repository, not permanent platform
decisions.

The eligibility contract requires a ready Engine state whose reference hour
matches the closed hour, all three platform sources to be available, complete
source-matched coverage for each active song across the inclusive 168-hour
window, and complete vote and seed coverage for the closed hour after the
existing rollover grace period. Verified zero and verified empty intervals
are distinct; missing or unavailable data cannot be treated as zero or complete.
This gate is not yet connected to an Engine chart-evaluation caller, so it does
not activate processing or change scoring. See
[`bora-engine-source-strategy.md`](./bora-engine-source-strategy.md) for the
full contract and integration boundary.

## 5. Safe activation sequence

All gates are **pending** based on repository evidence:

1. [ ] **Review and confirm applied migration history.** Review migrations `0012`–`0017` in
   dependency order, including assumptions about the existing `songs` table,
   permissions, function behavior, and rollback/recovery. Confirm the applied migration status in the target environment using an approved read-only inspection. Do not reapply migrations already recorded as applied.
2. [ ] **Configure private credentials and operator allowlist.** Provision the
   service-role key and explicitly approved operator IDs in protected
   deployment configuration. Confirm they are server-only; do not commit or
   expose them.
3. [ ] **Establish trustworthy bootstrap evidence.** Assemble the explicit
   initial Engine state/reference hour and required reconciled history and
   coverage. Obtain operator approval; do not infer or fabricate missing data.
4. [ ] **Confirm migration availability.** Verify that migrations `0012`–`0017` are recorded as applied in the target environment through an approved read-only inspection of the migration history. Do not reapply migrations already recorded as applied.
5. [ ] **Inspect readiness as an authorized operator.** After configuration and
   migration availability, call the internal readiness boundary only through
   an approved trusted invocation. Confirm bootstrap, vote/seed coverage, and
   each platform's source authorization/readiness and 168-hour coverage;
   resolve all missing, failed, invalid, unauthorized, or unavailable inputs.
6. [ ] **Establish controlled hourly invocation.** Design, authorize, and
   verify a private worker/operator invocation with explicit UTC target-hour
   identity, retry handling, and monitoring. No scheduler or invocation path
   is currently configured by this repository.
7. [ ] **Verify a complete hourly run and publication.** Validate the atomic
   claim/lease/commit lifecycle and persisted result in the deployed
   environment. Separately implement and verify chart evaluation/publication
   and its intended public read path before considering any public chart
   integration.

Do not activate the public chart integration until all preceding gates have
evidence and the Engine output/publication contract has been reviewed.

## 6. Administrator authorization contract (site-admin writes)

Phase 2 introduced an explicit administrator authorization policy for
privileged application writes. This section documents that contract from
repository source. It is **documentation only**; it is not authorization to
execute any step, and it does not establish any deployed state.

### 6.1 Protected write surfaces

The following server actions require administrator authorization before they
touch the database. `getRegistry()` is intentionally a **public read** and is
not gated.

| Server action | File | Privileged write |
| --- | --- | --- |
| `updateSlot` | `lib/admin-actions.ts` | Administrative upsert on `public.songs` |
| `saveMomentChartEdition` | `lib/moment-charts-actions.ts` | RPC `save_moment_chart_edition` |
| `saveNewsHubItem` | `lib/news-hub-actions.ts` | RPC `save_news_hub_item` |
| `saveTrendingPlatform` | `lib/trending-actions.ts` | RPC `save_trending_platform` |
| `saveUIConfig` | `lib/ui-config-actions.ts` | RPC `save_ui_room_config` |

### 6.2 Two required, independent authorization sources

Administrator access requires **both** of the following. They are independent
sources and must contain matching administrator identities:

1. **Server-only allowlist — `BORA_ADMIN_USER_IDS`.**
   `lib/administrator-authorization.ts` (`authorizeBoraAdministrator`) verifies
   the session with `supabase.auth.getUser()` and matches the verified user id
   against the comma-separated UUID allowlist in this server-only environment
   variable (no `NEXT_PUBLIC_` prefix, so it is never shipped to the browser).
   The pure decision lives in `lib/administrator-allowlist.ts`.

2. **Trusted database role claim — `app_metadata.role = 'bora_administrator'`.**
   Migration `0018_bora_engine_administrator_authorization.sql` adds
   `public.bora_author_is_administrator()`, which reads the caller's verified
   JWT (`auth.jwt() -> 'app_metadata' ->> 'role'`). The four privileged RPCs
   call it and raise `SQLSTATE 42501` (`BORA_ADMIN_REQUIRED`) for
   non-administrators. `app_metadata` is server-controlled and is **not**
   editable by a user through ordinary client APIs (unlike `user_metadata`,
   which the helper does not read).

`BORA_ADMIN_USER_IDS` is **not** the same as `BORA_ENGINE_OPERATOR_USER_IDS`.
Engine operator access (`lib/bora-engine/operator-authorization.ts`) and site
administrator access are separate scopes and are not automatically equated.

### 6.3 Fail-closed behavior

Expected outcomes, from source:

- Missing or malformed `BORA_ADMIN_USER_IDS`: server authorization returns
  `authorization-unavailable` and the write is denied (fail closed).
- Authenticated user absent from the allowlist: `forbidden`, denied.
- No verified session: `unauthenticated`, denied.
- Missing or incorrect `app_metadata.role` claim: the privileged RPC raises
  `BORA_ADMIN_REQUIRED` and is denied.
- Mismatched identity configuration (present in one source but not the other):
  the operation may be denied by one of the two layers even if the other layer
  would allow it.
- A **removed** role claim may remain effective in already-issued JWTs until
  those tokens are refreshed or expire.

`scripts/verify-bora-administrator-authorization.mjs` exercises the pure
decision core (allowlist parsing and the authorization decision) with **no
database access**. Those checks prove the decision logic only; they do **not**
prove deployed database grants, RLS, or JWT claim contents.

### 6.4 Safe deployment sequence (documentation, not authorization)

1. Identify the approved administrator identities through the project's
   authorized administrative process.
2. Read-only inspect the target project's migration history and prerequisite
   functions; confirm the prerequisites for migration `0018` (tables and the
   original functions from `0002`–`0008`) are present.
3. Confirm the target project's issued JWTs expose the expected `app_metadata`
   claim. Do not modify user accounts to perform this check.
4. Establish an approved, secure procedure to provision matching identities in
   both authorization sources.
5. Configure the server-only `BORA_ADMIN_USER_IDS` variable through the
   approved secret-management workflow.
6. Review and approve migration `0018` separately.
7. Apply the migration only through the approved database change workflow.
8. Run the authorization integration harness
   (`scripts/verify-bora-administrator-authorization.mjs`, live section) against
   an isolated, non-production Supabase project.
9. Confirm ordinary authenticated users are denied, an authorized administrator
   succeeds, and existing public reads remain functional before considering
   production rollout.

These steps document intent only. They are **not** authorization to execute any
of them.

### 6.5 Unresolved risk: direct `songs` writes

The deployed `public.songs` table's grants and RLS policies remain
**unverified** from repository source (no tracked migration defines the `songs`
table). The `updateSlot` server-action gate protects only that server action;
it does **not** protect direct browser writes to `songs` performed by the
legacy voting path in `app/components/ChartWrapper.tsx`. If `songs` has a
permissive `UPDATE` policy for `authenticated`/`anon`, an ordinary user may
still write `songs` directly. This requires a read-only inspection of the
deployed `songs` policies and, if needed, a separate approved change. This
phase does not change the legacy voting implementation and does not enable
secure voting.
