/**
 * BORA Engine — persistent Kura and hourly decay
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 9. The persistent-Kura half of the Kura model (A1).
 *
 *   D_h = 0.25% × (1 − C_h / 2)
 *   persistent_next = (persistent_current + fresh_for_cycle) × (1 − D_h)
 *
 * ── THE ORDERING IS THE WHOLE POINT (A1, locked) ─────────────────────────
 *
 *   Fresh Kura is injected BEFORE decay, so the newly injected amount is
 *   itself subject to that cycle's decay:
 *
 *       persistent_next = (persistent + fresh) × (1 − D_h)      ✓ locked
 *       persistent_next = persistent × (1 − D_h) + fresh        ✗ rejected
 *
 *   The two differ whenever D_h ≠ 0. The second form would let a song's fresh
 *   Kura bypass decay entirely on the cycle it was earned, which is precisely
 *   the mechanism A1 exists to prevent. A dedicated test proves the
 *   implementation does not compute the rejected form.
 *
 * ── DECAY IS APPLIED EXACTLY ONCE (A3) ────────────────────────────────────
 *
 *   These functions are PURE. They hold no state, remember nothing, and never
 *   decide whether a cycle has already run. The simulation layer owns the
 *   clock and decides when a rollover happens; this module only answers "given
 *   these numbers, what is the next number?".
 *
 * ── WHICH C_h ─────────────────────────────────────────────────────────────
 *
 *   The caller supplies the C of the hour that has JUST CLOSED (A3). This
 *   module never recomputes C and never inspects buckets or votes — the
 *   threshold module owns that. It only guards its own boundary: C must lie
 *   in [0, C_MAX]. Upstream guarantees the 0.5 lattice {0, 0.5, 1, 1.5, 2};
 *   validating the enclosing range here means a corrupt C cannot silently
 *   produce a negative decay and INCREASE a balance.
 *
 * ── NO PLATFORM DECAY (A4) ────────────────────────────────────────────────
 *
 *   This module touches persistent Kura only. YT/SP/BP points are recomputed
 *   from the active 7-day window and are never decayed.
 *
 * PURE: no mutation, no clock, no randomness, no lifecycle, no simulation
 * state, no React, no Supabase, no network, no AI.
 */

import { DECAY_NUMERATOR, C_MAX, KURA_TOTAL } from '../constants';
import type { Result, EngineError } from '../types';

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION
// ───────────────────────────────────────────────────────────────────────────

/** A finite, non-negative number. */
function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Valid closed-hour C. The upstream lattice is {0, 0.5, 1, 1.5, 2}; only the
 * enclosing range [0, C_MAX] is enforced here, so this module does not
 * duplicate the threshold module's own granularity rules.
 */
function isValidClosedHourC(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= C_MAX;
}

/**
 * Build a rejection for an out-of-range value.
 *
 * Generic over the success type so the same helper serves both the scalar
 * functions (`calculateDecay`) and the trace function
 * (`updatePersistentKuraWithTrace`) without a cast at either call site.
 */
