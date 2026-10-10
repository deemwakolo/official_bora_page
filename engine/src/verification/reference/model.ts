/**
 * BORA - PHASE 21 INDEPENDENT REFERENCE MODEL
 * =============================================================
 * An independent mathematician.
 *
 * WHAT THIS FILE IS
 * -----------------
 * A second, deliberately naive implementation of the LOCKED BORA mathematical
 * contract, written from the specification in requirement order:
 *
 *     votes -> C -> active window -> seed resolution -> C_i
 *           -> T_C -> XP -> fresh Kura
 *           -> persistent Kura + decay
 *           -> platform points -> BORA Score -> rank
 *
 * WHAT THIS FILE IS NOT
 * ---------------------
 * It is NOT a second wrapper around the engine. It imports NOTHING from
 * src/engine/**, and it deliberately does not reproduce the engine's module
 * decomposition, its validation layering, its Result types, or its error
 * vocabulary. Those are IMPLEMENTATION DETAILS. This file thinks in
 * requirements -> equations -> state, because if both models share a helper,
 * a shared bug passes unnoticed in both and the comparison proves nothing.
 *
 * WHY IT IS NAIVE ON PURPOSE
 * --------------------------
 * No memoisation, no streaming, no early exit, no batching, no cleverness.
 * Every hour of the window is visited explicitly and every intermediate is
 * named. An oracle whose job is to disagree loudly gains nothing from speed.
 *
 * PURE: no mutation of inputs, no clock, no randomness, no global state, no
 * network, no filesystem, no React, no simulation state.
 */

import {
  REF_C_WINDOW_HOURS,
  REF_PLATFORM_WINDOW_HOURS,
  REF_UPVOTE_TIER_2,
  REF_DOWNVOTE_TIER_2,
  REF_C_TIER_1,
  REF_C_TIER_2,
  REF_C_DOWN_TIER_1,
  REF_C_DOWN_TIER_2,
  REF_C_MAX,
  REF_WEIGHT_YOUTUBE,
  REF_WEIGHT_SPOTIFY,
  REF_WEIGHT_BOOMPLAY,
  REF_KURA_TOTAL,
  REF_DECAY_BASE,
} from './contract';

import type {
  RefBucket,
  RefChart,
  RefEntry,
  RefHour,
  RefObservation,
  RefScenario,
  RefSong,
} from './types';

// ============================================================ REF-THRESHOLD
// Contract 9.

/**
 * Upvote contribution C_U for one hour.
 *
 *     0 -> 0,  1-4 -> 1,  5+ -> 2
 *
 * The thresholds SATURATE. Four upvotes and five thousand upvotes are
 * mathematically identical, so brigading buys nothing.
 */
export function refUpvoteContribution(upvotes: number): number {
  if (upvotes === 0) return 0;
  if (upvotes < REF_UPVOTE_TIER_2) return REF_C_TIER_1;
  return REF_C_TIER_2;
}

/**
 * Downvote contribution C_D for one hour.
 *
 *     0 -> 0,  1-4 -> 0.5,  5+ -> 1
 */
export function refDownvoteContribution(downvotes: number): number {
  if (downvotes === 0) return 0;
  if (downvotes < REF_DOWNVOTE_TIER_2) return REF_C_DOWN_TIER_1;
  return REF_C_DOWN_TIER_2;
}

/**
 * Effective hourly C.
 *
 *     C_h = max(0, C_U - C_D)
 *
 * The floor at zero is the contract, not a defensive patch: C_U caps at 2 and
 * C_D caps at 1, so a heavily downvoted hour clamps to 0 instead of producing
 * a negative term that would corrupt every downstream sum.
 *
 * C therefore lives on the lattice {0, 0.5, 1, 1.5, 2} and never exceeds 2.
 */
export function refHourlyC(bucket: RefBucket): number {
  const cUp = refUpvoteContribution(bucket.up);
  const cDown = refDownvoteContribution(bucket.down);
  const raw = cUp - cDown;
  return raw > 0 ? raw : 0;
}

