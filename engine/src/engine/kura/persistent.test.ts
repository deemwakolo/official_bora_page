/**
 * BORA Engine — persistent Kura + decay tests (Phase 9)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   K-D  D_h at every valid lattice value (exact)
 *   K-U  the persistent update, and the LOCKED injection-before-decay order
 *   K-E  zero fresh / zero persistent cases
 *   K-V  input validation
 *   K-P  numerical properties and generated inputs
 *   K-I  immutability, determinism, purity
 */

import { describe, it, expect } from 'vitest';
import {
  calculateDecay,
  updatePersistentKura,
  updatePersistentKuraWithTrace,
  MAX_FRESH_KURA,
} from './persistent';
import { DECAY_BASE_RATE, C_MAX } from '../constants';
import type { Result, EngineError } from '../types';

/** The proven closed-hour C lattice. */
const LATTICE = [0, 0.5, 1, 1.5, 2] as const;

function decayOf(c: number): number {
  const r = calculateDecay(c);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

function nextOf(p: number, fresh: number, c: number): number {
  const r = updatePersistentKura(p, fresh, c);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

function traceOf(p: number, fresh: number, c: number) {
  const r = updatePersistentKuraWithTrace(p, fresh, c);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

/**
 * Invoke a function that is expected to be rejected, and return its error code.
 *
 * Takes the concrete Result so the error branch is reachable without a cast.
 */
function errOf(fn: () => Result<unknown, EngineError>): string {
  const r = fn();
  if (r.ok) throw new Error('expected rejection');
  return r.error.code;
}

// ───────────────────────────────────────────────────────────────────────────

describe('K-D: decay at every valid lattice value', () => {
  it('matches the exact contract table', () => {
    // A9: these five values are exactly representable, so compare exactly.
    expect(decayOf(0)).toBe(0.0025);
    expect(decayOf(0.5)).toBe(0.001875);
    expect(decayOf(1)).toBe(0.00125);
    expect(decayOf(1.5)).toBe(0.000625);
    expect(decayOf(2)).toBe(0);
  });

  it('is maximum at C_h = 0 and zero at C_h = 2', () => {
    expect(decayOf(0)).toBe(DECAY_BASE_RATE);
    expect(decayOf(C_MAX)).toBe(0);
  });

  it('is monotonically decreasing across the lattice', () => {
    for (let i = 1; i < LATTICE.length; i++) {
      expect(decayOf(LATTICE[i]), `C_h=${LATTICE[i]}`).toBeLessThan(
        decayOf(LATTICE[i - 1]),
      );
    }
  });

  it('never leaves the [0, 0.0025] band for any valid C', () => {
    for (let c = 0; c <= 2; c += 0.5) {
      const d = decayOf(c);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(DECAY_BASE_RATE);
    }
  });

  it('never produces a negative decay that would inflate a balance', () => {
    for (const c of LATTICE) expect(decayOf(c)).toBeGreaterThanOrEqual(0);
  });
});

describe('K-U: the persistent update, and the locked ordering', () => {
  it('applies fresh Kura BEFORE decay, not after', () => {
    // Values chosen so the two orderings differ visibly.
    const persistentCurrent = 100;
    const freshKura = 20;
    const closedHourC = 0; // maximum decay, D_h = 0.0025

    const expected = (persistentCurrent + freshKura) * (1 - 0.0025);
    const rejected = persistentCurrent * (1 - 0.0025) + freshKura;

    expect(nextOf(persistentCurrent, freshKura, closedHourC)).toBeCloseTo(
      expected,
      9,
    );
    // And the implementation must NOT match the rejected ordering.
    expect(nextOf(persistentCurrent, freshKura, closedHourC)).not.toBeCloseTo(
      rejected,
      9,
    );
  });

  it('subjects the injected fresh Kura to decay as well as the balance', () => {
    // The decisive consequence: fresh Kura is NOT passed through untouched.
    const fresh = 10;
    const c = 0;
    const result = nextOf(0, fresh, c);
    expect(result).toBeLessThan(fresh); // fresh was decayed
    expect(result).toBeCloseTo(fresh * (1 - 0.0025), 12);
  });

  it('matches the locked formula exactly at C_h = 2', () => {
    // Zero decay ⇒ persistent_next = persistent + fresh, unchanged.
    expect(nextOf(40, 10, 2)).toBe(50);
    expect(nextOf(0, 0, 2)).toBe(0);
  });

  it('produces the exact value for the brief example (fresh 50, C_h = 2)', () => {
    expect(nextOf(0, 50, 2)).toBe(50);
    expect(nextOf(0, MAX_FRESH_KURA, 2)).toBe(MAX_FRESH_KURA);
  });

  it('reports consistent intermediates in the trace', () => {
    const t = traceOf(100, 20, 0);
    expect(t.persistentBefore).toBe(100);
    expect(t.freshInjected).toBe(20);
    expect(t.preDecay).toBe(120); // injected before decay
    expect(t.decayRate).toBe(0.0025);
    expect(t.persistentAfter).toBeCloseTo(120 * (1 - 0.0025), 9);
    expect(t.decayed).toBeCloseTo(t.preDecay - t.persistentAfter, 9);
  });

  it('agrees with the single-step function at every lattice value', () => {
    for (const c of LATTICE) {
      const step = nextOf(37, 13, c);
      const traced = traceOf(37, 13, c).persistentAfter;
      expect(traced, `C_h=${c}`).toBe(step);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('K-E: zero fresh and zero persistent', () => {
  it('leaves a fully idle song at zero', () => {
    for (const c of LATTICE) {
      expect(nextOf(0, 0, c), `C_h=${c}`).toBe(0);
    }
  });

  it('still applies decay when fresh Kura is zero', () => {
    // Decay is a property of the hour, not of the injection.
    expect(nextOf(100, 0, 0)).toBeCloseTo(100 * (1 - 0.0025), 9);
    expect(nextOf(100, 0, 0)).toBeLessThan(100);
    for (const c of LATTICE) {
      const result = nextOf(50, 0, c);
      expect(result, `C_h=${c}`).toBeLessThanOrEqual(50);
      if (c === 2) expect(result).toBe(50); // no decay at full activity
    }
  });

  it('still decays fresh Kura when persistent is zero', () => {
    for (const c of LATTICE) {
      const result = nextOf(0, 10, c);
      const expected = 10 * (1 - decayOf(c));
      expect(result, `C_h=${c}`).toBeCloseTo(expected, 12);
    }
  });

  it('holds both at zero', () => {
    expect(nextOf(0, 0, 0)).toBe(0);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('K-V: input validation', () => {
  it('rejects a negative closed-hour C', () => {
    expect(errOf(() => calculateDecay(-0.1))).toBe('INVALID_MEASUREMENT');
    expect(errOf(() => updatePersistentKura(10, 5, -1))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('rejects C_h above the structural maximum', () => {
    expect(errOf(() => calculateDecay(2.1))).toBe('INVALID_MEASUREMENT');
    expect(errOf(() => updatePersistentKura(10, 5, 3))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('rejects non-finite C_h', () => {
    expect(errOf(() => calculateDecay(Number.NaN))).toBe('INVALID_MEASUREMENT');
    expect(errOf(() => calculateDecay(Number.POSITIVE_INFINITY))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('accepts C_h = 0 and C_h = 2 at the boundaries', () => {
    expect(calculateDecay(0).ok).toBe(true);
    expect(calculateDecay(2).ok).toBe(true);
  });

  it('rejects a negative persistent Kura', () => {
    expect(errOf(() => updatePersistentKura(-1, 5, 1))).toBe('INVALID_MEASUREMENT');
  });

  it('rejects a negative fresh Kura', () => {
    expect(errOf(() => updatePersistentKura(10, -1, 1))).toBe('INVALID_MEASUREMENT');
  });

  it('rejects non-finite persistent Kura', () => {
    expect(errOf(() => updatePersistentKura(Number.NaN, 1, 1))).toBe(
      'INVALID_MEASUREMENT',
    );
    expect(errOf(() => updatePersistentKura(Number.POSITIVE_INFINITY, 1, 1))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('rejects non-finite fresh Kura', () => {
    expect(errOf(() => updatePersistentKura(1, Number.NaN, 1))).toBe(
      'INVALID_MEASUREMENT',
    );
    expect(errOf(() => updatePersistentKura(1, Number.POSITIVE_INFINITY, 1))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('never clamps an invalid C into range', () => {
    // 2.5 must NOT become 2 (which would mean zero decay).
    const r = calculateDecay(2.5);
    expect(r.ok).toBe(false);
    expect('value' in r).toBe(false);
  });

  it('names the offending field in the error context', () => {
    const r = calculateDecay(-1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.context?.closedHourC).toBe('-1');
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('K-P: numerical properties', () => {
  /** Deterministic generator — no Math.random in the suite. */
  function makeRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
  }

  it('never exceeds the pre-decay total', () => {
    for (const c of LATTICE) {
      for (const [p, f] of [[0, 0], [100, 20], [0, 50], [37.5, 12.5]] as const) {
        expect(nextOf(p, f, c), `p=${p} f=${f} c=${c}`).toBeLessThanOrEqual(p + f);
      }
    }
  });

  it('is always non-negative and finite', () => {
    const rng = makeRng(4242);
    for (let i = 0; i < 500; i++) {
      const result = nextOf(rng() * 200, rng() * 50, rng() * 2);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(result)).toBe(true);
    }
  });

  it('equals the pre-decay total exactly at C_h = 2', () => {
    const rng = makeRng(99);
    for (let i = 0; i < 200; i++) {
      const p = rng() * 100;
      const f = rng() * 50;
      if (p + f > 0) expect(nextOf(p, f, 2), `p=${p} f=${f}`).toBeCloseTo(p + f, 12);
    }
  });

  it('decays monotonically: a higher C_h never yields a lower result', () => {
    // More activity ⇒ smaller D_h ⇒ a larger surviving balance. The result
    // therefore INCREASES across the lattice, so it must be non-decreasing.
    const rng = makeRng(7);
    for (let i = 0; i < 200; i++) {
      const p = rng() * 100;
      const f = rng() * 50;
      let previous = -Infinity;
      for (const c of LATTICE) {
        const result = nextOf(p, f, c);
        expect(result, `p=${p} f=${f} c=${c}`).toBeGreaterThanOrEqual(previous);
        previous = result;
      }
    }
  });

  it('never grows the balance from decay alone', () => {
    const rng = makeRng(555);
    for (let i = 0; i < 300; i++) {
      const p = rng() * 100;
      const c = rng() * 2;
      expect(nextOf(p, 0, c), `p=${p} c=${c}`).toBeLessThanOrEqual(p);
    }
  });

  it('shrinks a permanently cold song but never to a negative value', () => {
    let persistent = 50;
    const before = persistent;
    for (let h = 0; h < 72; h++) {
      persistent = nextOf(persistent, 0, 0);
    }
    expect(persistent).toBeLessThan(before);
    expect(persistent).toBeGreaterThanOrEqual(0);
    // (1 - 0.0025)^72 ≈ 0.8351 — about 16.5% lost across one window.
    expect(persistent).toBeCloseTo(before * Math.pow(1 - 0.0025, 72), 6);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('K-I: immutability, determinism, and purity', () => {
  it('returns identical results across repeated evaluation', () => {
    for (const c of LATTICE) {
      const first = nextOf(100, 20, c);
      for (let i = 0; i < 20; i++) {
        expect(nextOf(100, 20, c), `C_h=${c}`).toBe(first);
      }
    }
  });

  it('holds no hidden state between calls', () => {
    // Interleaving different inputs must not change any result: a stateful
    // implementation would leak the previous call's balance into the next.
    const a = nextOf(100, 20, 0);
    nextOf(1, 1, 2);
    nextOf(999, 0, 1);
    expect(nextOf(100, 20, 0)).toBe(a);
  });

  it('returns a fresh trace object each call', () => {
    const t = traceOf(100, 20, 0);
    expect(t.persistentBefore).toBe(100);
    expect(t.freshInjected).toBe(20);
    expect(traceOf(100, 20, 0)).not.toBe(t);
  });

  it('applies decay exactly once per call — never compounded within a call', () => {
    // A single call applies D_h once. Applying it twice would give
    // (1 - 0.0025)^2, which must NOT be the result.
    const result = nextOf(100, 0, 0);
    expect(result).toBeCloseTo(100 * (1 - 0.0025), 12);
    expect(result).not.toBeCloseTo(100 * Math.pow(1 - 0.0025, 2), 6);
  });

  it('contains no clock, randomness, score, ranking, platform, or seed logic', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./persistent.ts', import.meta.url)),
      'utf8',
    );
    // Comments removed so documentation cannot trip the scan.
    const body = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    expect(body).not.toMatch(
      /\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bperformance\s*\.\s*now\b/,
    );
    expect(body).not.toMatch(/\bMath\s*\.\s*random\b|\bfetch\s*\(/);
    expect(body).not.toMatch(/\bglobalThis\b|\blocalStorage\b/);
    // No out-of-scope subsystems (A4: no platform decay either).
    expect(body).not.toMatch(/boraScore|rank|PLATFORM_WEIGHT|seedC|Vault/i);
    expect(body).not.toMatch(/from '\.\.\/(votes|window|platform|seed)/);
  });

  it('reuses the shared constants rather than redefining them', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./persistent.ts', import.meta.url)),
      'utf8',
    );
    const body = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    // Uses the shared constants…
    expect(body).toMatch(/from '\.\.\/constants'/);
    expect(body).toMatch(/\bDECAY_NUMERATOR\b/);
    expect(body).toMatch(/\bC_MAX\b/);
    // …and hard-codes no duplicate decay or C_MAX literal.
    expect(body).not.toMatch(/0\.0025/);
    expect(body).not.toMatch(/=\s*2\s*;/);
  });
});