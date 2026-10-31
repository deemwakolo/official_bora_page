# BORA Engine Admin Room

## Current state

The Admin Engine Room at `/admin/engine` separates Data Entry from Engine
Operations. Data Entry is restricted to `BORA_ADMIN_USER_IDS`; Engine
Operations is separately restricted to `BORA_ENGINE_OPERATOR_USER_IDS`.
The server validates these permissions for reads and submissions. The service
role key is server-only.

Migration 0037 (`bora_engine_manual_platform_intake`) is applied to the
production Supabase project. It adds independent platform identity mappings,
append-only mapping and baseline/snapshot history, administrator attribution
on hourly evidence, and service-role-only submission RPCs. Applying the
migration did not insert evidence or change songs, votes, Engine state, hourly
runs, or publications. The application code changes remain in the local
worktree and are not deployed to Vercel.

## Data Entry

An authorized administrator can select one of the existing songs and manage
its YouTube, Spotify, or Boomplay identity separately. Mapping requires an
authorization attestation and records whether the authorized source can supply
exact, UTC-aligned hourly activity. That attestation configures source
readiness; it does not create evidence or coverage.

The form accepts actual platform baselines and reference snapshots into a
separate append-only history. These values never count as hourly coverage.
Hourly reports require one complete UTC-aligned hour, the Engine's fixed
platform metric and unit, a source evidence reference, and a mapping whose
hourly-evidence capability is confirmed. YouTube cumulative view counts cannot
be submitted as hourly views.

Submission history shows saved mappings, baselines, snapshots, and hourly
observations for the selected song/platform. Corrections must select the
current hourly evidence record and explicitly supersede it. Rejected attempts
are not persisted; the form displays the latest validation result in the
current session. Sensitive-looking source references are withheld in history.
Adding a song remains in the existing song-management workflow; the Engine
Room preserves the existing registry.

## Engine Operations and safety

Engine Operations reads readiness, platform coverage, recent evidence,
processing runs, state head, and publication history. Vote reconciliation is
an authorized operator action and respects the configured UTC cutover. Hourly
processing, bootstrap, and publication are not triggered by manual data entry.
Existing Engine eligibility and publication gates remain authoritative.

Missing, unavailable, invalidated, stale, and unresolved measurements are not
treated as zero. Each platform remains an independent measurement source.
Manual hourly submissions write append-only evidence and update the
corresponding observation and coverage projections atomically. They do not
reconstruct historical votes or synthesize platform measurements.

## Rollout and operation

The approved secure-vote cutover is `2026-11-01T21:00:00Z` (2026-11-02
00:00 EAT). Before that time, do not reconcile beyond the approved boundary or
advance Engine state. The local `.env.local` values do not configure Vercel.
Deploy the application changes and verify production admin/operator
allowlists, service-role key, cron secret, and cutover setting before making
the UI available in production. Hourly requests are scheduled by the GitHub
Actions workflow at `15` minutes past each UTC hour because the linked Vercel
Hobby plan does not support hourly Vercel Cron Jobs. Add the same server-only
`CRON_SECRET` as a GitHub Actions repository secret before relying on the
workflow; never commit or print its value.

After deployment, enter only source-authorized identities and real measured
values. Capture initial baselines when tracking begins, not from historical
chart positions. Do not initialize/advance the Engine or publish until
readiness confirms the complete real input history and publication eligibility.
