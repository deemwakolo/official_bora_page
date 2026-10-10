/**
 * BORA — PHASE 21 NEUTRAL SCENARIO VOCABULARY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ── WHY A THIRD VOCABULARY ────────────────────────────────────────────────────
 *
 * The engine speaks in engine types. The reference model speaks in reference
 * types. If a conformance test wrote a scenario directly in engine types, the
 * reference model would be handed objects shaped by the implementation it is
 * supposed to check — and any field the engine happened not to expose could
 * never be varied, which quietly shrinks the space of disagreements we can
 * find.
 *
 * So a scenario is authored ONCE, here, in plain data with no imports at all,
 * and then translated twice:
 *
 *        SpecScenario
 *         ├─→ toReference()  →  RefScenario    →  refEvaluate()
 *         └─→ toEngine()     →  EngineInput    →  evaluateChart()
 *
 * Both translations are total functions of the same spec. If they ever
 * disagreed, that is itself a finding.
 *
 * PURE: types only, no runtime code, no imports.
 */

/** One clock hour of raw votes. */
export interface SpecBucket {
  readonly hour: number;
  readonly up: number;
  readonly down: number;
}

/** One clock hour of seeded C, with its provenance. */
export interface SpecSeed {
  readonly hour: number;
  readonly c: number;
  readonly source: 'SEED' | 'ACTUAL';
  /** An archived record has left the timeline: retained, never counted. */
  readonly archived: boolean;
}

/** One raw, unnormalised platform measurement for one clock hour. */
export interface SpecObservation {
  readonly hour: number;
  readonly value: number;
}

/** One song's complete authored state. */
export interface SpecSong {
  readonly id: string;
  readonly lifecycle: 'ACTIVE' | 'VAULT';
  readonly k: number;
  readonly persistentKura: number;
  readonly buckets: readonly SpecBucket[];
  readonly seed: readonly SpecSeed[];
  readonly youtube: readonly SpecObservation[];
  readonly spotify: readonly SpecObservation[];
  readonly boomplay: readonly SpecObservation[];
}

/**
 * A complete authored evaluation request.
 *
 * `name` is carried through to the test title and to failure messages, so a
 * disagreement names the case that produced it rather than an index.
 */
export interface SpecScenario {
  readonly name: string;
  readonly referenceHour: number;
  /** The just-closed hour's C, or null when no Kura cycle applies. */
  readonly closedHourC: number | null;
  readonly songs: readonly SpecSong[];
}

/** An empty song, useful as a starting point for scenario builders. */
export function blankSong(id: string): SpecSong {
  return {
    id,
    lifecycle: 'ACTIVE',
    k: 0,
    persistentKura: 0,
    buckets: [],
    seed: [],
    youtube: [],
    spotify: [],
    boomplay: [],
  };
}