// ============================================================ REF-WINDOW
// Contract 3/4, A5.

/**
 * The active C window for a reference hour H: exactly H-71 .. H.
 *
 * THE CENTRAL DISTINCTION: 72 CLOCK-HOURS != 72 STORED RECORDS. The window is
 * a range of clock TIME. A song holding three buckets still has a 72-hour
 * window; the other 69 hours contribute nothing and are NOT fabricated.
 *
 *     H - 71  included   (oldest active hour)
 *     H - 72  EXPIRED
 *     H       included   (the in-progress hour)
 *     H + 1   FUTURE
 */
export function refWindowStart(referenceHour: number): number {
  return referenceHour - (REF_C_WINDOW_HOURS - 1);
}

export function refWindowEnd(referenceHour: number): number {
  return referenceHour;
}

/** True when `hour` lies inside the inclusive C window anchored at H. */
export function refHourInWindow(hour: number, referenceHour: number): boolean {
  return hour >= refWindowStart(referenceHour) && hour <= refWindowEnd(referenceHour);
}

/** Every clock hour of the active window, ascending. */
export function refWindowHours(referenceHour: number): number[] {
  const hours: number[] = [];
  for (let h = refWindowStart(referenceHour); h <= referenceHour; h++) {
    hours.push(h);
  }
  return hours;
}

/**
 * The active platform window for H: exactly H-167 .. H (168 clock hours).
 *
 * 7 ELAPSED CLOCK-DAYS, not 7 calendar dates. A calendar window would vary
 * between 144 and 168 hours depending on the month; the contract means a fixed
 * elapsed duration.
 */
export function refPlatformWindowStart(referenceHour: number): number {
  return referenceHour - (REF_PLATFORM_WINDOW_HOURS - 1);
}

/** True when `hour` lies inside the inclusive platform window at H. */
export function refHourInPlatformWindow(hour: number, referenceHour: number): boolean {
  return hour >= refPlatformWindowStart(referenceHour) && hour <= referenceHour;
}
// ============================================================ REF-SEED
// Contract 9, A6, Phase 20R R3.

/**
 * Resolve every clock hour of the active window for one song.
 *
 * THE LOCKED PRECEDENCE, per exact hour:
 *
 *     an ACTUAL bucket exists  ->  its C, EVEN WHEN THAT C IS 0
 *     otherwise a SEED exists  ->  the seeded C
 *     otherwise                ->  0
 *
 * BUCKET EXISTENCE DECIDES, NOT BUCKET VALUE. Measured silence is not absence:
 * an hour holding a real but empty bucket resolves to 0 and the seed for that
 * hour is SUPPRESSED. Actual REPLACES seed - the two are never summed, and an
 * actual C of 0 never invites the seed back in.
 *
 * The engine does not assess popularity, invent values, derive a runway, or
 * infer missing seed hours. Seed input is an explicit hour-indexed timeline;
 * partial coverage is valid and a missing hour simply has no seed.
 */