function invalidMeasurement<T>(
  field: string,
  value: number,
  requirement: string,
): Result<T, EngineError> {
  return {
    ok: false,
    error: {
      code: 'INVALID_MEASUREMENT',
      message:
        `${field} must be ${requirement}. Rejected rather than clamped: ` +
        'clamping a Kura or C value would silently invent chart state.',
      context: { [field]: String(value) },
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// DECAY
// ───────────────────────────────────────────────────────────────────────────

/**
 * Hourly decay rate for a just-closed hour.
 *
 *   D_h = 0.25% × (1 − C_h / 2)
 *
 * Monotone decreasing in C_h:
 *
 *     C_h = 0    →  D_h = 0.0025    (maximum decay, a dead hour)
 *     C_h = 0.5  →  D_h = 0.001875
 *     C_h = 1    →  D_h = 0.00125
 *     C_h = 1.5  →  D_h = 0.000625
 *     C_h = 2    →  D_h = 0         (a fully active hour decays not at all)
 *
 * All five lattice values are exactly representable in IEEE-754, so these
 * results are exact rather than merely close (A9: prefer exact comparison).
 *
 * @param closedHourC C of the hour that just closed, in [0, C_MAX].
 * @returns D_h, or INVALID_MEASUREMENT.
 */
export function calculateDecay(
  closedHourC: number,
): Result<number, EngineError> {
  if (!isValidClosedHourC(closedHourC)) {
    return invalidMeasurement(
      'closedHourC',
      closedHourC,
      `a finite number within [0, ${C_MAX}]`,
    );
  }

  return { ok: true, value: DECAY_NUMERATOR * (1 - closedHourC / C_MAX) };
}

// ───────────────────────────────────────────────────────────────────────────
// PERSISTENT KURA
// ───────────────────────────────────────────────────────────────────────────

/**
 * One hourly persistent-Kura update (A1, A3).
 *
 *   persistent_next = (persistent_current + fresh_for_cycle) × (1 − D_h)
 *
 * Injection happens BEFORE decay, so `freshKura` is itself decayed by this
 * cycle's D_h. Both inputs are non-negative, so the result is non-negative
 * and can never exceed `persistentCurrent + freshKura`.
 *
 * @param persistentCurrent The existing persistent balance, >= 0.
 * @param freshKura         Fresh Kura injected this cycle, >= 0.
 * @param closedHourC       C of the just-closed hour, in [0, C_MAX].
 * @returns The next persistent balance, or INVALID_MEASUREMENT.
 */
export function updatePersistentKura(
  persistentCurrent: number,
  freshKura: number,
  closedHourC: number,
): Result<number, EngineError> {
  const step = updatePersistentKuraWithTrace(
    persistentCurrent,
    freshKura,
    closedHourC,
  );
  if (!step.ok) {
    return { ok: false, error: step.error };
  }
  return { ok: true, value: step.value.persistentAfter };
}

/**
 * The full-cycle trace for one song, for observability (Contract Phase 48).
 *
 * Returns the intermediate values the single-step function computes
 * internally, so the formula inspector can show the work instead of asking a
 * reader to trust a bare number.
 */
export interface PersistentKuraStep {
  readonly persistentBefore: number;
  readonly freshInjected: number;
  /** persistentBefore + freshInjected, before any decay. */
  readonly preDecay: number;
  readonly decayRate: number;
  readonly persistentAfter: number;
  /** Amount removed by decay this cycle. */
  readonly decayed: number;
}

/**
 * The same update as `updatePersistentKura`, returning the full breakdown.
 *
 * Exactly equivalent — `updatePersistentKura` delegates here — so a caller can
 * never obtain two different answers from the two APIs.
 */
export function updatePersistentKuraWithTrace(
  persistentCurrent: number,
  freshKura: number,
  closedHourC: number,
): Result<PersistentKuraStep, EngineError> {
  if (!isNonNegativeFinite(persistentCurrent)) {
    return invalidMeasurement<PersistentKuraStep>(
      'persistentCurrent',
      persistentCurrent,
      'a finite, non-negative number',
    );
  }

  if (!isNonNegativeFinite(freshKura)) {
    return invalidMeasurement<PersistentKuraStep>(
      'freshKura',
      freshKura,
      'a finite, non-negative number',
    );
  }

  const decay = calculateDecay(closedHourC);
  if (!decay.ok) {
    return { ok: false, error: decay.error };
  }

  const preDecay = persistentCurrent + freshKura;
  const persistentAfter = preDecay * (1 - decay.value);

  return {
    ok: true,
    value: {
      persistentBefore: persistentCurrent,
      freshInjected: freshKura,
      preDecay,
      decayRate: decay.value,
      persistentAfter,
      decayed: preDecay - persistentAfter,
    },
  };
}

/**
 * The maximum possible fresh Kura for one song.
 *
 * Exported so a caller composing Phase 8 output with this module has a single
 * named source for the ceiling rather than re-deriving 50 inline.
 */
export const MAX_FRESH_KURA = KURA_TOTAL;