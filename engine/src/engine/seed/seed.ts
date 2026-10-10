/**
 * BORA Engine -- seed C validity and the canonical SEEDED HOURLY C DOMAIN
 * ==========================================================================
 *
 * PHASE 22 -- D-001 RULING IMPLEMENTED HERE.
 *
 * ── THE CANONICAL SEEDED HOURLY C DOMAIN ─────────────────────────────────────
 *
 * An explicit seeded hourly C is valid IFF it is finite and lies in the CLOSED
 * interval [0, C_MAX], where C_MAX = 2.
 *
 *     0 <= C_seed <= C_MAX        (C_MAX = 2)
 *
 * `validateSeededHourlyC` below is the ONE authority for that rule. Every place
 * an explicit seed record crosses into engine processing calls it. There is no
 * second gate, and no path that validates a seed differently from another.
 *
 * WHY THE UPPER BOUND EXISTS -- this is a CONTRACT CLARIFICATION, not a formula
 * change. The decay equation is
 *
 *     D_h = 0.0025 * (1 - C_h / 2)
 *
 * so C_h > 2 makes D_h NEGATIVE, which turns "decay" into GROWTH and contradicts
 * the semantic role of the coefficient. Seed values are bounded by the
 * structural maximum hourly C of the BORA activity model, so the decay equation
 * can never change species.
 *
 * The domain is CONTINUOUS on [0, 2], not the five-point threshold lattice:
 *
 *     actual, vote-derived C  lies on  {0, 0.5, 1, 1.5, 2}
 *     seeded C                may be ANY finite real in [0, 2]   e.g. 1.25
 *
 * ── WHAT WAS REMOVED IN PHASE 22, AND WHY ────────────────────────────────────
 *
 * The old validity gate validated a per-hour value by ROUND-TRIPPING it through
 * a scalar:
 *
 *     seedCPerHour(record.c * 72)   ->   (record.c * 72) / 72
 *
 * intending `c * 72 / 72 === c`. That is not an identity at the top of the
 * double range: `(Number.MAX_VALUE / 72) * 72` is Infinity. The round trip
 * therefore imposed an ARTIFICIAL boundary at MAX_VALUE/72 (~2.5e306) that
 * appeared nowhere in the contract, and it did so at the cost of multiplying an
 * input by 72 purely to check it.
 *
 * The canonical validation now inspects the supplied hourly value DIRECTLY:
 *
 *     Number.isFinite(c) AND c >= 0 AND c <= C_MAX
 *
 * No multiplication, no division, no derived boundary.
 *
 * ── WHAT REMAINS, AND WHY ────────────────────────────────────────────────────
 *
 * `seedCPerHour` and `seedHourlyRunway` remain as TEST / HARNESS FIXTURE
 * constructors. They spread a fixture TOTAL across the 72-hour runway, which is
 * exactly what the ratified contract forbids the ENGINE to do during evaluation.
 * Neither is reachable from chart evaluation: `chart.ts` calls
 * `validateSeededHourlyC` and nothing else.
 *
 * They are nevertheless bounded, because a fixture constructor that can emit a
 * seed record outside the canonical domain is a fixture that manufactures
 * invalid engine input. Their totals are therefore capped at
 * `SEED_RUNWAY_HOURS * C_MAX` (= 144), which is precisely the condition under
 * which every per-hour share lands inside [0, C_MAX].
 *
 * PURE: no mutation, no clock, no randomness, no global state, no AI, no
 * network, no simulation state, no React.
 */

import { SEED_RUNWAY_HOURS, C_MAX } from '../constants';
import type { Result, EngineError } from '../types';

/**
 * THE canonical seeded-hourly-C validity gate.
 *
 *     valid  <=>  Number.isFinite(c) AND c >= 0 AND c <= C_MAX
 *
 * This is the single authority required by Phase 22 section 7. Both
 * `chart.ts` (evaluation) and `rollover.ts` (the hourly transition) call THIS
 * function, so the two paths cannot drift apart again -- the failure mode that
 * produced discrepancy D-002.
 *
 * A rejected value is REJECTED, never clamped. Clamping a seed above C_MAX down
 * to C_MAX would silently invent a different chart, and clamping a negative
 * seed up to 0 would silently invent an hour of measured activity.
 *
 * @param c The supplied per-hour seeded C. Not modified.
 * @returns The value itself, or INVALID_MEASUREMENT.
 */
