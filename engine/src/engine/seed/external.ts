/**
 * BORA Engine — external strength (E) and target share (p)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠ LEGACY — QUARANTINED IN PHASE 20R. NOT PRODUCTION. NOT PART OF THE SEED
 *   CONTRACT. NOTHING HERE IS REACHABLE FROM CHART EVALUATION. ⚠
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * CLASSIFICATION (from the Phase 20R dependency audit):
 *
 *   Category B — required only by tests/harness.
 *   Production evaluation callers: NONE.
 *   Callers found: `external.test.ts`, `sim/attack/math.test.ts`,
 *   `sim/attack/temporal.test.ts`, and `testing/invariants.ts` (which asserts
 *   only that EXTERNAL_WEIGHTS equals PLATFORM_WEIGHTS / PLATFORM_TOTAL).
 *
 * WHY RETAINED INSTEAD OF DELETED:
 *
 * Deleting this module would cascade through 5 further files — including a
 * shared testing helper and an invariant that documents a weight identity —
 * and would destroy 29 tests. Phase 20R is a broom, not a bulldozer: where
 * removal creates more churn than the ambiguity it removes, quarantine and
 * document is the correct action. The symbols below are therefore KEPT AS
 * LEGACY, not as supported production API.
 *
 * WHY IT IS LEGACY:
 *
 * This module computes a TARGET SHARE `p` for the retired formula
 * `C_seed = (p / (1 − p)) × T_C`. Phase 20R removed that formula. With it gone,
 * this module has no consumer: the ratified seed contract is
 *
 *     external chart assessment / operator
 *         → explicit hourly `HourlyCRecord[]`
 *         → engine validation
 *         → exact-hour seed resolution
 *         → C distribution
 *
 * The engine no longer turns a number into a seed. It is handed explicit hourly
 * values. Nothing downstream consumes E or p.
 *
 * It is retained so that the weight identity remains auditable and so the
 * retirement is reversible, NOT because any current contract requires it.
 *
 * ── LEGACY SYMBOLS DEFINED HERE ──────────────────────────────────────────────
 *   · `externalStrength`                LEGACY, harness-only
 *   · `externalStrengthToTargetShare`   LEGACY, harness-only
 *   · `targetShareFromExternal`         LEGACY, harness-only
 *   · `EXTERNAL_WEIGHTS`                LEGACY constant (in `constants.ts`)
 *
 * Do not call any of these from production code, and do not cite them as
 * evidence that the engine derives seed values from external popularity. It
 * does not, and has not since the seed contract was ratified.
 *
 * ── HISTORICAL FORMULAS (kept for the record; not used by any live path) ─────
 *
 * PHASE 7. Converts normalised EXTERNAL platform measurements into the target
 * C share used to seed a newly entered song.
 *
 *   E = 0.60 × YT_ext + 0.30 × SP_ext + 0.10 × BP_ext
 *   p = E                       (Contract 13 — superseded)
 *
 * THE COEFFICIENTS WERE NOT ARBITRARY. They are exactly
 * `PLATFORM_WEIGHTS / PLATFORM_TOTAL` — 30/50, 15/50, 5/50 — which is why
 * locking `p = E` was structurally coherent. `testing/invariants.ts` still
 * asserts that identity so a future weight edit cannot silently invalidate it.
 *
 * DOMAIN: every external input is in [0, 1). Since the coefficients sum to
 * exactly 1, E is therefore in [0, 1) too.
 *
 * PURE: no mutation, no clock, no randomness, no AI, no network, no
 * simulation state, no React.
 */

import {
  EXTERNAL_WEIGHTS,
  EXTERNAL_INPUT_MIN,
  EXTERNAL_INPUT_MAX_EXCLUSIVE,
  TARGET_SHARE_MIN,
  TARGET_SHARE_MAX_EXCLUSIVE,
} from '../constants';
import type { ExternalInput, Result, EngineError, PlatformId } from '../types';

/** Valid external inputs are finite and within [0, 1). */
function isValidExternalValue(value: number): boolean {
  return (
    Number.isFinite(value) &&
    value >= EXTERNAL_INPUT_MIN &&
    value < EXTERNAL_INPUT_MAX_EXCLUSIVE
  );
}

