/**
 * BORA Engine — hourly rollover (state transition)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 15. The ONLY layer permitted to mutate committed state.
 *
 *   H closes
 *      ↓  resolve C_H per ACTIVE song  (actual, else seed, else 0)
 *      ↓  evaluate the chart AT H      (Phase 14, pure)
 *      ↓  obtain fresh Kura            (Phase 8, via the H evaluation)
 *      ↓  persistentNext = (current + fresh) × (1 − D_H)
 *      ↓  COMMIT persistentNext into a NEW state
 *      ↓  advance referenceHour H → H+1
 *      ↓  evaluate the chart AT H+1   (now sees the committed Kura)
 *
 * ── THE ORDER IS THE CONTRACT (A1, A3) ─────────────────────────────────────
 *
 *   `types.ts` already states this sequence in `KuraCycleStep`, and this
 *   module executes exactly that order. Two consequences are load-bearing:
 *
 *   1. THE H EVALUATION PRECEDES COMMITMENT. The chart for H is built from the
 *      state committed at H. Committing first and then evaluating would report
 *      an H chart that silently reflects H+1 Kura.
 *
 *   2. DECAY USES C OF THE HOUR THAT JUST CLOSED. D_H comes from H, never from
 *      H+1. Reading the new hour's C would decay an hour by the wrong activity.
 *
 *      WHY, IN ONE SENTENCE (Phase 20R, section 10 — RATIFIED): decay for a
 *      rollover is determined by the activity of the hour that has just closed,
 *      which makes decay a SINGLE COMMITTED STATE TRANSITION associated with the
 *      completed hour and prevents future-hour activity from affecting the decay
 *      applied to the previous hour.
 *
 *      Concretely: H+1 has not happened yet when the H→H+1 rollover commits.
 *      Decay therefore cannot depend on it without either reading uncommitted
 *      state or inventing it. Binding decay to the closed hour keeps the whole
 *      cycle — evaluate, distribute, decay, commit — a single atomic, replayable
 *      transition over known data.
 *
 *      The formula, its inputs, and its position in the sequence are LOCKED and
 *      unchanged by this note.
 *
 *   Fresh Kura is injected BEFORE decay (Phase 9), so newly earned Kura is
 *   itself decayed on the cycle it was earned.
 *
 * ── PURE TRANSITION, NOT A MUTABLE ENGINE ───────────────────────────────────
 *
 *   `rolloverHour` is referentially transparent: state in, a NEW state out. The
 *   input state, its songs, and every bucket inside it are left untouched.
 *   There is no clock, no randomness, no global state, and no `Date`. Every
 *   hour is an explicit parameter.
 *
 * ── SEED IS A FINITE, HOUR-INDEXED TIMELINE (Q3, D1 REPAIR) ────────────────
 *
 *   A seed is 72 hourly C values attached to explicit clock hours H … H+71,
 *   NOT an infinite uniform overlay. After H+71 that runway contributes
 *   nothing, and nothing regenerates it: a new seed requires an explicit
 *   creation call.
 *
 *   D1 repair: this module no longer projects the runway onto Phase 14's
 *   scalar `seedCPerHour`. A scalar cannot say WHICH HOUR a seed covers, so
 *   a runway covering one hour inside the window was applied to all 72. The
 *   runway is now forwarded to Phase 14 as its own timeline and resolved per
 *   exact clock hour.
 *
 * PURE: no clock, no randomness, no mutation of inputs, no simulation loop, no
 * Supabase, no React, no network, no filesystem.
 */

import { getActiveWindow } from '../window/hours';
import { calculateHourlyC } from '../votes/threshold';
import { seedHourlyRunway, validateSeededHourlyC } from '../seed/seed';
import { updatePersistentKuraWithTrace } from '../kura/persistent';
import { evaluateChart } from '../evaluation/chart';
import type { EngineSong, ChartEvaluationResult } from '../evaluation/chart';
import type {
  HourIndex,
  HourlyCRecord,
  RecordLifecycle,
  Result,
  EngineError,
  PlatformSeries,
  VoteBucket,
} from '../types';

/**
 * One song's committed state.
 *
 * This is PERSISTENT state only. Every derived quantity — active C, T_C, XP,
 * fresh Kura, platform points, BORA Score, rank — is recomputed by Phase 14 on
 * demand and is deliberately absent here, so no derived value can become a
 * second source of truth.
 */
export interface RolloverSong {
  readonly songId: string;

