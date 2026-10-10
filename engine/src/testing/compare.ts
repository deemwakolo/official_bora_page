/**
 * BORA Engine — numerical comparison helpers
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Implements A9 exactly:
 *   - Distribution invariants use ε = 1e-9.
 *   - Seed exactness uses ε = 1e-6.
 *   - Where exact integer/rational comparison is possible, prefer it over any
 *     epsilon (see `expectExactHalf`, `expectExactQuarter`).
 *
 * These helpers exist so the tolerance policy is enforced in ONE place and no
 * test silently invents its own epsilon.
 */

import { expect } from 'vitest';
import {
  EPSILON_SUM,
  EPSILON_SEED,
  EXACT_COMPARISON_TOLERANCE,
} from '../engine/constants';

/**
 * Approximate equality for distribution invariants (A9 default).
 * Use for ΣXP, ΣkuraFresh, platform allocations.
 */
export function expectClose(
  actual: number,
  expected: number,
  epsilon: number = EPSILON_SUM,
): void {
  expect(
    Math.abs(actual - expected),
    `expected ${actual} to be within ${epsilon} of ${expected} (delta ${
      Math.abs(actual - expected)
    })`,
  ).toBeLessThanOrEqual(epsilon);
}

/**
 * Approximate equality for seed exactness at extreme p (A9).
 * Tighter than expectClose, and deliberately named differently so the intent
 * is visible at the call site.
 *
 * ── QUARANTINED, PHASE 23 ─────────────────────────────────────────────────────
 *
 * This helper has NO remaining caller. It exists solely to apply `EPSILON_SEED`
 * (1e-6), the tolerance that Phase 22 RETIRED when it bounded seed C to
 * `[0, C_MAX]`. Its premise — "seed arithmetic is ill-conditioned, so compare
 * loosely" — is now false: every accepted seed is well conditioned and the
 * ordinary 1e-9 is sufficient.
 *
 * It is retained rather than deleted so its retirement is auditable, and so a
 * future change that genuinely needs a second tolerance must justify it here
 * rather than invent it. DO NOT add new call sites without a ruling that makes
 * the contract ill-conditioned again.
 */
export function expectSeedClose(actual: number, expected: number): void {
  expect(
    Math.abs(actual - expected),
    `seed exactness: expected ${actual} to be within ${EPSILON_SEED} of ${expected}`,
  ).toBeLessThanOrEqual(EPSILON_SEED);
}

/**
 * Exact equality, per A9's "prefer exact comparison where possible".
 * Also guards against NaN, which would defeat a naive `toBe` check.
 */
export function expectExact(actual: number, expected: number): void {
  expect(Number.isNaN(actual)).toBe(false);
  expect(actual).toBe(expected);
}

/** Values the engine produces on the 0.5 lattice (C for 1–4 downvotes). */
export function expectExactHalf(actual: number): void {
  expectExact(actual * 2 - Math.trunc(actual * 2), 0);
}

/** Values the engine produces on the 0.25 lattice (decay percentages). */
export function expectExactQuarter(actual: number): void {
  expectExact(actual * 4 - Math.trunc(actual * 4), 0);
}

/** Assert a value is finite and not NaN. Catches silent float corruption. */
export function expectFinite(actual: number, label = 'value'): void {
  expect(Number.isFinite(actual), `${label} must be finite, got ${actual}`).toBe(true);
}

/**
 * Assert a value is in [min, max] inclusive.
 * Used for C >= 0, XP in [0,1], and every "never negative" requirement.
 */
export function expectInRange(
  actual: number,
  min: number,
  max: number,
  label = 'value',
): void {
  expect(
    actual >= min && actual <= max,
    `${label} must be within [${min}, ${max}], got ${actual}`,
  ).toBe(true);
}

/** Assert a value is strictly greater than or equal to zero. */
export function expectNonNegative(actual: number, label = 'value'): void {
  expect(actual >= 0, `${label} must be >= 0, got ${actual}`).toBe(true);
}

/**
 * Sum a list of numbers and compare to an expected total.
 * The workhorse for every distribution invariant in the spec.
 */
export function expectSumClose(
  values: readonly number[],
  expected: number,
  epsilon: number = EPSILON_SUM,
): void {
  const total = values.reduce((acc, v) => acc + v, 0);
  expect(
    Math.abs(total - expected),
    `Σ of ${values.length} values = ${total}, expected ${expected} (delta ${
      Math.abs(total - expected)
    })`,
  ).toBeLessThanOrEqual(epsilon);
}

/** Sanity-check that a test is using a real tolerance, not a zero epsilon. */
export function expectToleranceIsReal(epsilon: number): void {
  expect(epsilon).toBeGreaterThan(EXACT_COMPARISON_TOLERANCE);
}
