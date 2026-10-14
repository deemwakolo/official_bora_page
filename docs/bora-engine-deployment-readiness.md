# BORA Engine Deployment Readiness

This inventory describes repository source only. It does not establish the
state of any deployed environment or database. No deployment gate below is
considered complete without independent operational evidence.

## 1. Database migrations

The repository contains migration files `0012` through `0017`. Each is an
**unapplied draft** in this repository; no reliable evidence of application is
present here. Review and approve the SQL and its dependencies before using an
approved migration workflow.

| Migration | Purpose and dependency |
| --- | --- |
| `0012_bora_engine_data_foundation.sql` | Proposes private Engine song state, canonical vote events and hourly vote buckets, platform-hour projections, seed-hour records, per-input coverage, hourly run/closure history, evaluation-run history, and publication snapshots/head. Uses the established UUID identity `public.songs.id`; it does not redefine `songs`, alter existing vote paths, or provide a trusted worker/RPC. |
| `0013_bora_engine_platform_observation_history.sql` | Adds append-only platform observation history, source identity, provenance, and correction chains while leaving the one-per-hour projection in place. Depends on the projection and base Engine foundation from `0012`. |
| `0014_bora_engine_hourly_atomic_operations.sql` | Adds the state head and service-role-only snapshot, claim, load, release, and atomic commit functions. It enforces database-time eligibility and lease checks, state/coverage comparison, rollover trace persistence, and completed-hour recording. Depends on `0012` and `0013`; it intentionally does not initialize the state head. |
| `0015_bora_engine_state_bootstrap.sql` | Adds an approval record and service-role-only bootstrap/check functions. Bootstrap requires explicit initial state and coverage matching persisted rows, refuses an existing state head, and refuses incomplete required history. Depends on `0012`–`0014`. |
| `0016_bora_engine_readiness.sql` | Adds a read-only, service-role-only readiness RPC for bootstrap state and vote, seed, and per-platform coverage/record counts, including explicit zero records. Depends on `0012`–`0015`. |
| `0017_bora_engine_youtube_snapshot_history.sql` | Proposes append-only cumulative YouTube view-count snapshots, distinct from hourly observations, with stable source identity, retry deduplication, revision/invalidation links, and server-only table access. Depends on `0012` for the song foreign key. This is also an **unapplied draft**. |

## 2. Private configuration

Configure these values only in the deployment platform's protected server-side
configuration. **Never expose them to browser code, responses, logs, or commit
them to environment files.** This document intentionally contains no values,
credentials, or user IDs.

| Variable | Purpose |
| --- | --- |
| `BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY` | Private credential used by `lib/bora-engine/persistence.ts` for privileged Engine RPCs. It must remain server-only and must never be included in a client bundle. |
| `BORA_ENGINE_OPERATOR_USER_IDS` | Server-only comma-separated allowlist of explicitly approved Supabase user IDs. `lib/bora-engine/operator-authorization.ts` matches the verified `auth.getUser()` identity against this list. Missing or malformed configuration fails closed. |
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
| Readiness RPC | Proposed in migration `0016`, restricted to `service_role`. | Unavailable until `0016` and dependencies are reviewed and applied, private persistence configuration exists, and the RPC is callable. |
| Bootstrap and state-head initialization | Bootstrap validation/RPC call exists in `persistence.ts`; SQL proposal is in `0015`, with the state head defined by `0014`. It requires explicit approval metadata, matching persisted state/coverage, and an uninitialized head. | Not initialized or operationally verified. No automatic default state is created. |
| Hourly claim, lease, and atomic commit | `hourly-runner.ts` and the service-role adapter in `persistence.ts` call the proposed `0014` atomic operations. The runner uses the existing Engine rollover logic. | Not operational until migrations are applied, trusted configuration is provisioned, reconciled state/history exist, and database behavior is verified. The adapter is not evidence that the SQL has been deployed. |
| Hourly invocation | `hour-entry.ts` validates one explicit closed hour and invokes the runner. | No controlled operator/worker invocation mechanism is registered. The function is internal only: there is no public route, server action, UI handler, or scheduler. |
| Platform source readiness and evaluation eligibility | `source-readiness.ts` defines source states, interval coverage outcomes, and a deterministic gate using the existing 168-hour window and rollover grace period. `publication-gate.ts` adds pure publication eligibility validation but is unwired. The internal operator readiness result includes current platform assessments. | No source currently has an established `available` assessment for the Engine's required hourly measurements; no chart evaluation caller invokes the eligibility gate. No activated collector or connected trusted server-side song-to-video mapping source exists. |
| Platform collectors/provider credentials | Pure observation validation exists; a server-only YouTube Data API client and cumulative snapshot/derivation contracts are implemented. | No activated collector or connected trusted server-side song-to-video mapping source exists. YouTube API key configuration remains outstanding. No Spotify or Boomplay collectors or credentials are established. |
| Chart publication integration | Migration `0012` proposes evaluation/publication tables and a publication head. `publication-gate.ts` and `publication-transaction.ts` define pure, unwired validation/request/retry contracts. Engine evaluation code exists separately. No publication RPC or transaction is defined. | No connected publication workflow moves an Engine result to the public chart. Durable idempotency, publication-slot concurrency control, source-snapshot recheck, atomic entry/header/pointer/completion commit, and request-ID reconciliation require a future privileged database operation and migration. Public charting remains on its existing behavior. |

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

1. [ ] **Review and approve SQL drafts.** Review migrations `0012`–`0017` in
   dependency order, including assumptions about the existing `songs` table,
   permissions, function behavior, and rollback/recovery. Apply only through
   the approved database change workflow.
2. [ ] **Configure private credentials and operator allowlist.** Provision the
   service-role key and explicitly approved operator IDs in protected
   deployment configuration. Confirm they are server-only; do not commit or
   expose them.
3. [ ] **Establish trustworthy bootstrap evidence.** Assemble the explicit
   initial Engine state/reference hour and required reconciled history and
   coverage. Obtain operator approval; do not infer or fabricate missing data.
4. [ ] **Apply migrations through the approved workflow.** Apply dependencies
   in order and record the resulting migration status using the approved
   operational process. The repository drafts alone do not establish that
   they have been applied.
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
