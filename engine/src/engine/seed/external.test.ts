/**
 * BORA Engine — external strength tests (Phase 7)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   E-T  the E formula and its exact 0.60 / 0.30 / 0.10 coefficients
 *   E-B  input validation and the E >= 1 boundary
 *   E-P  the E → p mapping
 */

import { describe, it, expect } from 'vitest';
import {
  externalStrength,
  externalStrengthToTargetShare,
  targetShareFromExternal,
} from './external';
import { EXTERNAL_WEIGHTS, PLATFORM_WEIGHTS, PLATFORM_TOTAL } from '../constants';
import type { ExternalInput } from '../types';

const input = (
  youtube: number,
  spotify: number,
  boomplay: number,
): ExternalInput => ({ youtube, spotify, boomplay });

function eOf(y: number, s: number, b: number): number {
  const r = externalStrength(input(y, s, b));
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

function errOf(y: number, s: number, b: number): string {
  const r = externalStrength(input(y, s, b));
  if (r.ok) throw new Error(`expected rejection, got E = ${r.value}`);
  return r.error.code;
}

// ───────────────────────────────────────────────────────────────────────────

describe('E-T: external strength E', () => {
  it('is 0 when all external inputs are 0', () => {
    expect(eOf(0, 0, 0)).toBe(0);
  });

  it('weights YouTube at 0.60', () => {
    // Inputs stay strictly below 1, because 1 is outside the valid domain.
    expect(eOf(0.5, 0, 0)).toBeCloseTo(0.3, 12);
    expect(eOf(0.99, 0, 0)).toBeCloseTo(0.594, 12);
    expect(EXTERNAL_WEIGHTS.youtube).toBe(0.6);
  });

  it('weights Spotify at 0.30', () => {
    expect(eOf(0, 0.5, 0)).toBeCloseTo(0.15, 12);
    expect(eOf(0, 0.99, 0)).toBeCloseTo(0.297, 12);
    expect(EXTERNAL_WEIGHTS.spotify).toBe(0.3);
  });

  it('weights Boomplay at 0.10', () => {
    expect(eOf(0, 0, 0.5)).toBeCloseTo(0.05, 12);
    expect(eOf(0, 0, 0.99)).toBeCloseTo(0.099, 12);
    expect(EXTERNAL_WEIGHTS.boomplay).toBe(0.1);
  });

  it('combines all three additively', () => {
    // 0.6*0.5 + 0.3*0.25 + 0.1*0.75 = 0.3 + 0.075 + 0.075 = 0.45
    expect(eOf(0.5, 0.25, 0.75)).toBeCloseTo(0.45, 12);
  });

  it('uses coefficients identical to PLATFORM_WEIGHTS / PLATFORM_TOTAL', () => {
    // This identity is WHY p = E is coherent. Asserted, not assumed.
    expect(EXTERNAL_WEIGHTS.youtube).toBe(PLATFORM_WEIGHTS.youtube / PLATFORM_TOTAL);
    expect(EXTERNAL_WEIGHTS.spotify).toBe(PLATFORM_WEIGHTS.spotify / PLATFORM_TOTAL);
    expect(EXTERNAL_WEIGHTS.boomplay).toBe(PLATFORM_WEIGHTS.boomplay / PLATFORM_TOTAL);
  });

  it('makes each platform independently movable', () => {
    // Only YouTube non-zero.
    expect(eOf(0.8, 0, 0)).toBeCloseTo(0.48, 12);
    // Only Spotify non-zero.
    expect(eOf(0, 0.8, 0)).toBeCloseTo(0.24, 12);
    // Only Boomplay non-zero.
    expect(eOf(0, 0, 0.8)).toBeCloseTo(0.08, 12);
  });

  it('approaches 1 from below but never reaches it', () => {
    const near = eOf(0.999999, 0.999999, 0.999999);
    expect(near).toBeLessThan(1);
    expect(near).toBeCloseTo(0.999999, 9);
  });

  it('is deterministic across repeated evaluation', () => {
    const first = eOf(0.3, 0.4, 0.5);
    for (let i = 0; i < 20; i++) {
      expect(eOf(0.3, 0.4, 0.5)).toBe(first);
    }
  });

  it('does not mutate its input', () => {
    const snapshot = { ...input(0.3, 0.4, 0.5) };
    externalStrength(snapshot);
    expect(snapshot).toEqual({ youtube: 0.3, spotify: 0.4, boomplay: 0.5 });
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('E-B: external input validation', () => {
  it('rejects negative inputs', () => {
    expect(errOf(-0.1, 0, 0)).toBe('INVALID_EXTERNAL_INPUT');
    expect(errOf(0, -1, 0)).toBe('INVALID_EXTERNAL_INPUT');
    expect(errOf(0, 0, -0.5)).toBe('INVALID_EXTERNAL_INPUT');
  });

  it('rejects inputs at or above 1', () => {
    expect(errOf(1, 0, 0)).toBe('INVALID_EXTERNAL_INPUT');
    expect(errOf(0, 1, 0)).toBe('INVALID_EXTERNAL_INPUT');
    expect(errOf(0, 0, 1)).toBe('INVALID_EXTERNAL_INPUT');
    expect(errOf(1.5, 0, 0)).toBe('INVALID_EXTERNAL_INPUT');
  });

  it('rejects non-finite inputs', () => {
    expect(errOf(Number.NaN, 0, 0)).toBe('INVALID_EXTERNAL_INPUT');
    expect(errOf(0, Number.NaN, 0)).toBe('INVALID_EXTERNAL_INPUT');
    expect(errOf(0, 0, Number.NaN)).toBe('INVALID_EXTERNAL_INPUT');
    expect(errOf(Number.POSITIVE_INFINITY, 0, 0)).toBe('INVALID_EXTERNAL_INPUT');
    expect(errOf(0, 0, Number.NEGATIVE_INFINITY)).toBe('INVALID_EXTERNAL_INPUT');
  });

  it('accepts values arbitrarily close to 1 but below it', () => {
    const r = externalStrength(input(0.999999999, 0, 0));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeLessThan(1);
  });

  it('never clamps an invalid input into the valid range', () => {
    // 1.0 must NOT become 0.99, and -0.5 must NOT become 0.
    const over = externalStrength(input(1, 0, 0));
    const under = externalStrength(input(-0.5, 0, 0));
    expect(over.ok).toBe(false);
    expect(under.ok).toBe(false);
    expect('value' in over).toBe(false);
    expect('value' in under).toBe(false);
  });

  it('never produces a non-finite E', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -1, 2]) {
      const r = externalStrength(input(bad, 0, 0));
      expect(r.ok).toBe(false);
    }
  });

  it('names the offending field in the error context', () => {
    const r = externalStrength(input(0, Number.NaN, 0));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('INVALID_EXTERNAL_INPUT');
      expect(r.error.context?.spotify).toBe('NaN');
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('E-P: external strength to target share (p = E)', () => {
  it('maps E directly to p with no free coefficient', () => {
    const r = externalStrengthToTargetShare(0.25);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(0.25);
  });

  it('maps 0 → 0', () => {
    const r = externalStrengthToTargetShare(0);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(0);
  });

  it('is the identity across the whole valid range', () => {
    for (const e of [0.001, 0.1, 0.25, 0.5, 0.75, 0.9, 0.999]) {
      const r = externalStrengthToTargetShare(e);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value, `p for E=${e}`).toBe(e);
    }
  });

  it('rejects E = 1 (p = 1 is undefined downstream)', () => {
    const r = externalStrengthToTargetShare(1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_TARGET_SHARE');
  });

  it('rejects E above 1', () => {
    const r = externalStrengthToTargetShare(1.5);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_TARGET_SHARE');
  });

  it('rejects negative E', () => {
    const r = externalStrengthToTargetShare(-0.2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_TARGET_SHARE_RANGE');
  });

  it('rejects non-finite E', () => {
    expect(externalStrengthToTargetShare(Number.NaN).ok).toBe(false);
    expect(externalStrengthToTargetShare(Number.POSITIVE_INFINITY).ok).toBe(false);
  });

  it('never clamps E = 1 to a nearby ceiling', () => {
    // The explicitly forbidden 0.99 behaviour.
    const r = externalStrengthToTargetShare(1);
    expect(r.ok).toBe(false);
    expect('value' in r).toBe(false);
  });

  it('composes with externalStrength to give p = E end to end', () => {
    const r = targetShareFromExternal(input(0.5, 0.25, 0.75));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeCloseTo(0.45, 12);
  });

  it('propagates rejection through the composed helper', () => {
    expect(targetShareFromExternal(input(1, 0, 0)).ok).toBe(false);
    expect(targetShareFromExternal(input(Number.NaN, 0, 0)).ok).toBe(false);
  });

  it('reaches a target share of 0.80 from maximum-ish strength', () => {
    // 0.6*x + 0.3*x + 0.1*x = x, so equal inputs yield p equal to the input.
    const r = targetShareFromExternal(input(0.8, 0.8, 0.8));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBeCloseTo(0.8, 12);
  });

  it('never returns a share at or above 1', () => {
    for (let i = 0; i < 200; i++) {
      const v = i / 200;
      const r = targetShareFromExternal(input(v, v, v));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBeLessThan(1);
    }
  });
});