function invalidExternalInput(
  field: PlatformId,
  value: number,
): Result<number, EngineError> {
  return {
    ok: false,
    error: {
      code: 'INVALID_EXTERNAL_INPUT',
      message:
        `External ${field} measurement must be a finite number in [0, 1). ` +
        'Rejected rather than clamped: pinning an out-of-range value to 0.99 ' +
        'would silently invent a seed target the contract does not allow.',
      context: { [field]: String(value) },
    },
  };
}

/**
 * External strength.
 *
 *   E = 0.60 × YT_ext + 0.30 × SP_ext + 0.10 × BP_ext
 *
 * Every input must be finite and within [0, 1). The result is then range
 * checked against 1 as well: floating-point arithmetic on three values each
 * just under 1 can round up to exactly 1, and E = 1 is undefined downstream.
 *
 * @param input Normalised external measurements.
 * @returns E in [0, 1), or INVALID_EXTERNAL_INPUT.
 */
export function externalStrength(
  input: ExternalInput,
): Result<number, EngineError> {
  for (const field of ['youtube', 'spotify', 'boomplay'] as const) {
    const value = input[field];
    if (!isValidExternalValue(value)) {
      return invalidExternalInput(field, value);
    }
  }

  const e =
    EXTERNAL_WEIGHTS.youtube * input.youtube +
    EXTERNAL_WEIGHTS.spotify * input.spotify +
    EXTERNAL_WEIGHTS.boomplay * input.boomplay;

  // Defensive upper bound. With valid inputs the coefficients sum to exactly
  // 1, so E < 1 mathematically; this guards the floating-point edge where
  // three values just below 1 could round up to exactly 1.
  if (!Number.isFinite(e) || e < TARGET_SHARE_MIN || e >= TARGET_SHARE_MAX_EXCLUSIVE) {
    return {
      ok: false,
      error: {
        code: 'INVALID_EXTERNAL_INPUT',
        message:
          'External strength must lie in [0, 1). E >= 1 is undefined because ' +
          'the seed formula divides by (1 - p); rejected, never clamped.',
        context: { e: String(e) },
      },
    };
  }

  return { ok: true, value: e };
}

/**
 * Map external strength to the target initial C share.
 *
 *   p = E        (Contract 13 — locked, with no free parameter)
 *
 * Kept as its own exported function rather than folded into `externalStrength`
 * so the E → p mapping can be tested and inspected independently, exactly as
 * the plan requires ("This lets us test the mapping independently").
 *
 * No free coefficient is introduced here. p = E is the whole rule.
 *
 * @param e External strength, expected in [0, 1).
 * @returns The target share p, or an error if E is out of range.
 */
export function externalStrengthToTargetShare(
  e: number,
): Result<number, EngineError> {
  if (!Number.isFinite(e) || e < TARGET_SHARE_MIN) {
    return {
      ok: false,
      error: {
        code: 'INVALID_TARGET_SHARE_RANGE',
        message:
          'Target share must be a finite number in [0, 1). A negative share ' +
          'is not meaningful and is rejected rather than coerced.',
        context: { e: String(e) },
      },
    };
  }

  if (e >= TARGET_SHARE_MAX_EXCLUSIVE) {
    return {
      ok: false,
      error: {
        code: 'INVALID_TARGET_SHARE',
        message:
          'Target share p = 1 is undefined: C_seed = p/(1-p) * T_C diverges. ' +
          'Rejected rather than clamped to a nearby ceiling.',
        context: { e: String(e) },
      },
    };
  }

  return { ok: true, value: e };
}

/**
 * Convenience: external measurements straight to a target share.
 *
 * Composition of `externalStrength` and `externalStrengthToTargetShare`, so a
 * caller performing the full entry calculation does not have to wire the two
 * steps together by hand.
 *
 * @param input Normalised external measurements.
 * @returns p = E, or the first error encountered.
 */
export function targetShareFromExternal(
  input: ExternalInput,
): Result<number, EngineError> {
  const e = externalStrength(input);
  if (!e.ok) {
    return { ok: false, error: e.error };
  }
  return externalStrengthToTargetShare(e.value);
}