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
database eligibility checks. Migration 0039 is applied to production as
`20261103155121`; it removes the remaining
hourly-platform prerequisites from Engine snapshots and adds the service-only
publication input snapshot. Migration 0040 is applied to production as
`20261103171112`; it aligns bootstrap with that 72-hour vote/seed contract and
adds a one-time, service-role-only synthetic demo initializer.
Migration 0041 is applied as `20261104093544`, and migration 0042 is applied as
`20261104110410`. The latter removes the daily rank-entry time gate and permits
attributed replacement revisions only for dates whose latest rank snapshot is
still synthetic. It leaves all original synthetic rows unchanged. The updated
rank-entry UI is in the workspace and must be deployed to appear on Vercel.

The initializer has been run for all 30 registry songs, preserving the 21 real
recent vote events and adding no synthetic vote events. It added clearly tagged
synthetic seed and daily-rank inputs, then the Engine evaluated and published
the initial chart. The synthetic publication and its inputs remain in the
database for audit, but the public page hides its rankings. Until a verified
publication exists, the public chart can show provisional XP calculated from
captured accepted vote events alone; that view is not a full BORA rank chart.

## Engine Room workspace

The administrator Data Entry view has a Song Studio directory and a Premium
Performance desk. Both present songs in chart-style rows with artwork,
identity, and current-hour seed/vote indicators. Selecting a song opens its
focused performance and editing page, with metadata, Engine state and seed
history, and song-specific platform evidence. Returning from a song preserves
the selected directory category.

Daily platform ranks remain a separate roster-wide snapshot workflow because
the backend validates complete, unique positions for every song and platform
in one submission.

The current-hour seed display is read-only. Missing seed values remain blank,
and the stored source identity is shown only when its coverage is current.
Otherwise the row is marked unverified; the interface does not infer a seed
value or rewrite historical seed data.

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

Open a song from the Engine Room roster to enter that song's YouTube, Spotify,
and Boomplay positions for the next EAT date. These per-song values are editable
drafts; they are not verified, do not affect the Engine or public chart, and can
be updated until a snapshot exists for that date. The song's separate Platform
performance section remains the place to enter source identity, baseline, and
hourly measurement evidence.

The roster-wide Daily platform chart positions form is the review and
publication step. It loads saved Song Studio drafts, but requires a positive
integer position for every registry song on all three platforms; positions must
be unique within each platform. Provide a source evidence reference for each
platform and configure a source mapping for every song/platform pair before
submission. A new snapshot is effective on the next EAT calendar date.

Normal daily snapshots are append-only and attributed to the administrator. A
second submission for the same effective date requires explicitly selecting
the current snapshot as a correction; each correction creates a new revision.
Migration 0042 also allows an administrator to select a synthetic historical
date and replace it with source-verified ranks. Replacement creates an attributed
non-synthetic revision; the original synthetic snapshot and entries remain
unchanged in audit history. Historical dates cannot be submitted unless the
latest revision for that date is still synthetic, and evidence references remain
required for all three platforms. Migration 0042 is applied to the database;
deploy the updated application before the historical-replacement controls
appear on Vercel.
Platform activity is `1 / position`, summed across the latest seven EAT-day
snapshots and normalized with the existing 30/15/5 YouTube/Spotify/Boomplay
weights. Daily platform positions do not block hourly processing: hourly
rollover depends on vote and seed history only. The YouTube API collector
remains available for separate YouTube data uses; API snapshots do not replace
the attributed rank-entry workflow.

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
not treated as zero. A vote-event invalidation is cleared only by a newer,
current coverage assessment tied to the canonical vote ledger. Each platform
remains an independent measurement source.
Manual hourly submissions write append-only evidence and update the
corresponding observation and coverage projections atomically. Daily ranks are
stored as immutable dated snapshots, with inverse-rank activity projected for
scoring. Neither workflow reconstructs historical votes.

The one-time demo initializer is only for the explicitly authorized empty
production Engine. It requires no existing state, rollover, rank history, or
publication; retains reconciled canonical vote events; creates synthetic seed
history and seven days of synthetic ranks; and does not create fake
`vote_events`, source mappings, or administrator identities. Synthetic rank
rows and the public chart are marked as synthetic. Do not run it after normal
Engine operation has started.

## Public Engine XP

The public chart prefers an eligible, non-synthetic Engine publication. When
there is no such publication, it runs the same Engine evaluator against
captured accepted vote buckets in the current 72-hour window, while explicitly
excluding seed history and external platform-rank inputs. The resulting XP
share is `XP_i = C_i / T_C`; songs without captured accepted votes show no
percentage rather than a fabricated zero. Rows are ordered by XP for this
provisional view; that order is not the final BORA rank. This fallback does not
publish Engine state or advance the hourly head. It is not a publication-ready
chart: complete, evidence-backed seed and daily-rank inputs are still required
for the full production publication workflow.

If the live evaluation is unavailable, the chart retains the registry vote
share as a clearly labeled baseline. That value is not Engine XP and is not
used by the Engine evaluator.

## Rollout and operation

The approved secure-vote cutover is `2026-11-01T21:00:00Z` (2026-11-02
00:00 EAT). Before that time, do not reconcile beyond the approved boundary or
advance Engine state. The local `.env.local` values do not configure Vercel. Verify production
admin/operator allowlists, service-role key, and cutover setting. Hourly
requests are scheduled by the GitHub
Actions workflow every 15 minutes because the linked Vercel Hobby plan does
not support hourly Vercel Cron Jobs. The workflow reconciles accepted vote
delivery before asking the worker to attest vote/seed coverage from canonical
sources and advance the persisted state. The worker processes up to four
consecutive closed hours per invocation and never skips a state hour. Add the
same server-only `CRON_SECRET` as a GitHub Actions repository secret before
relying on the workflow; never commit or print its value. Only completed
processing or an explicit bounded catch-up response is accepted as success;
readiness deferrals and state-hour mismatches fail the workflow.

After deployment, enter only source-authorized identities and real measured
values. Capture initial baselines when tracking begins, not from historical
chart positions. For normal operation, initialize/advance the Engine or
publish only after readiness confirms complete input history and publication
eligibility. Synthetic starting data is the explicitly authorized exception
for this empty production state; replace it with measured inputs as they become
available.
