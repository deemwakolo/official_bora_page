/**
 * BORA Engine — hourly threshold tests (Phase 4)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   T-U  upvote table + the 4/5 boundary
 *   T-D  downvote table + the 4/5 boundary
 *   T-C  effective C combinations, including the negative-clamp floor
 *   T-I  immutability, determinism, and input validation
 *
 * Boundary values are asserted exhaustively at 0/1/4/5/6, not sampled.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateHourlyC,
  upvoteContribution,
  downvoteContribution,
} from './threshold';
import { emptyBucket } from '../bucket';
import type { VoteBucket } from '../types';

/** Build a bucket with exact raw counts, bypassing applyVote for fixtures. */
function bucketWith(upvotes: number, downvotes: number): VoteBucket {
  return { ...emptyBucket(1000 as VoteBucket['hourIndex']), upvotes, downvotes };
}

/** C for an exact (upvotes, downvotes) pair. Throws if the bucket is rejected. */
function cOf(upvotes: number, downvotes: number): number {
  const result = calculateHourlyC(bucketWith(upvotes, downvotes));
  if (!result.ok) {
    throw new Error(`unexpected rejection: ${result.error.code}`);
  }
  return result.value;
}

function errOf(bucket: VoteBucket): string {
  const result = calculateHourlyC(bucket);
  if (result.ok) {
    throw new Error(`expected rejection, but got C = ${result.value}`);
  }
  return result.error.code;
}

// ───────────────────────────────────────────────────────────────────────────

describe('T-U: upvote contribution C_U', () => {
  it('maps 0 → 0', () => {
    expect(upvoteContribution(0)).toBe(0);
  });

  it('maps 1–4 → 1', () => {
    for (const n of [1, 2, 3, 4]) {
      expect(upvoteContribution(n), `C_U(${n})`).toBe(1);
    }
  });

  it('maps 5 → 2', () => {
    expect(upvoteContribution(5)).toBe(2);
  });

  it('maps 6 and beyond → 2', () => {
    expect(upvoteContribution(6)).toBe(2);
    expect(upvoteContribution(100)).toBe(2);
    expect(upvoteContribution(1_000)).toBe(2);
    expect(upvoteContribution(10_000_000)).toBe(2);
  });

  it('treats the 4/5 boundary as a genuine step change', () => {
    // The single most important edge in the engine.
    expect(upvoteContribution(4)).not.toBe(upvoteContribution(5));
    expect(upvoteContribution(4)).toBe(1);
    expect(upvoteContribution(5)).toBe(2);
  });

  it('saturates: 5 upvotes and a million upvotes are identical', () => {
    expect(upvoteContribution(1_000_000)).toBe(upvoteContribution(5));
  });
});

describe('T-D: downvote contribution C_D', () => {
  it('maps 0 → 0', () => {
    expect(downvoteContribution(0)).toBe(0);
  });

  it('maps 1–4 → 0.5', () => {
    for (const n of [1, 2, 3, 4]) {
      expect(downvoteContribution(n), `C_D(${n})`).toBe(0.5);
    }
  });

  it('maps 5 → 1', () => {
    expect(downvoteContribution(5)).toBe(1);
  });

  it('maps 6 and beyond → 1', () => {
    expect(downvoteContribution(6)).toBe(1);
    expect(downvoteContribution(100)).toBe(1);
    expect(downvoteContribution(1_000_000)).toBe(1);
  });

  it('treats the 4/5 boundary as a genuine step change', () => {
    expect(downvoteContribution(4)).not.toBe(downvoteContribution(5));
    expect(downvoteContribution(4)).toBe(0.5);
    expect(downvoteContribution(5)).toBe(1);
  });
});

