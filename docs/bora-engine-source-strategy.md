# BORA Engine Cross-Platform Source Strategy

## Purpose and boundary

This document defines source eligibility and completeness requirements for a
future Engine evaluation. It does not activate collection, evaluation, hourly
processing, publication, or the live chart. Existing Engine scoring and
rollover behavior are unchanged.

The pure, shared contract is
[`lib/bora-engine/source-readiness.ts`](../lib/bora-engine/source-readiness.ts).
It separates:

1. **Platform-wide source readiness** — whether an authorized source can
   provide valid measurements of the required type.
2. **Per-song, per-hour coverage** — whether the source completed a particular
   interval for a particular song and can account for its result.
3. **Evaluation eligibility** — whether all required sources and input
   coverage for a song and evaluation hour are complete.

These are not interchangeable. An available provider does not imply complete
coverage for a song, and one complete song/hour does not establish that a
platform is generally usable.

## Source readiness states

Every platform assessment identifies the platform, required Engine metric and
unit, source identity (or `null` when no source identity is established), UTC
assessment timestamp, status, and a concise machine-readable reason. It must
not contain credentials, raw provider errors, or credential-bearing URLs.

| Status | Meaning |
| --- | --- |
| `available` | An authorized source can currently provide valid measurements for the required metric and unit. |
| `temporarily-unavailable` | An authorized source exists, but is operationally unavailable at assessment time. |
| `not-authorized` | Established permissions do not authorize using this source for the intended purpose. |
| `not-configured` | Required credentials, trusted mapping, or other required setup is absent. |
| `unsupported` | No suitable measurement interface for the required metric/unit is established. |
| `invalid-data` | The source returned measurements that fail validation or conflict. |
| `unknown` | The source state cannot be established. |

Only `available` satisfies source readiness. A change in configuration,
permission, or provider operation requires a new assessment; it must not be
inferred from previous successful data.

## Current platform assessments

These are current repository-backed assessments, not permanent platform
decisions:

| Platform | Required Engine measurement | Current status | Reason |
| --- | --- | --- | --- |
| YouTube | `video_views` / `views_per_hour` | `not-configured` | The YouTube Data API cumulative snapshot client exists, but there is no connected trusted server-side song/video mapping source, snapshot persistence, or defensible conversion to hourly activity. |
| Spotify | `track_streams` / `streams_per_hour` | `not-authorized` | Standard Spotify API-derived listenership metrics are not approved under the current permission assumptions; the feasibility review found the proposed ranking use prohibited absent applicable authorization or exception. |
| Boomplay | `track_streams` / `streams_per_hour` | `unsupported` | A suitable authorized track-level measurement interface and BORA mapping source have not been established. |

The Spotify assessment concerns the standard API-derived listenership metrics
reviewed in the feasibility report; it does not declare that every separately
authorized analytics or rights-holder source is permanently unusable. A
Boomplay distributor/rights-holder report is a lead only until its semantics
and BORA's use rights are established. YouTube cumulative counts remain
cumulative and must never be treated as hourly views without a defensible
measurement method.

## Coverage semantics

`PlatformHourCoverage` distinguishes the following outcomes:

| Coverage result | Meaning | Evaluation effect |
| --- | --- | --- |
| `complete` + `positive` | The authorized source completed the interval and returned a valid positive value. | Satisfies this platform/hour requirement. |
| `complete` + `zero` | The authorized source completed the interval and affirmatively measured zero. | Satisfies this platform/hour requirement; zero remains a real measured value. |
| `complete` + `no-observation` | The responsible source checked the full interval and verified there was no qualifying observation. | Satisfies coverage only as an explicitly verified empty interval. It is not a stored zero observation. |
| `incomplete` | The interval was not fully accounted for. | Not ready. |
| `unavailable` | The source could not complete the interval. | Not ready; never complete coverage. |
| `invalid` | A measurement is malformed or conflicting. | Not ready; reject the input rather than select or combine a plausible value. |
| `unauthorized` | This interval came from a source not authorized for the intended use. | Not ready; its measurement cannot contribute points. |
| no coverage record | Completion was not established. | Not ready; absence is not a measured zero. |