export function refResolveHours(song: RefSong, referenceHour: number): RefHour[] {
  const actualByHour = new Map<number, number>();

  for (const bucket of song.buckets) {
    // A corrupt count is never coerced into a plausible-looking C: clamping a
    // NaN to 0 would manufacture "this hour had no votes".
    if (!Number.isFinite(bucket.up) || !Number.isFinite(bucket.down)) continue;
    // A repeated hour is a data defect the engine rejects outright. It is not
    // modelled here; the conformance harness avoids generating duplicates.
    if (actualByHour.has(bucket.hour)) continue;
    actualByHour.set(bucket.hour, refHourlyC(bucket));
  }

  const seedByHour = new Map<number, number>();
  for (const record of song.seed) {
    // Provenance is read from the DATA, never inferred from the resulting C.
    if (record.source !== 'SEED') continue;
    // An archived record has left the timeline. It is retained forever but no
    // longer contributes - expiry is selection, never deletion.
    if (record.archived) continue;
    // PHASE 22: the seed domain check is the reference model's OWN, written
    // from the contract. An out-of-domain record is REJECTED, matching the
    // engine's "reject, never clamp" rule.
    if (!refSeededHourlyCAccepts(record.c)) {
      continue;
    }
    seedByHour.set(record.hour, record.c);
  }

  const hours: RefHour[] = [];

  for (const hour of refWindowHours(referenceHour)) {
    const hasActual = actualByHour.has(hour);
    const actualC = hasActual ? actualByHour.get(hour)! : null;
    const seedC = hasActual ? null : (seedByHour.get(hour) ?? null);

    let source: RefHour['source'];
    if (hasActual) source = 'ACTUAL';
    else if (seedC !== null) source = 'SEED';
    else source = 'NONE';

    hours.push({ hour, actualC, seedC, source });
  }

  return hours;
}

/**
 * C_i - a song's active C: the sum of its resolved hourly C.
 *
 * A SUM over already-resolved values, not a new definition of C. Each term
 * came from REF-THRESHOLD (actual) or REF-SEED (seed), and the actual-over-seed
 * precedence was already applied per hour.
 */
export function refActiveC(hours: readonly RefHour[]): number {
  let total = 0;
  for (const hour of hours) {
    // Exactly one of these is non-null by construction.
    total += hour.actualC ?? hour.seedC ?? 0;
  }
  return total;
}


// ============================================================ REF-SEED DOMAIN
// Phase 22: the canonical seeded hourly C domain.

/**
 * REF-SEED DOMAIN -- the reference model's OWN ruling check.
 *
 * The D-001 ruling, transcribed independently from the specification:
 *
 *     an explicit seeded hourly C is valid IFF it is finite and lies in the
 *     closed interval [0, C_MAX], where C_MAX = 2
 *
 * WHY THIS IS WRITTEN AGAIN RATHER THAN IMPORTED
 * ----------------------------------------------
 * The production engine has `validateSeededHourlyC`. Importing it would make
 * the reference model a restatement of the implementation it is supposed to
 * check: if that function were wrong, both sides would be wrong together and
 * the differential comparison would pass while proving nothing. The whole
 * purpose of this directory is that it does NOT share helpers with the system
 * under test, so the rule is re-implemented here from the contract text.
 *
 * It is written as plainly as the rule allows, with no imported constants:
 *
 *     Number.isFinite(c) && c >= 0 && c <= 2
 *
 * WHY THE UPPER BOUND EXISTS (Phase 22 section 1)
 * ----------------------------------------------
 * The decay equation is D_h = 0.0025 * (1 - C_h / 2). A seed above 2 makes
 * D_h negative, which turns decay into GROWTH and contradicts the semantic role
 * of the coefficient. Seed values are therefore bounded by the structural
 * maximum hourly C of the BORA activity model.
 *
 * THE DOMAIN IS CONTINUOUS. Actual, vote-derived C lies on the five-point
 * threshold lattice {0, 0.5, 1, 1.5, 2}; a seeded C may be ANY finite real in
 * [0, 2], for example 1.25. Conflating the two would be a category error.
 *
 * @returns true when the supplied per-hour seeded C is valid.
 */
export function refSeededHourlyCAccepts(c: number): boolean {
  return Number.isFinite(c) && c >= 0 && c <= REF_C_MAX;
}


/**
 * REF-SEED DOMAIN QUERY -- does this song's seed timeline stay in the domain?
 *
 * Mirrors the engine's accept/reject DECISION (not its arithmetic) so a
 * conformance test can compare the two without the reference model having to
 * model the engine's error type.
 *
 * A record is in scope only when it would actually be resolved as a seed:
 * `source === 'SEED'` and not archived. An ACTUAL-source record is never a
 * seed (that is the D-002 repair), and an archived record has left the
 * timeline and contributes nothing, so neither can make a song invalid.
 *
 * @returns true when every in-scope seed record lies in [0, C_MAX].
 */