  /** ACTIVE or VAULT (Phase 13). */
  readonly lifecycle: 'ACTIVE' | 'VAULT';

  /** Permanent historical upvotes. Score-neutral; ranking tie-break #2 only. */
  readonly k: number;

  /**
   * The committed persistent-Kura balance.
   *
   * This is the AUTHORITATIVE scored Kura (A1). Only `rolloverHour` writes it,
   * exactly once per closed hour, and only for ACTIVE songs.
   */
  readonly persistentKura: number;

  /**
   * Raw hourly vote buckets, retained forever.
   *
   * Expiry is a SELECTION concern (Phase 5); rollover never deletes a bucket,
   * including one that has left the active window (Contract 11).
   */
  readonly buckets: readonly VoteBucket[];

  /**
   * The seed runway, as explicit hour-indexed C records.
   *
   * Finite by construction: a seed contributes at most 72 entries. Each entry
   * names its own clock hour, so "which hour is seeded" is answered by the data
   * rather than by an implicit offset.
   */
  readonly seedHours: readonly HourlyCRecord[];

  /** Platform observations, grouped per platform. */
  readonly platform: Readonly<PlatformSeries>;
}

/** The complete committed engine state at one reference hour. */
export interface EngineState {
  /** The current clock hour. Advanced only by `rolloverHour`. */
  readonly referenceHour: HourIndex;

  readonly songs: readonly RolloverSong[];
}

/**
 * What one rollover did to one song's persistent Kura.
 *
 * Mirrors the sequence `types.ts` already documents for `KuraCycleStep`, so
 * the cycle can be inspected rather than inferred from a bare number.
 */
export interface RolloverStep {
  readonly songId: string;

  /** The hour whose close triggered this cycle. */
  readonly hourClosed: HourIndex;

  /** C of the just-closed hour — the input to D_h. */
  readonly closedHourC: number;

  /** The fresh Kura injected this cycle. */
  readonly freshInjected: number;

  /** D_h = 0.0025 × (1 − C_closed / C_MAX). */
  readonly decayRate: number;

  /** The committed balance before the cycle. */
  readonly persistentBefore: number;

  /** The balance COMMITTED by this cycle. */
  readonly persistentAfter: number;
}

/** The outcome of advancing exactly one hour. */
export interface RolloverOutcome {
  readonly fromHour: HourIndex;
  readonly toHour: HourIndex;

  /** The committed state AFTER the hour advanced. */
  readonly state: EngineState;

  /** The chart as it stood AT fromHour, before commitment. */
  readonly chartAtClosedHour: ChartEvaluationResult;

  /** The chart AT toHour, which sees the newly committed Kura. */
  readonly chartAtNextHour: ChartEvaluationResult;

  /** Per-song cycle steps, in the state's song order. */
  readonly steps: readonly RolloverStep[];
}

// ───────────────────────────────────────────────────────────────────────────
// SEED RUNWAY
// ───────────────────────────────────────────────────────────────────────────

/**
 * ⚠ TEST / HARNESS CONSTRUCTOR — NOT PART OF THE PRODUCTION SEED CONTRACT ⚠
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 20R DECISION: RETAINED IN PLACE, EXPLICITLY QUARANTINED.
 *
 * WHY IT LOOKS LIKE A VIOLATION BUT IS NOT:
 *
 * This function takes a SCALAR seed C and produces 72 hourly records. That is
 * mechanically the shape of the forbidden derivation
 *
 *     scalar seed → engine derives 72 hourly values
 *
 * It is retained anyway because it is a CONSTRUCTOR FOR FIXTURES, not an
 * evaluation step. The four facts that make it safe:
 *
 *   1. It is NOT called by `chart.ts` or any evaluation entry point. It has
 *      no production evaluation caller.
 *   2. It performs NO evaluation. It builds input records; it never reads them.
 *   3. Its ONLY callers are test suites and the `src/sim/**` test harness
 *      (`scenario.ts`, `generators.ts`), which exist to drive tests.
 *   4. It is NOT the BORA seed-generation contract. The canonical production
 *      concept is:
 *
 *          external chart assessment / operator
 *              → explicit HourlyCRecord[]
 *              → engine validation
 *              → exact-hour seed resolution
 *              → C distribution
 *
 *      The engine never performs the assessment. Its responsibility begins when
 *      explicit hourly seed records are supplied to it.
 *
 * WHY IT WAS NOT MOVED TO THE SIMULATION LAYER:
 *
 * Its callers span 7 files across both the engine test suites and the `src/sim`
 * harness. Moving it would churn the module graph and the import surface of
 * every one of them to express what a docstring can state. Phase 20R is a
 * broom, not a bulldozer: when a move creates more risk than the ambiguity it
 * removes, the correct action is to quarantine and document in place.
 *
 * IF YOU ARE CALLING THIS:
 *
 *   · in a test or harness — fine, that is what it is for;
 *   · in production code — that is a contract violation. Construct explicit
 *     `HourlyCRecord[]` from your assessment instead.
 *
 * ── WHAT THIS FUNCTION DOES ─────────────────────────────────────────────────
 *
 * Phase 7 (`seedHourlyRunway`) remains the authority for the VALUE and the
 * COUNT of seeded hours; this function only attaches each of those values to a
 * clock hour, which `seed.ts` explicitly leaves to the simulation layer.
 *
 * The runway is placed forward from `startHour`:
 *
 *     startHour … startHour + 71        ← seeded
 *     startHour + 72 and later         ← NOT seeded by this runway
 *
 * It is finite by construction and never regenerates itself. A song that wants
 * another runway must be passed through `createSeedRunway` again, explicitly.
 *
 * @param seedC_   Total seeded C, for this fixture only.
 * @param startHour The reference hour at which the seed fixture is created.
 * @returns 72 hour-indexed SEED records, ascending by hour.
 */