describe('T-C: effective hourly C = max(0, C_U − C_D)', () => {
  it('matches every combination required by the phase brief', () => {
    const expected: Array<[number, number, number]> = [
      [0, 0, 0],
      [1, 0, 1],
      [4, 0, 1],
      [5, 0, 2],
      [0, 1, 0],
      [0, 5, 0],
      [1, 1, 0.5],
      [4, 1, 0.5],
      [5, 1, 1.5],
      [5, 5, 1],
      [1, 5, 0],
      [4, 5, 0],
    ];
    for (const [up, down, want] of expected) {
      expect(cOf(up, down), `C(${up} up, ${down} down)`).toBe(want);
    }
  });

  it('is zero for a completely empty hour', () => {
    expect(cOf(0, 0)).toBe(0);
  });

  it('never returns a negative C, whatever the input', () => {
    // Exhaustively sweep the reachable threshold regions plus extremes.
    for (let up = 0; up <= 12; up++) {
      for (let down = 0; down <= 12; down++) {
        expect(cOf(up, down), `C(${up}, ${down})`).toBeGreaterThanOrEqual(0);
      }
    }
    expect(cOf(0, 1_000_000)).toBe(0);
    expect(cOf(1, 1_000_000)).toBe(0);
    expect(cOf(0, 5)).toBe(0);
  });

  it('clamps a downvote-flooded hour to exactly 0, not below', () => {
    expect(cOf(1, 5)).toBe(0);
    expect(cOf(2, 5)).toBe(0);
    expect(cOf(0, 4)).toBe(0); // C_U 0 − C_D 0.5 → floor at 0
  });

  it('never exceeds C_MAX = 2', () => {
    for (let up = 0; up <= 20; up++) {
      expect(cOf(up, 0), `C(${up}, 0)`).toBeLessThanOrEqual(2);
    }
    expect(cOf(1_000_000, 0)).toBe(2);
  });

  it('produces only values on the 0.5 lattice', () => {
    const allowed = new Set([0, 0.5, 1, 1.5, 2]);
    for (let up = 0; up <= 10; up++) {
      for (let down = 0; down <= 10; down++) {
        expect(allowed.has(cOf(up, down)), `C(${up}, ${down})`).toBe(true);
      }
    }
  });

  it('treats the 4/5 upvote boundary as decisive for C too', () => {
    // 4/0 = 1 but 5/0 = 2. The boundary propagates all the way to C.
    expect(cOf(4, 0)).not.toBe(cOf(5, 0));
  });

  it('treats the 4/5 downvote boundary as decisive for C too', () => {
    // 4/0 = 1 and 5/0 = 2; adding a 4th vs 5th downvote shifts C by 0.5.
    expect(cOf(5, 4)).toBe(1.5);
    expect(cOf(5, 5)).toBe(1);
    expect(cOf(5, 4)).not.toBe(cOf(5, 5));
  });
});

describe('T-I: the bucket is never modified', () => {
  it('leaves raw counts and version untouched', () => {
    const bucket = bucketWith(5, 2);
    const before = { ...bucket };

    calculateHourlyC(bucket);

    expect(bucket.upvotes).toBe(before.upvotes);
    expect(bucket.downvotes).toBe(before.downvotes);
    expect(bucket.version).toBe(before.version);
    expect(bucket.phase).toBe(before.phase);
    expect(bucket.hourIndex).toBe(before.hourIndex);
  });

  it('gives an identical result across repeated evaluation', () => {
    const bucket = bucketWith(7, 3);
    const first = calculateHourlyC(bucket);
    const second = calculateHourlyC(bucket);
    const third = calculateHourlyC(bucket);
    expect(first).toEqual(second);
    expect(second).toEqual(third);
  });

  it('is a pure function of counts, not of bucket identity', () => {
    expect(cOf(5, 1)).toBe(cOf(5, 1));
  });
});

