# BORA Engine Spotify Measurement Feasibility

## Executive decision

**No-go: Spotify Web API data should not feed BORA's ranking Engine under the
currently established permissions.** Spotify's Developer Policy says not to
analyze Spotify Content or the Spotify Service to create derived listenership
metrics or benchmarks. Converting Spotify-derived activity into per-song
normalized chart points appears to fall within that restriction. Do not proceed
on the assumption that API access grants ranking rights. Obtain written
clarification or express permission from Spotify before considering any such
use.

This is a technical and policy feasibility assessment, not legal advice.

## 1. Available API data

| Data | What it represents | Availability and relevance |
| --- | --- | --- |
| Track metadata | Catalog identity and descriptive fields such as track name, artists, album, duration, and identifiers. | Track lookup can support identity and display metadata where the app is authorized and the track is available. Metadata does not provide an hourly measurement of listening. |
| Track popularity | The Get Track reference describes a 0–100 algorithmic value based mostly on total plays and recency, and warns that it can lag by days. | It is not a play count, has no measurement interval or exact observation time, and is not suitable as `streams_per_hour`. The current reference consulted still documents the field; its availability or deprecation status may vary. Do not build a dependency on it or relabel it as streams. |
| User-specific listening history | Playback records associated with an authenticated user's account, with per-user playback timestamps where exposed by the relevant endpoint and scopes. | It is not platform-wide track listening. It cannot serve as an unbiased song-level stream total and must not be collected for this purpose. |
| Actual track stream counts | A platform-wide, per-track count over a specified interval, or a cumulative total with trustworthy interval boundaries. | The referenced Web API and Get Track documentation do not expose such a count. Do not infer one from popularity, metadata, user playback records, or chart ranks. |

The Web API documentation describes a developer API for interacting with
Spotify, including content metadata, playlists, and playback. It does not
establish that the API exposes platform-wide track stream counts.

## 2. Measurement limitations

The current BORA Engine platform contract expects a numeric observation of
track activity for a particular UTC clock hour: `track_streams` measured in
`streams_per_hour`. Platform data is selected over a 168-hour window and
normalized within each platform for ranking.

Spotify API fields do not satisfy that measurement contract:

- Track metadata is descriptive, not a stream measurement.
- Popularity is a delayed, algorithmic 0–100 score related to plays and
  recency. It is not a cumulative count, instantaneous count, or timestamped
  historical count. Its delay also makes it unsuitable as an hourly signal.
- User playback history describes the requesting user's plays, not all
  platform users or all track streams. It is personalized/account-scoped and
  cannot truthfully be aggregated into platform-wide streams without a
  separate authorized methodology.
- Actual per-track stream counts and historical hourly stream series are
  unavailable in the referenced Web API documentation.

Consequently there is no honest mapping from these API fields to
`streams_per_hour`. Popularity must not be divided, differenced, normalized, or
otherwise used as a proxy for streams.

## 3. Policy restrictions

Spotify Developer Policy item 13 states: “Do not analyze the Spotify Content
or the Spotify Service for any purpose, including without limitation, creating
new or derived listenership metrics, benchmarking, functionality, usage
statistics, user metrics, or building profiles of users ...”

BORA's proposal uses per-track platform listening activity to calculate
relative Spotify points and rank songs. That appears to be a derived
listenership metric and analysis of Spotify's service. Under the published
policy, this proposed API-derived ranking use appears **prohibited absent an
applicable written authorization or policy exception**. A developer
application, API key, endpoint access, or artist relationship alone should not
be treated as permission for this use. Seek written clarification/permission
from Spotify and review the applicable Developer Terms before implementation.

## 4. Potential authorized source alternatives

Potential sources of actual stream measurements include:

- Artist-facing Spotify analytics made available to the relevant artist or
  authorized team.
- Label analytics for a recording the label represents.
- Distributor reporting for releases it distributes.
- Rights-holder or licensed data-provider reporting with a contractual right
  to provide the measurements for BORA's charting use.

No access, export, authorization, license, or coverage from any of these
sources has been established in this repository. Their terms must explicitly
permit the proposed use; a measurement source does not by itself confer
ranking or redistribution rights.

## 5. Recommended authorized observation contract

Only ingest a measurement after its source and BORA's intended use are
authorized. The minimum trustworthy record should include:

- **Song identity:** stable BORA song ID and an explicitly verified platform
  track ID; never title-based matching.
- **Platform:** `spotify`.
- **Metric and unit:** the source's actual measure and unit, for example
  `track_streams` / `streams_per_hour` only if the source actually supplies an
  hourly count. Preserve cumulative totals as a distinct metric and unit.
- **Source identity and provenance:** provider/rights-holder, report or
  endpoint identity, stable source-record ID, and any source reference needed
  for audit.
- **Measurement time/interval:** UTC observation time or exact start/end
  timestamps, timezone, interval semantics, and whether values are final,
  estimated, delayed, or revised.
- **Coverage and collection status:** explicit `COMPLETE`, `MISSING`,
  `UNAVAILABLE`, or `FAILED` status for each song and required hour. A
  complete interval with no activity must be distinct from missing coverage;
  never convert unavailable data to zero.
- **Correction identity:** stable retry identity and an append-only correction
  or revision link when the source revises a report.

These fields align with the existing platform-observation provenance and
coverage principles, but do not make an unauthorized or semantically
incompatible source acceptable.

## 6. Go/no-go decision

**No-go for Spotify Web API data as BORA Engine ranking input.** The API
reference does not provide platform-wide hourly track stream counts, and the
Developer Policy restricts deriving listenership metrics and benchmarks from
Spotify data. Do not use popularity or user-specific listening history as a
substitute.

Next step: request written policy clarification/permission for BORA's precise
chart-ranking use. In parallel, investigate an authorized artist, label,
distributor, rights-holder, or licensed reporting source that supplies
timestamped, per-track measurements with adequate coverage and correction
semantics. Only after both data semantics and usage rights are confirmed should
a source-specific adapter be considered.

## Official Spotify sources consulted

- [Get Track reference](https://developer.spotify.com/documentation/web-api/reference/get-track) — track metadata and the documented 0–100 popularity field, its algorithmic basis, and its potential multi-day lag.
- [Web API overview](https://developer.spotify.com/documentation/web-api) — API purpose, developer application/access-token requirements, and general API scope.
- [Spotify Developer Policy](https://developer.spotify.com/policy) — especially item 13 on analysis, derived listenership metrics, and benchmarking.
- [Track relinking](https://developer.spotify.com/documentation/web-api/concepts/track-relinking) — market-dependent track availability and identity behavior relevant to stable track mapping.

## Repository context

The application has Spotify chart/display references and a legacy `sp_plays`
field reference, but no Spotify track-ID mapping in the Operations song model,
no Spotify API client or credentials, and no authorized stream-count source.
The Engine's Spotify observation slot is a generic platform contract, not
evidence that Spotify provides or permits the required data.
