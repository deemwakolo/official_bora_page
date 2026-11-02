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
runs, or publications. The manual-intake application is deployed to Vercel.
The public-chart XP-share display is a separate application update and must be
deployed before it appears on the live chart.

Migration 0038 (`bora_engine_daily_platform_ranks`) is applied to production
as migration `20261102165147`. It adds immutable dated rank history and
database eligibility checks. Migration 0039 is a separate, forward-only local
change: it removes the remaining hourly-platform prerequisites from Engine
snapshots and adds the service-only publication input snapshot. Do not use the
publication action until 0039 is reviewed, applied, and the matching
application release is deployed.

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

## Daily platform positions

The separate Daily platform chart positions form is available to an authorized
administrator from 20:00 until midnight East Africa Time. Enter a positive
integer position for every registry song on YouTube, Spotify, and Boomplay;
position 1 is best and positions must be unique within each platform. Save a
source evidence reference for each platform and configure a source mapping for
every song/platform pair first. The effective snapshot date is the next EAT
calendar date.

Daily snapshots are append-only and attributed to the administrator. A second
submission for the same effective date requires explicitly selecting the
current snapshot as a correction; each correction creates a new revision.
Platform activity is `1 / position`, summed across the latest seven EAT-day
snapshots and normalized with the existing 30/15/5 YouTube/Spotify/Boomplay
weights. Daily platform positions do not block hourly processing: hourly
rollover depends on vote and seed history only. The YouTube API collector
remains available for separate YouTube data uses; API snapshots do not replace
the nightly rank-entry workflow.

## Engine Operations and safety

Engine Operations reads readiness, vote/seed coverage, recent evidence,
processing runs, state head, and publication history. Vote reconciliation and
daily-rank publication are separate authorized operator actions. Saving ranks
does not publish a chart. The publication action obtains an atomic database
snapshot, validates Engine state and daily-rank history, evaluates the chart,
then delegates the final readiness and state-revision checks to the atomic
publication transaction. It never bootstraps or advances Engine state, and
publication is never automatic. The action depends on migration 0039 and must
remain unused until that migration and its application release are deployed.

Missing, unavailable, invalidated, stale, and unresolved vote/seed evidence is
not treated as zero. Each platform remains an independent measurement source.
Manual hourly submissions write append-only evidence and update the
corresponding observation and coverage projections atomically. Daily ranks are
stored as immutable dated snapshots, with inverse-rank activity projected for
scoring. Neither workflow reconstructs historical votes.

## Published XP share

The public chart displays an XP share percentage only when an Engine
publication exists. The percentage is the published `xp` fraction multiplied
by 100 (`XP_i = C_i / T_C`); it is not the legacy momentum score or an
independently calculated browser value. Before the first eligible publication,
the chart retains its existing registry-based display and does not invent an
XP percentage.

## Rollout and operation

The approved secure-vote cutover is `2026-11-01T21:00:00Z` (2026-11-02
00:00 EAT). Before that time, do not reconcile beyond the approved boundary or
advance Engine state. The local `.env.local` values do not configure Vercel. Verify production
admin/operator allowlists, service-role key, and cutover setting. Hourly
requests are scheduled by the GitHub
Actions workflow at `15` minutes past each UTC hour because the linked Vercel
Hobby plan does not support hourly Vercel Cron Jobs. Add the same server-only
`CRON_SECRET` as a GitHub Actions repository secret before relying on the
workflow; never commit or print its value.

After deployment, enter only source-authorized identities and real measured
values. Capture initial baselines when tracking begins, not from historical
chart positions. Do not initialize/advance the Engine or publish until
readiness confirms the complete real input history and publication eligibility.