export function refSongSeedsWithinDomain(song: RefSong): boolean {
  for (const record of song.seed) {
    if (record.source !== 'SEED') continue;
    if (record.archived) continue;
    if (!refSeededHourlyCAccepts(record.c)) return false;
  }
  return true;
}

// ============================================================ REF-DISTRIBUTION
// Contract 6, A2.

/**
 * T_C - chart-wide total active C across the ACTIVE population.
 *
 * A ZERO-C ACTIVE song REMAINS in the population. It is not dropped: dropping
 * it would change the song count and make the chart silently depend on its own
 * membership rules. It simply contributes 0 to every sum.
 */
export function refTotalActiveC(activeCs: readonly number[]): number {
  let total = 0;
  for (const c of activeCs) total += c;
  return total;
}

/**
 * XP and fresh Kura for one song.
 *
 *     XP_i      = C_i / T_C
 *     kuraFresh = XP_i * 50
 *
 * AT T_C = 0 every song receives XP = 0 and fresh Kura = 0. The result stays
 * valid and renderable: no error, no null, no NaN. A cold chart is a
 * legitimate chart state, and activity is never manufactured from no activity.
 *
 * freshKura is the INSTANTANEOUS normalised distribution. It is not persistent
 * Kura and is never used as the score's Kura component.
 */
export function refXpAndFreshKura(
  activeC: number,
  totalActiveC: number,
): { xp: number; freshKura: number } {
  if (totalActiveC === 0) {
    return { xp: 0, freshKura: 0 };
  }
  const xp = activeC / totalActiveC;
  return { xp, freshKura: xp * REF_KURA_TOTAL };
}

// ============================================================ REF-KURA
// A1, A3.

/**
 * D_h - the hourly decay RATE for a just-closed hour with C value C_h.
 *
 *     D_h = 0.0025 * (1 - C_h / 2)
 *
 * A song earning nothing decays fastest (D = 0.0025); a song earning the
 * maximum C does not decay at all (D = 0), because activity offsets decay.
 */
export function refDecayRate(closedHourC: number): number {
  return REF_DECAY_BASE * (1 - closedHourC / REF_C_MAX);
}

/**
 * persistent_next = (persistent_current + fresh_for_cycle) * (1 - D_h)
 *
 * THE ORDERING IS THE POINT. Fresh Kura is injected BEFORE decay, so the newly
 * injected amount is itself subject to that cycle's decay. The rejected form,
 * persistent * (1 - D) + fresh, would let a song's fresh Kura bypass decay on
 * the very cycle it was earned - precisely what A1 exists to prevent.
 */
export function refPersistentNext(
  persistentBefore: number,
  freshKura: number,
  closedHourC: number,
): number {
  const decay = refDecayRate(closedHourC);
  return (persistentBefore + freshKura) * (1 - decay);
}
// ============================================================ REF-PLATFORM
// Contract 18-21, A4.

/** A song's active activity and points on each platform. */
export interface RefPlatformActivity {
  readonly youtube: number;
  readonly spotify: number;
  readonly boomplay: number;
}

/**
 * A song's active activity on one platform: the sum of supplied observations
 * inside the 7-day window.
 *
 * Missing hours contribute nothing. Under the locked TOTAL-based denominator
 * this is arithmetically identical to materialising every absent hour as zero,
 * which is why no explicit missing-observation rule is needed.
 */
export function refPlatformActivity(
  observations: readonly RefObservation[],
  referenceHour: number,
): number {
  let total = 0;
  for (const observation of observations) {
    if (refHourInPlatformWindow(observation.hour, referenceHour)) {
      total += observation.value;
    }
  }
  return total;
}

