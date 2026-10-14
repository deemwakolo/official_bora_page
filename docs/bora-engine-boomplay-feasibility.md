# BORA Engine Boomplay Measurement Feasibility

## Executive decision

**No-go for a Boomplay collector or Engine integration at this time.** The
official public Boomplay resources inspected do not establish a public
developer API or a generally available, authorized track-level measurement
interface with hourly coverage and chart-reuse rights. Boomplay's artist-center
page suggests that some artists receive reports, but does not document their
data fields, granularity, historical depth, delivery mechanism, or external
reuse permissions.

A distributor's private sales reports may be a technically plausible source
for an artist or label that controls the account. TuneCore documentation
describes sales reports with store, song, sales-period, sales-type, and unit
fields, but no BORA account access, rights, or Boomplay-specific hourly
granularity has been established. This is a lead to investigate with the
relevant rights holders and distributor, not an available BORA source.

Do not scrape Boomplay's public site or infer listening counts from public
visibility, rankings, popularity, or other indirect signals.

## 1. Official Boomplay sources consulted

- [Boomplay for Artists](https://www.boomplay.com/artist-center) — official
  artist-facing page with artist testimonials. One testimonial mentions
  receiving a report; it does not define the report's contents, intervals,
  access process, or permissions for third-party chart use.
- [Boomplay Privacy Policy](https://www.boomplay.com/privacy-policy) — identifies
  Boomplay as provided or controlled by Transsnet Music Limited and describes
  personal information handled for Boomplay services. It does not document a
  public API or authorize extracting or republishing public engagement data.
- [Boomplay public site](https://www.boomplay.com/) — could not be retrieved by
  the read-only research fetch (HTTP 403); no conclusion about its full content
  is drawn from that failure.
- Candidate official developer, artist, and terms paths
  (`/developer`, `/artist`, `/terms`, `/terms-of-service`, and
  `/terms-and-conditions`) were not available at the requested paths during
  this inspection. This is not proof that no private partner documentation or
  other official terms exist.

No official, publicly accessible Boomplay developer API documentation was
located in the sources retrievable during this research. This is a search
result, not proof that a private partner interface does not exist.

## 2. Verified technical capabilities and limitations

| Question | Finding |
| --- | --- |
| Public API or partner interface? | No public API specification or authorized partner interface was established from the official resources retrieved. Private/partner-only interfaces remain unknown. |
| Track-level counts outside an individual user account? | No generally available API or report specification was found that proves such counts are available to BORA. The artist-center testimonial indicates an artist received a report, but does not specify whether it contains play counts or per-track metrics. |
| Measurement interval and semantics? | Not established for Boomplay's direct artist reporting. No verified hourly or daily Boomplay measurement contract was found. |
| Historical measurements? | Not established for Boomplay. |
| Rate limits, access requirements, regions, commercial terms? | No public developer documentation was available to verify these. Account-specific, partner, geographic, or commercial restrictions must be confirmed directly with Boomplay and the source provider. |
| Comparative chart use? | No permission for BORA's chart-ranking and publication use was established. API or report access alone would not prove that this use is allowed. Obtain written terms/permission for the specific use. |

### Distributor reporting lead (not Boomplay API documentation)

[TuneCore: Finding and Understanding My Sales Reports](https://support.tunecore.com/hc/en-us/articles/115006684868-Finding-and-Understanding-My-Sales-Reports)
describes artist-account reports filterable by release/song, sales date range,
territory, and store. Its monthly report fields include sales period, posted
date, store, song title, sales type (`Download` or `Stream`), and units sold as
reported by the store; the documentation describes units in a reporting day.
This indicates a potential authorized path for a TuneCore account holder to
obtain store-reported track units, possibly including Boomplay, but it does not
establish:

- that every Boomplay report has true plays/streams rather than another
  distributor accounting unit;
- exact hourly counts or availability of each reporting day's data;
- that BORA has rights to any artist's report or may aggregate it across
  artists;
- permission to calculate and publish comparative rankings; or
- API or automated export access suitable for a server-side collector.

The distributor's sales period and report posting date are not interchangeable
with an observation timestamp. Reports may arrive after the measured period;
late arrival, corrections, territory scope, and source coverage would need to
be retained explicitly.

## 3. Policy and authorization assessment

No Boomplay terms or developer policy accessible from the official pages
retrieved could be used to confirm permission for an independent public chart
to aggregate platform measurements. The privacy policy is not a data license
or developer-use authorization.

Therefore, whether BORA may use and publish comparative chart rankings from
Boomplay measurements is **unresolved**. It is not established as permitted.
Before implementation, obtain written confirmation from Boomplay or an
authorized reporting provider that:

1. the source may provide BORA the exact track-level measurement;
2. the measurement may be retained and used to derive comparative rankings;
3. the derived ranking and attribution may be published publicly;
4. the intended artist/label population and territories are covered; and
5. corrections, historical access, and any redistribution limits are clear.

An artist, label, distributor, or rights-holder may be able to authorize data
for works they control. That does not automatically authorize all-catalog
coverage, other rights holders' data, or publication by BORA.

## 4. Required measurement contract

If an authorized source is established, each accepted input should include:

- Stable BORA song ID and an explicitly verified Boomplay track ID; no
  title-only matching.
- `platform: boomplay`.
- The source's exact metric and unit. Use `track_streams` and
  `streams_per_hour` only when the source expressly reports stream counts for
  that exact interval. Preserve a cumulative total or distributor accounting
  unit as its own distinct metric/unit; do not relabel it as hourly streams.
- Source/provider identity, account/report identity where appropriate, stable
  source-record ID, and provenance suitable for audit.
- Exact UTC observation time or measurement interval, including timezone,
  period start/end, report sales period, posted time, and whether the result
  is estimated, delayed, finalized, or revised.
- Explicit per-song/per-hour coverage status. Distinguish complete coverage
  with no activity from missing, unavailable, and failed collection. Preserve
  a measured zero as a record; never turn unavailable data into zero.
- Stable retry identity and append-only correction/revision linkage.
- Authorization/territory scope and retention/publication basis in operational
  metadata or associated governance records.

This matches the principles of BORA's current platform-observation and
coverage boundaries. It does not make an unverified source or incompatible
metric suitable for the Engine's 168-hour window.

## 5. Implementation decision and remaining dependencies

No Boomplay collector, provider client, or new typed unavailable boundary was
added. The existing generic `PlatformCollectionResult` already represents
`observed`, `missing`, `unavailable`, and `failed` outcomes. Adding a
Boomplay-specific unavailable adapter without an established provider or
trusted track-ID source would not improve the actual boundary and could imply
an integration that does not exist.

Repository inspection found Boomplay in the generic Engine platform IDs,
weights, readiness, and publication contracts, plus public chart links and
URLs. The Operations song model has no Boomplay track-ID field; it explicitly
notes that Boomplay IDs are not stored. There are no Boomplay credentials or
provider integrations configured in the inspected source.

**Go/no-go: no-go pending evidence.** Next, ask Boomplay and any relevant
artist/label/distributor to provide the applicable partner/report
documentation, sample field definitions and coverage, API/export terms, and
written permission for BORA's comparative chart use. Only then assess whether
the actual values satisfy the Engine's hourly measurement contract. No
implementation is justified before those prerequisites exist.

## Repository and engine context

- `lib/bora-engine/platform-observation.ts` accepts hourly
  `track_streams` / `streams_per_hour` observations and explicit collection
  statuses; it rejects unsupported metric/unit combinations.
- `engine/src/engine/platform/window.ts` uses an inclusive 168-clock-hour
  window and sums actual observations; it does not establish a data source or
  the right to use one.
- `engine/src/engine/platform/points.ts` normalizes each platform's total
  observed activity into ranking points. This is comparative analysis, so it
  must not be fed Boomplay data without explicit use authorization.
- Current persistence and migrations describe a platform-hour projection and
  coverage, but those drafts do not provide a Boomplay source, mapping,
  permission, or measurements.