export function validateSeededHourlyC(c: number): Result<number, EngineError> {
  if (!Number.isFinite(c) || c < 0 || c > C_MAX) {
    return {
      ok: false,
      error: {
        code: 'INVALID_MEASUREMENT',
        message:
          'Seeded hourly C must be finite and within [0, C_MAX], where ' +
          'C_MAX = 2. Seed values are bounded by the structural maximum ' +
          'hourly C of the BORA activity model: a seed above C_MAX would make ' +
          'the decay rate negative and turn decay into growth. Rejected ' +
          'rather than clamped, so a fabricated seed can never enter the chart.',
        context: { c: String(c), cMax: String(C_MAX) },
      },
    };
  }

  return { ok: true, value: c };
}

/**
 * The largest TOTAL a fixture runway may be spread from.
 *
 *     SEED_RUNWAY_HOURS * C_MAX  =  72 * 2  =  144
 *
 * Above this, the uniform per-hour share would exceed C_MAX and the resulting
 * records would be outside the canonical seed domain.
 */
export const MAX_SEED_FIXTURE_TOTAL = SEED_RUNWAY_HOURS * C_MAX;

/**
 * Validate a fixture seed TOTAL and return the value each runway hour shares.
 *
 * TEST / HARNESS FIXTURE ONLY (Phase 20R, Phase 22). This is a convenience for
 * building fixtures, not a seed contract: it takes a SCALAR and spreads it over
 * 72 hours, which is precisely what the ratified contract forbids the engine to
 * do during evaluation. It must never be reachable from `chart.ts`.
 *
 * The bound is on the TOTAL, expressed through the per-hour share: a total is
 * usable exactly when `total / 72` lands inside [0, C_MAX].
 *
 * @param seedC_ Total seeded C for the fixture.
 * @returns The value each runway hour contributes, or an error.
 */
export function seedCPerHour(seedC_: number): Result<number, EngineError> {
  if (!Number.isFinite(seedC_) || seedC_ < 0 || seedC_ > MAX_SEED_FIXTURE_TOTAL) {
    return {
      ok: false,
      error: {
        code: 'INVALID_MEASUREMENT',
        message:
          'Fixture seed total must be finite, non-negative, and at most ' +
          'SEED_RUNWAY_HOURS * C_MAX (' + MAX_SEED_FIXTURE_TOTAL + '), so ' +
          'that every per-hour share lies inside the canonical seed domain ' +
          '[0, C_MAX].',
        context: { seedC: String(seedC_), maxTotal: String(MAX_SEED_FIXTURE_TOTAL) },
      },
    };
  }

  return { ok: true, value: seedC_ / SEED_RUNWAY_HOURS };
}

/**
 * A flat 72-entry array of seeded values.
 *
 * TEST / HARNESS FIXTURE ONLY (Phase 20R, Phase 22).
 *
 * The entries are ordered but carry no hour index here: attaching clock hours
 * belongs to the simulation layer, which knows the reference hour. This module
 * stays free of time.
 *
 * Every emitted value is checked against the canonical seeded-hourly-C domain,
 * so this constructor cannot produce engine input the engine would reject.
 *
 * @param seedC_ Total seeded C for the fixture.
 * @returns An array of 72 uniform hourly values, each within [0, C_MAX].
 */
export function seedHourlyRunway(
  seedC_: number,
): Result<number[], EngineError> {
  const perHour = seedCPerHour(seedC_);
  if (!perHour.ok) {
    return { ok: false, error: perHour.error };
  }

  const validated = validateSeededHourlyC(perHour.value);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }

  return {
    ok: true,
    value: Array.from({ length: SEED_RUNWAY_HOURS }, () => validated.value),
  };
}