/**
 * Normalise ONE platform into points:
 *
 *     points_i = (songActivity_i / totalActivePlatformActivity) * weight
 *
 * THE DENOMINATOR IS PER PLATFORM, not one grand total across YT+SP+BP. Each
 * platform normalises against its OWN activity sum. This preserves
 * cross-platform independence: an artist dominant on YouTube earns nothing
 * extra on Spotify. A single combined denominator would let one platform's
 * volume distort the others.
 *
 * IDLE PLATFORM: when a platform's total is 0, EVERY song receives 0 points
 * there. No NaN, no division by zero, and crucially NO REDISTRIBUTION -
 * YouTube's unused 30 points are not handed to Spotify or Boomplay. A chart
 * may therefore total less than 50, and that is correct, not a defect.
 *
 * Platform points NEVER DECAY. They are re-derived from the active window on
 * every evaluation; they are not a stored balance.
 */
export function refNormalisePlatform(
  activities: ReadonlyMap<string, number>,
  weight: number,
): Map<string, number> {
  const points = new Map<string, number>();

  let total = 0;
  for (const value of activities.values()) total += value;

  if (total <= 0) {
    for (const songId of activities.keys()) points.set(songId, 0);
    return points;
  }

  for (const [songId, value] of activities) {
    points.set(songId, (value / total) * weight);
  }

  return points;
}

/** Compute all three platforms' points for every ACTIVE song. */
export function refPlatformPoints(
  activeSongs: readonly RefSong[],
  referenceHour: number,
): {
  readonly bySong: ReadonlyMap<string, RefPlatformActivity>;
  readonly totals: { youtube: number; spotify: number; boomplay: number };
} {
  const youtube = new Map<string, number>();
  const spotify = new Map<string, number>();
  const boomplay = new Map<string, number>();

  for (const song of activeSongs) {
    youtube.set(song.id, refPlatformActivity(song.youtube, referenceHour));
    spotify.set(song.id, refPlatformActivity(song.spotify, referenceHour));
    boomplay.set(song.id, refPlatformActivity(song.boomplay, referenceHour));
  }

  const ytPoints = refNormalisePlatform(youtube, REF_WEIGHT_YOUTUBE);
  const spPoints = refNormalisePlatform(spotify, REF_WEIGHT_SPOTIFY);
  const bpPoints = refNormalisePlatform(boomplay, REF_WEIGHT_BOOMPLAY);

  const bySong = new Map<string, RefPlatformActivity>();
  const totals = { youtube: 0, spotify: 0, boomplay: 0 };

  for (const song of activeSongs) {
    const activity = {
      youtube: youtube.get(song.id)!,
      spotify: spotify.get(song.id)!,
      boomplay: boomplay.get(song.id)!,
    };
    const points = {
      youtube: ytPoints.get(song.id)!,
      spotify: spPoints.get(song.id)!,
      boomplay: bpPoints.get(song.id)!,
    };
    bySong.set(song.id, { ...activity, ...points });
    totals.youtube += points.youtube;
    totals.spotify += points.spotify;
    totals.boomplay += points.boomplay;
  }

  return { bySong, totals };
}
// ============================================================ REF-SCORE
// Contract 2, A4.

/**
 * BORA Score = persistentKura + yt + sp + bp
 *
 * K IS EXCLUDED. K is score-neutral; it is ranking tie-break #2 and nothing
 * more.
 *
 * THE SCORED KURA IS THE CURRENT COMMITTED BALANCE, not the projected next
 * value. The score describes the state as it stands; the projection is a
 * separate, explicitly-returned figure. Using persistentNext here would make
 * every chart depend on a cycle that has not happened yet.
 *
 * Additive and linear: raising any single component by d raises the score by
 * exactly d. Platform weights (30/15/5) were already applied in REF-PLATFORM
 * and are NOT applied again - doing so would double-weight them.
 *
 * There is deliberately no normalisation, no division by 100, and no cap:
 *
 *     persistentKura <= boraScore <= persistentKura + 50
 */
