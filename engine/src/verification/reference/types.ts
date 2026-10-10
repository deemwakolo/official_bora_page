/**
 * BORA — PHASE 21 INDEPENDENT REFERENCE MODEL
 * ═══════════════════════════════════════════════════════════════════════════
 * The reference model's OWN vocabulary.
 *
 * ── WHY THIS FILE EXISTS INSTEAD OF IMPORTING `src/engine/types.ts` ───────────
 *
 * The engine's types are branded (`HourIndex` is a `unique symbol` brand over
 * `number`). A branded type is a compile-time fiction: it disappears at
 * runtime. Importing it would create the appearance of a shared contract while
 * sharing nothing mathematically — and it would let an engine type silently
 * become the reference model's input type, which is exactly the accidental
 * dependence this phase exists to prevent.
 *
 * So the reference model speaks in plain `number` and plain `string`, in its
 * own words:
 *
 *     engine          reference
 *     ─────────────   ──────────────
 *     HourIndex       hour: number
 *     VoteBucket      RefBucket
 *     HourlyCRecord   RefSeed
 *     PlatformSeries  youtube/spotify/boomplay arrays
 *
 * The conformance harness is responsible for translating between the two
 * vocabularies. That translation lives in the TEST layer, not here, so the
 * reference model never sees an engine object at all.
 *
 * PURE: types only. No runtime code, no imports.
 */

/** One clock hour of raw votes. `hour` is an integer clock-hour index. */
export interface RefBucket {
  readonly hour: number;
  readonly up: number;
  readonly down: number;
}

/**
 * One clock hour of seeded C.
 *
 * `archived` mirrors the engine's `RecordLifecycle`. An archived record has
 * left the timeline: it is retained forever for audit but contributes nothing.
 * `source` mirrors `CHistorySource` — provenance is read from the DATA, never
 * inferred from the resulting C value, because a seeded 0 and an unmeasured
 * hour are different facts.
 */
export interface RefSeed {
  readonly hour: number;
  readonly c: number;
  readonly source: 'SEED' | 'ACTUAL';
  readonly archived: boolean;
}

/** One raw, unnormalised platform measurement for one clock hour. */
export interface RefObservation {
  readonly hour: number;
  readonly value: number;
}

/** A song's lifecycle state. */
export type RefLifecycle = 'ACTIVE' | 'VAULT';

/** One song's complete input state, in reference vocabulary. */
export interface RefSong {
  readonly id: string;
  readonly lifecycle: RefLifecycle;
  /** REF-K: permanent historical upvotes. */
  readonly k: number;
  /** The SCORED persistent Kura balance (A1). */
  readonly persistentKura: number;
  readonly buckets: readonly RefBucket[];
  readonly seed: readonly RefSeed[];
  readonly youtube: readonly RefObservation[];
  readonly spotify: readonly RefObservation[];
  readonly boomplay: readonly RefObservation[];
}

/** A complete evaluation request. `closedHourC` is null when no cycle applies. */
export interface RefScenario {
  readonly referenceHour: number;
  readonly closedHourC: number | null;
  readonly songs: readonly RefSong[];
}

/**
 * Provenance of one resolved clock hour.
 *
 * The locked precedence produces exactly one source per hour:
 *   ACTUAL — a real bucket exists for this hour, even if its C is 0
 *   SEED   — no bucket, but a seed record covers this exact hour
 *   NONE   — neither; the hour contributes 0
 *
 * `NONE` is a real outcome and is deliberately distinct from `SEED` carrying 0
 * and from `ACTUAL` carrying 0, so "measured and silent" remains
 * distinguishable from "seeded at zero" from "unmeasured".
 */
export type RefHourSource = 'ACTUAL' | 'SEED' | 'NONE';

/** One clock hour after seed resolution. */
export interface RefHour {
  readonly hour: number;
  /** Non-null iff an actual bucket existed. */
  readonly actualC: number | null;
  /** Non-null iff a seed covered this hour and no bucket did. */
  readonly seedC: number | null;
  readonly source: RefHourSource;
}

/** One song's evaluated result, in reference vocabulary. */
export interface RefEntry {
  readonly songId: string;
  readonly k: number;
  readonly lifecycle: RefLifecycle;

  /** REF-DISTRIBUTION: C_i, the sum of this song's resolved hourly C. */
  readonly activeC: number;
  /** Chart-wide total active C. The single shared denominator. */
  readonly tC: number;
  readonly xp: number;
  readonly freshKura: number;

  readonly persistentKuraBefore: number;
  /** Null when no Kura cycle applies (no closed hour supplied). */
  readonly persistentKuraNext: number | null;
  /** D_h, the decay RATE for the just-closed hour. */
  readonly decay: number | null;

  readonly yt: number;
  readonly sp: number;
  readonly bp: number;
  readonly platformTotal: number;

  readonly boraScore: number;
  /** 1-based, or null for a Vaulted song (which is never ranked). */
  readonly rank: number | null;
}

/** A complete reference chart evaluation. */
export interface RefChart {
  readonly referenceHour: number;
  readonly tC: number;
  /** ACTIVE songs in RANKED order. Never contains a Vaulted song. */
  readonly ranked: readonly RefEntry[];
  /** ACTIVE songs, in input order. */
  readonly active: readonly RefEntry[];
  /** Song ids excluded because they are VAULT. */
  readonly excludedVaulted: readonly string[];
  readonly platformTotals: {
    readonly youtube: number;
    readonly spotify: number;
    readonly boomplay: number;
  };
  /** Full hour-by-hour resolution for every ACTIVE song, for C3 provenance. */
  readonly hoursBySong: Readonly<Record<string, readonly RefHour[]>>;
}