Complete platform coverage must identify the source that actually completed
the required interval. Its identity must match the currently available
platform assessment. Duplicate song/platform/hour records are conflicts, not
values to sum, average, or choose between. Coverage collection must record
explicit completion even for a verified empty interval.

Vote and seed coverage for the closed evaluation hour is also mandatory. A
complete vote/seed coverage record must identify its responsible source.
Bootstrap/history prerequisites remain separate and must still be met by the
existing readiness and bootstrap process.

## Deterministic evaluation eligibility

`assessSongEvaluationEligibility` and
`assessChartEvaluationEligibility` in the source-readiness module are pure
gates. Callers supply all clock and coverage inputs; the helper performs no
network, database, logging, or scoring operation.

For a closed UTC epoch-hour `H`, a song is eligible only when all of these
requirements hold:

1. Song identity and the explicit integer evaluation hour are valid.
2. A ready Engine state exists and its reference hour equals `H`.
3. Evaluation begins no earlier than `(H + 1) * HOUR_MS + TRANSITION_MS`, the
   same hour-close-plus-grace boundary used by `runHourlyRollover`.
4. YouTube, Spotify, and Boomplay each have exactly one valid platform source
   assessment, and each is `available` with an identified source.
5. That song has exactly one complete, source-matched coverage result for
   every platform/hour in the existing inclusive 168-hour window
   `H - 167` through `H`.
6. The closed hour has complete vote and seed coverage.
7. There are no missing, duplicate, invalid, unauthorized, unavailable, or
   mismatched inputs.

Chart eligibility is the conjunction of song eligibility for every active
song. A chart with no active songs is not ready. Any unmet requirement returns
`not-ready` with machine-readable requirement codes; it must not yield a
partial score presented as complete.

This gate does not change `getPlatformWindow`, `evaluatePlatformPoints`,
platform weights, or normalization. In particular, the Engine's current
per-platform normalization and no-weight-redistribution behavior remain
unchanged. Missing platforms must not be omitted to produce a partial chart,
nor may the remaining weights be silently renormalized.

The existing `evaluatePlatformPoints` implementation consumes supplied
observations and is intentionally unchanged. Its arithmetic makes absent
observations numerically equivalent to zeros under total-based normalization;
the eligibility gate therefore has to run before score evaluation and must be
fed the same persisted interval/source evidence used to assemble observations.
The eligibility module is not yet wired to an Engine chart-evaluation caller:
the repository has no activated chart evaluation/publication pipeline. A
future caller must gate the exact population and observations being scored,
then reject evaluation if eligibility is not `eligible`.

## Forbidden substitutions and measurement integrity

- Never translate missing, unavailable, unauthorized, invalid, or unknown
  coverage into a zero.
- Never include unauthorized or invalid observations in Engine inputs.
- Never infer activity from popularity, rank, follower count, or other
  indirect indicators.
- Never treat a cumulative snapshot as hourly activity by default. A
  difference between snapshots measures an interval change and does not by
  itself prove exact clock-hour activity.
- Do not silently discard one platform and redistribute its weight.
- Preserve the exact source metric, unit, source identity, interval, and
  correction/provenance chain.

## Existing readiness integration and remaining boundary

The internal server-only operator readiness result now includes the current
three platform source assessments. It reports overall `not-ready` when the
persisted readiness RPC says ready but any required source is not currently
available; database readiness fields and RPC behavior are unchanged.

This is status reporting, not collection or authorization discovery. The
assessments reflect the source and permission evidence documented here and
must be revised only when new verifiable evidence exists. The source gate
still needs to be connected to a future server-side evaluation coordinator
before any Engine score or publication can be produced.

## Persistence and activation

No migration is required for this phase. The contract is an in-memory
eligibility boundary and source assessment. Persisted interval results,
explicit complete-empty coverage, source identity, and audit/correction
history must use approved schema and server-only writers before activation.
All existing Engine migration drafts remain subject to the deployment
readiness checklist; this change does not apply or validate them.