export function refBoraScore(
  persistentKura: number,
  yt: number,
  sp: number,
  bp: number,
): number {
  return persistentKura + yt + sp + bp;
}

/** Tie-break #3: normalised platform performance = yt + sp + bp. */
export function refPlatformTotal(yt: number, sp: number, bp: number): number {
  return yt + sp + bp;
}

// ============================================================ REF-RANK
// Contract 7.

/**
 * The complete, exhaustive ordering key:
 *
 *     1. BORA Score          higher first
 *     2. K                   higher first
 *     3. platformTotal       higher first
 *     4. songId              ascending lexical UTF-16 (determinism only)
 *
 * There is no fifth criterion. Level 4 exists purely so the chart's
 * arrangement can never depend on input order - without it, every determinism
 * guarantee in the project would rest on the accident of how a caller happened
 * to sort its array.
 *
 * Song ids are compared by UTF-16 CODE UNIT (plain < and >), never by
 * localeCompare, which is locale- and environment-dependent and would reorder
 * songs between machines.
 *
 * Returns -1, 0, or 1.
 */
export function refCompare(a: RefEntry, b: RefEntry): -1 | 0 | 1 {
  // 1. BORA Score, descending.
  if (a.boraScore !== b.boraScore) return a.boraScore > b.boraScore ? -1 : 1;

  // 2. K, descending. Score-neutral, but a legitimate tie-break.
  if (a.k !== b.k) return a.k > b.k ? -1 : 1;

  // 3. Normalised platform performance, descending.
  if (a.platformTotal !== b.platformTotal) {
    return a.platformTotal > b.platformTotal ? -1 : 1;
  }

  // 4. songId, ascending lexical.
  if (a.songId < b.songId) return -1;
  if (a.songId > b.songId) return 1;
  return 0;
}