export function createSeedRunway(
  seedC_: number,
  startHour: HourIndex,
): Result<readonly HourlyCRecord[], EngineError> {
  // Phase 7 produces the 72 values. It is called, never reimplemented.
  const runway = seedHourlyRunway(seedC_);
  if (!runway.ok) {
    return { ok: false, error: runway.error };
  }

  const records: HourlyCRecord[] = runway.value.map((c, offset) => ({
    hourIndex: (startHour + offset) as HourIndex,
    c,
    // The discriminant that makes actual-replaces-seed a type-level fact.
    source: 'SEED' as const,
    lifecycle: 'ACTIVE' as RecordLifecycle,
    version: 0,
  }));

  return { ok: true, value: records };
}

/**
 * The C value that stands in for one clock hour, or null when nothing does.
 *
 * Precedence is EXACTLY the locked contract:
 *
 *     an ACTUAL bucket exists → its C (even when that C is 0)
 *     otherwise a SEED record exists → the seeded C
 *     otherwise → null, meaning C = 0
 *
 * Bucket EXISTENCE decides, not bucket value. An hour holding a real but empty
 * bucket resolves to 0 and the seed is suppressed for that hour; the seed is
 * never added to actual C, and never substituted merely because actual C
 * happened to be zero.
 *
 * @param buckets    The song's full bucket history, in any order.
 * @param seedHours  The song's hour-indexed seed runway.
 * @param hour       The clock hour to resolve.
 * @returns The resolved C, or null when the hour carries no value at all.
 */
function resolveHourC(
  buckets: readonly VoteBucket[],
  seedHours: readonly HourlyCRecord[],
  hour: HourIndex,
): Result<number, EngineError> {
  for (const bucket of buckets) {
    if (bucket.hourIndex !== hour) {
      continue;
    }

    // An actual bucket exists, so the seed is suppressed for this hour.
    const c = calculateHourlyC(bucket);
    if (!c.ok) {
      return { ok: false, error: c.error };
    }
    return { ok: true, value: c.value };
  }

  for (const record of seedHours) {
    if (record.hourIndex !== hour) {
      continue;
    }

    // ── PHASE 21 REPAIR (D-002) ───────────────────────────────────────────
    //
    // A record is only a seed if it DECLARES itself one. Provenance is read
    // from the data, never inferred from the resulting C value.
    //
    // This guard is required for the engine to be self-consistent. Phase 14's
    // `resolveHourlyC` (`chart.ts`) applies exactly this rule, and without it
    // the SAME input resolved to TWO different C values inside ONE engine:
    //
    //     song.buckets    = []
    //     song.seedHours  = [{ hourIndex: H, c: 2, source: 'ACTUAL' }]
    //
    //     evaluateChart   →  C_H = 0   (chart.ts skips non-SEED records)
    //     rolloverHour    →  C_H = 2   (this path used to honour them)
    //
    // so decay for hour H was computed from activity the chart had already
    // decided did not exist. The mathematics is unchanged by this edit: it only
    // removes the divergence, so both paths implement the single locked
    // precedence rule — actual replaces seed, and only a SEED record is a seed.
    //
    // `source` is the discriminant that makes that rule expressible at all, and
    // `HourlyCRecord` admits both values, so the guard is total.
    if (record.source !== 'SEED') {
      continue;
    }

    // No actual bucket: the seed stands in for this hour. Archived seed records
    // have left the timeline and no longer count.
    if (record.lifecycle === 'ARCHIVED') {
      return { ok: true, value: 0 };
    }
    // -- PHASE 22: the SAME validity authority as chart evaluation ---------
    //
    // Phase 22 section 7 requires that evaluation and rollover agree about
    // which seeds are legal. Before this, this path returned `record.c`
    // unchecked, so an out-of-domain seed was accepted here while
    // `chart.ts::resolveHourlyC` rejected it -- split-brain validation across
    // two paths of one engine (the D-002 class of defect, one layer down).
    //
    // Calling the same function keeps the canonical seeded-hourly-C domain
    //    finite AND >= 0 AND <= C_MAX
    // authoritative for BOTH paths.
    const validated = validateSeededHourlyC(record.c);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }
    return { ok: true, value: validated.value };
  }

  return { ok: true, value: 0 };
}