describe('T-V: a corrupt bucket is rejected, never coerced', () => {
  it('rejects NaN upvotes', () => {
    expect(errOf(bucketWith(Number.NaN, 0))).toBe('INVALID_MEASUREMENT');
  });

  it('rejects NaN downvotes', () => {
    expect(errOf(bucketWith(0, Number.NaN))).toBe('INVALID_MEASUREMENT');
  });

  it('rejects Infinity counts', () => {
    expect(errOf(bucketWith(Number.POSITIVE_INFINITY, 0))).toBe(
      'INVALID_MEASUREMENT',
    );
    expect(errOf(bucketWith(0, Number.POSITIVE_INFINITY))).toBe(
      'INVALID_MEASUREMENT',
    );
    expect(errOf(bucketWith(0, Number.NEGATIVE_INFINITY))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('rejects negative counts', () => {
    expect(errOf(bucketWith(-1, 0))).toBe('INVALID_MEASUREMENT');
    expect(errOf(bucketWith(0, -1))).toBe('INVALID_MEASUREMENT');
  });

  it('rejects fractional counts', () => {
    expect(errOf(bucketWith(1.5, 0))).toBe('INVALID_MEASUREMENT');
    expect(errOf(bucketWith(0, 0.5))).toBe('INVALID_MEASUREMENT');
  });

  it('never manufactures a C value from invalid state', () => {
    // A NaN upvote count must NOT be coerced to 0, which would silently
    // report C = 0 and fabricate "this hour had no votes".
    const result = calculateHourlyC(bucketWith(Number.NaN, 0));
    expect(result.ok).toBe(false);
    expect('value' in result).toBe(false);
  });

  it('carries the offending values in the error context', () => {
    const result = calculateHourlyC(bucketWith(Number.NaN, 3));
    if (result.ok) throw new Error('expected rejection');
    expect(result.error.code).toBe('INVALID_MEASUREMENT');
    expect(result.error.context?.upvotes).toBe('NaN');
    expect(result.error.context?.downvotes).toBe('3');
  });

  it('rejects a bucket corrupt in both directions', () => {
    expect(errOf(bucketWith(Number.NaN, Number.NaN))).toBe(
      'INVALID_MEASUREMENT',
    );
  });
});

describe('T-S: the module stays within Phase 4 scope', () => {
  /**
   * Collect the module specifiers imported by threshold.ts.
   *
   * Matches whole import statements INCLUDING multi-line ones — a naive
   * line-based filter silently drops a multi-line `} from '../constants';`,
   * which is exactly the kind of false negative that makes a scope test
   * useless.
   */
  function importedSpecifiers(code: string): string[] {
    const withoutComments = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    const statements =
      withoutComments.match(/import[\s\S]*?from\s+'[^']+'\s*;?/g) ?? [];

    return statements.map(
      (s) => /from\s+'([^']+)'/.exec(s)?.[1] ?? '',
    );
  }

  async function readThresholdSource(): Promise<string> {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    return readFileSync(
      fileURLToPath(new URL('./threshold.ts', import.meta.url)),
      'utf8',
    );
  }

  it('imports exactly the constants and the domain model — nothing else', async () => {
    const specifiers = importedSpecifiers(await readThresholdSource());

    // Exact set, sorted. A new import of any kind fails this test, which is
    // the point: Phase 4 must not grow dependencies.
    expect(specifiers.slice().sort()).toEqual(['../constants', '../types']);
  });

  it('does not import K, the 72h window, or any simulation layer', async () => {
    const specifiers = importedSpecifiers(await readThresholdSource());

    for (const s of specifiers) {
      expect(s).not.toMatch(/\.\.\/k$/);
      expect(s).not.toMatch(/window/i);
      expect(s).not.toMatch(/kura/i);
      expect(s).not.toMatch(/platform/i);
      expect(s).not.toMatch(/sim/i);
      expect(s).not.toMatch(/bucket/);
    }
  });

  it('reads only upvotes and downvotes, never time or hour state', async () => {
    const code = await readThresholdSource();
    const body = code.slice(code.indexOf('export function calculateHourlyC'));

    expect(body).toMatch(/bucket\.upvotes/);
    expect(body).toMatch(/bucket\.downvotes/);
    // No clock, no hour arithmetic, no randomness in the calculation.
    expect(body).not.toMatch(/Date\.|Math\.random|hourIndex/);
  });
});