/** Rank entries deterministically, assigning 1-based ranks. */
export function refRank(entries: readonly RefEntry[]): RefEntry[] {
  const sorted = [...entries].sort(refCompare);
  return sorted.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

// ============================================================ REF-LIFECYCLE
// Phase 13, A8.

/**
 * ACTIVE and VAULT.
 *
 * VAULT IS EXCLUSION, NOT DELETION. Vaulting removes a song from the ACTIVE
 * chart and erases nothing:
 *
 *     - K                       retained
 *     - persistent Kura         retained, dormant - it does NOT decay
 *     - historical records      retained (references, never filtered)
 *     - song identity           retained
 *
 * A Vaulted song therefore appears in none of T_C, XP, fresh Kura, platform
 * points, BORA Score, or the ranking. It is EXCLUDED, never ZEROED - dropping
 * it into the denominator would let a dormant song dilute the active chart.
 *
 * RESTORE rewinds active score but never history:
 *
 *     K = retained, persistent Kura = 0, seed = none, history = retained
 *
 * No seed is generated automatically on restore: restore has no seed concept
 * at all.
 */
export function refIsActive(song: RefSong): boolean {
  return song.lifecycle === 'ACTIVE';
}

/** Apply the RESTORE rule: zero the persistent Kura, retain everything else. */
export function refRestore(song: RefSong): RefSong {
  return { ...song, lifecycle: 'ACTIVE', persistentKura: 0 };
}

/** Apply the VAULT rule: mark VAULT, retaining K, history, and balance. */
export function refVault(song: RefSong): RefSong {
  return { ...song, lifecycle: 'VAULT' };
}
// ============================================================ WHOLE CHART
// Composes REF-LIFECYCLE through REF-RANK.

/**
 * Evaluate the whole chart at a reference hour.
 *
 * The sequence, in contract order:
 *
 *     1. REF-LIFECYCLE     separate ACTIVE from VAULT
 *     2. REF-SEED          resolve every hour of every ACTIVE song
 *     3. REF-WINDOW        sum to C_i
 *     4. REF-DISTRIBUTION  one shared T_C, then XP and fresh Kura
 *     5. REF-KURA          project persistentNext if a closed hour was given
 *     6. REF-PLATFORM      normalise each platform independently
 *     7. REF-SCORE         persistentKura (CURRENT) + yt + sp + bp
 *     8. REF-RANK          the four-key deterministic ordering
 *
 * EVALUATION IS NOT A STATE TRANSITION. This function is pure: it reads state,
 * projects the next persistent Kura, and RETURNS it. It never commits.
 */
export function refEvaluate(scenario: RefScenario): RefChart {
  const referenceHour = scenario.referenceHour;

  // 1. Lifecycle: only ACTIVE songs participate in any active computation.
  const activeSongs = scenario.songs.filter(refIsActive);
  const excludedVaulted = scenario.songs
    .filter((song) => !refIsActive(song))
    .map((song) => song.id);

  // 2 + 3. Resolve every hour, then sum to C_i.
  const hoursBySong: Record<string, readonly RefHour[]> = {};
  const activeCs: number[] = [];
  const activeCBySong = new Map<string, number>();

  for (const song of activeSongs) {
    const hours = refResolveHours(song, referenceHour);
    hoursBySong[song.id] = hours;
    const c = refActiveC(hours);
    activeCBySong.set(song.id, c);
    activeCs.push(c);
  }

  // 4. One shared denominator across the whole ACTIVE population.
  const totalActiveC = refTotalActiveC(activeCs);

  // 6. Platform points over the ACTIVE population only.
  const platform = refPlatformPoints(activeSongs, referenceHour);

  const evaluated: RefEntry[] = [];

  for (const song of activeSongs) {
    const activeC = activeCBySong.get(song.id)!;
    const { xp, freshKura } = refXpAndFreshKura(activeC, totalActiveC);

    // 5. Project the next persistent Kura only when a closed hour is given.
    let persistentKuraNext: number | null = null;
    let decay: number | null = null;

    if (scenario.closedHourC !== null) {
      decay = refDecayRate(scenario.closedHourC);
      persistentKuraNext = refPersistentNext(
        song.persistentKura,
        freshKura,
        scenario.closedHourC,
      );
    }

    const platformActivity = platform.bySong.get(song.id)!;

    // 7. Score on the CURRENT committed persistent Kura.
    const boraScore = refBoraScore(
      song.persistentKura,
      platformActivity.youtube,
      platformActivity.spotify,
      platformActivity.boomplay,
    );

    evaluated.push({
      songId: song.id,
      k: song.k,
      lifecycle: song.lifecycle,
      activeC,
      tC: totalActiveC,
      xp,
      freshKura,
      persistentKuraBefore: song.persistentKura,
      persistentKuraNext,
      decay,
      yt: platformActivity.youtube,
      sp: platformActivity.spotify,
      bp: platformActivity.boomplay,
      platformTotal: refPlatformTotal(
        platformActivity.youtube,
        platformActivity.spotify,
        platformActivity.boomplay,
      ),
      boraScore,
      rank: null,
    });
  }

  // 8. Deterministic ordering.
  const ranked = refRank(evaluated);

  return {
    referenceHour,
    tC: totalActiveC,
    ranked,
    active: evaluated,
    excludedVaulted,
    platformTotals: platform.totals,
    hoursBySong,
  };
}

/**
 * Resolve ONE clock hour's C for one song, with its provenance.
 *
 * Used by REF-ROLLOVER, which needs the C of the hour that JUST CLOSED - never
 * of the new hour - because decay belongs to the hour that ended.
 */
export function refResolvedCForHour(
  song: RefSong,
  referenceHour: number,
  hour: number,
): { c: number; source: RefHour['source'] } {
  const resolved = refResolveHours(song, referenceHour).find((h) => h.hour === hour);
  if (!resolved) {
    return { c: 0, source: 'NONE' };
  }
  return { c: resolved.actualC ?? resolved.seedC ?? 0, source: resolved.source };
}