// ───────────────────────────────────────────────────────────────────────────
// PROJECTION TO PHASE 14
// ───────────────────────────────────────────────────────────────────────────

/**
 * Present a `RolloverSong` to the Phase 14 evaluator.
 *
 * ── D1 REPAIR ────────────────────────────────────────────────────────────────
 *
 * The seed runway is now passed through AS ITS TIMELINE. Previously this
 * function reduced the runway to Phase 14's per-hour SCALAR, which was
 * lossy in a way that changed the mathematics:
 *
 *   - a scalar carries no hour, so a runway covering ONE hour inside the
 *     72-hour window was indistinguishable from a runway covering ALL of it,
 *     and Phase 14 then applied the value to every unresolved hour;
 *   - a non-uniform runway could not be represented at all, so it was rejected
 *     outright as `INVALID_MEASUREMENT` even though it was perfectly valid data.
 *
 * Both failure modes are gone. Hour-indexed records ARE the representation, so
 * nothing is approximated, nothing is extrapolated, and no coverage test is
 * needed. Hourly resolution is now exact by construction.
 *
 * The runway is passed through verbatim — including ARCHIVED records, which
 * Phase 14 excludes by selection (expiry is selection, never deletion,
 * Contract 11) and which therefore remain available for audit.
 */
function toEngineSong(song: RolloverSong): Result<EngineSong, EngineError> {
  return {
    ok: true,
    value: {
      songId: song.songId,
      lifecycle: song.lifecycle,
      k: song.k,
      persistentKura: song.persistentKura,
      buckets: song.buckets,
      // The explicit timeline, verbatim. Coverage is resolved per exact hour by
      // Phase 14; nothing is collapsed, extrapolated, or regenerated here.
      seedHours: song.seedHours,
      platform: song.platform,
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// THE ROLLOVER
// ───────────────────────────────────────────────────────────────────────────

/**
 * Advance the engine by exactly one hour.
 *
 * Executes the locked sequence, in this order and no other:
 *
 *     1. evaluate the chart AT H            (pre-commitment)
 *     2. resolve C_H per ACTIVE song       (actual, else seed, else 0)
 *     3. persistentNext = (current + fresh) × (1 − D_H)   [Phase 9]
 *     4. COMMIT persistentNext into a NEW state
 *     5. advance referenceHour H → H+1
 *     6. evaluate the chart AT H+1         (sees the committed Kura)
 *
 * Step 1 precedes step 4 by contract: the chart for H describes the state as
 * committed at H. Step 2 always uses H — never H+1 — because D_h is the decay of
 * the hour that just closed.
 *
 * ONE HOUR ONLY. A caller needing H → H+3 calls this three times, so each
 * elapsed hour receives its own C and its own decay. Collapsing a multi-hour
 * gap into one cycle would decay N hours as though only one had passed.
 *
 * VAULT IS AN EXCLUSION, NEVER A RESET. A Vaulted song keeps its K, history,
 * and dormant persistent Kura, and is copied through untouched: it receives no
 * fresh Kura, no decay, and no place in either chart.
 *
 * NOTHING IS REGENERATED. The seed runway is copied verbatim; expiry removes no
 * record, it only stops that record from being selected.
 *
 * PURE: no clock, no randomness, no mutation of the input state, no global
 * state. The same input always produces an identical output.
 *
 * @param state      The committed state at `state.referenceHour`.
 * @param closedHour The hour that has just closed. Must equal the state's hour.
 * @returns The new state plus the charts at both hours, or the first error.
 */
export function rolloverHour(
  state: EngineState,
  closedHour: HourIndex,
): Result<RolloverOutcome, EngineError> {
  // 0. The hour being closed must be the state's own reference hour. Rollover
  //    advances exactly one hour and cannot be asked to invent or skip one.
  if (closedHour !== state.referenceHour) {
    return {
      ok: false,
      error: {
        code: 'INVALID_MEASUREMENT',
        message:
          'closedHour must equal the state referenceHour. Rollover advances ' +
          'exactly one hour and never skips or invents one.',
        context: {
          closedHour: String(closedHour),
          referenceHour: String(state.referenceHour),
        },
      },
    };
  }

  const window = getActiveWindow(closedHour);
  if (!window.ok) {
    return { ok: false, error: window.error };
  }

  // 1. THE CHART AT H, before any commitment.
  const projected: EngineSong[] = [];

  for (const song of state.songs) {
    const view = toEngineSong(song);
    if (!view.ok) {
      return { ok: false, error: view.error };
    }
    projected.push(view.value);
  }

  const chartAtClosed = evaluateChart({
    songs: projected,
    referenceHour: closedHour,
    closedHourC: null,
  });
  if (!chartAtClosed.ok) {
    return { ok: false, error: chartAtClosed.error };
  }

  const nextHour = (closedHour + 1) as HourIndex;
  const steps: RolloverStep[] = [];
  const nextSongs: RolloverSong[] = [];

  for (const song of state.songs) {
    // VAULT: copied through untouched. No decay, no injection, no deletion.
    if (song.lifecycle === 'VAULT') {
      nextSongs.push(song);
      continue;
    }

    // 2. Resolve C of the hour that JUST CLOSED — never H+1's.
    const closedC = resolveHourC(song.buckets, song.seedHours, closedHour);
    if (!closedC.ok) {
      return { ok: false, error: closedC.error };
    }

    // 3. Fresh Kura, read from the H evaluation.
    const entry = chartAtClosed.value.active.find((e) => e.songId === song.songId);
    if (!entry) {
      return {
        ok: false,
        error: {
          code: 'INVALID_MEASUREMENT',
          message: 'Evaluation returned no entry for an ACTIVE song.',
          context: { songId: song.songId },
        },
      };
    }

    // 4. Phase 9 owns the recurrence. Injection precedes decay. The trace
    //    carries D_h itself, so the step records the coefficient exactly as
    //    Phase 9 computed it — never the amount removed.
    const updated = updatePersistentKuraWithTrace(
      song.persistentKura,
      entry.kuraFresh,
      closedC.value,
    );
    if (!updated.ok) {
      return { ok: false, error: updated.error };
    }

    // 5. COMMIT into a NEW song object. The input song is never touched.
    nextSongs.push({ ...song, persistentKura: updated.value.persistentAfter });

    steps.push({
      songId: song.songId,
      hourClosed: closedHour,
      closedHourC: closedC.value,
      freshInjected: entry.kuraFresh,
      // The D_h coefficient documented on the interface — not the amount
      // removed, which is `before + fresh − persistentAfter`.
      decayRate: updated.value.decayRate,
      persistentBefore: song.persistentKura,
      persistentAfter: updated.value.persistentAfter,
    });
  }

  // 6. Advance the reference hour. Buckets and seed records are carried over
  //    untouched — expiry is selection, never deletion (Contract 11).
  const nextState: EngineState = { referenceHour: nextHour, songs: nextSongs };

  // 7. The chart AT H+1, which now sees the committed persistent Kura.
  const nextWindow = getActiveWindow(nextHour);
  if (!nextWindow.ok) {
    return { ok: false, error: nextWindow.error };
  }

  const nextProjected: EngineSong[] = [];

  for (const song of nextSongs) {
    const view = toEngineSong(song);
    if (!view.ok) {
      return { ok: false, error: view.error };
    }
    nextProjected.push(view.value);
  }

  const chartAtNext = evaluateChart({
    songs: nextProjected,
    referenceHour: nextHour,
    closedHourC: null,
  });
  if (!chartAtNext.ok) {
    return { ok: false, error: chartAtNext.error };
  }

  return {
    ok: true,
    value: {
      fromHour: closedHour,
      toHour: nextHour,
      state: nextState,
      chartAtClosedHour: chartAtClosed.value,
      chartAtNextHour: chartAtNext.value,
      steps,
    },
  };
}
