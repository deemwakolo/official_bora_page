/**
 * BORA Engine — K tests (Phase 2)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Colocated with the module per the contract: each mathematical module ships
 * with its focused tests rather than deferring to a late "test phase".
 *
 * Coverage map:
 *   K-1  single upvote            K-4  independence from C
 *   K-2  accumulation             K-5  monotonicity
 *   K-3  downvotes inert          K-6  large-value precision
 *   V-1..V-9  input validation
 */

import { describe, it, expect } from 'vitest';
import { addUpvotes, addDownvotes } from './k';
import { expectExact, expectNonNegative } from '../testing/compare';

/** Unwrap a Result, failing loudly with the engine's own error message. */
function expectOk(result: ReturnType<typeof addUpvotes>): number {
  if (!result.ok) {
    throw new Error(
      `expected success, got ${result.error.code}: ${result.error.message}`,
    );
  }
  return result.value;
}

/** Unwrap a Result expecting failure, and return the error code. */
function expectErr(result: ReturnType<typeof addUpvotes>): string {
  if (result.ok) {
    throw new Error(`expected rejection, but got value ${result.value}`);
  }
  return result.error.code;
}

// ───────────────────────────────────────────────────────────────────────────

describe('K-1: a new song starts at K = 0 and accumulates one vote at a time', () => {
  it('adds a single upvote', () => {
    expect(expectOk(addUpvotes(0, 1))).toBe(1);
  });

  it('treats K = 0 as the origin of a new song', () => {
    expect(expectOk(addUpvotes(0, 0))).toBe(0);
  });
});

describe('K-2: upvotes accumulate', () => {
  it('adds 5 to an empty history', () => {
    expect(expectOk(addUpvotes(0, 5))).toBe(5);
  });

  it('continues accumulating on top of an existing total', () => {
    const afterFive = expectOk(addUpvotes(0, 5));
    expect(expectOk(addUpvotes(afterFive, 3))).toBe(8);
  });

  it('accumulates across many separate events', () => {
    let k = 0;
    for (let i = 0; i < 10; i++) {
      k = expectOk(addUpvotes(k, 7));
    }
    expect(k).toBe(70);
  });
});

describe('K-3: downvotes never affect K', () => {
  it('leaves K unchanged for a single downvote', () => {
    expect(expectOk(addDownvotes(42, 1))).toBe(42);
  });

  it('leaves K unchanged for a large downvote burst', () => {
    expect(expectOk(addDownvotes(42, 10_000))).toBe(42);
  });

  it('leaves a zero-K song at zero', () => {
    expect(expectOk(addDownvotes(0, 999))).toBe(0);
  });

  it('never lowers K even when downvotes vastly exceed it', () => {
    const k = 7;
    expect(expectOk(addDownvotes(k, 1_000_000))).toBe(k);
  });
});

describe('K-4: K is independent of C', () => {
  it('is provable from the module dependency graph: k.ts imports no C code', async () => {
    // Structural proof. `k.ts` imports ONLY the Result/EngineError types, so
    // there is no C module for K to read even accidentally. Asserting the
    // import list is stronger than asserting a numeric outcome, because it
    // cannot be satisfied by a coincidentally-equal number.
    const code = await readSourceOfK();

    const importLines = code
      .split('\n')
      .filter((l) => /^\s*import\b/.test(l) && l.includes(' from '));

    // The only permitted import is the type-only domain-model import.
    expect(importLines.length).toBeGreaterThan(0);
    for (const line of importLines) {
      expect(line).toMatch(/from\s+'\.\/types'/);
      expect(line).toMatch(/import\s+type\b/);
    }
  });

  it('exposes no parameter through which a C value could reach K', () => {
    // The API surface is itself the proof: (k, n) and nothing else.
    expect(addUpvotes.length).toBe(2);
    expect(addDownvotes.length).toBe(2);
  });
});

describe('K-5: K is monotonic for valid upvote additions', () => {
  it('never decreases when adding a positive count', () => {
    const cases: Array<[number, number]> = [
      [0, 1],
      [1, 1],
      [100, 5],
      [12_345, 1],
      [1_000_000, 999],
    ];
    for (const [k, n] of cases) {
      const next = expectOk(addUpvotes(k, n));
      expect(next).toBeGreaterThanOrEqual(k);
      expect(next).toBe(k + n);
    }
  });

  it('is strictly increasing for n > 0', () => {
    expect(expectOk(addUpvotes(10, 1))).toBeGreaterThan(10);
  });

  it('is unchanged for n = 0', () => {
    expect(expectOk(addUpvotes(10, 0))).toBe(10);
  });

  it('holds over a long accumulating walk', () => {
    let k = 0;
    let previous = -1;
    for (let i = 0; i < 500; i++) {
      k = expectOk(addUpvotes(k, (i % 7) + 1));
      expect(k).toBeGreaterThanOrEqual(previous);
      previous = k;
    }
    expectNonNegative(k, 'final K');
  });
});

describe('K-6: large historical values keep full precision', () => {
  it('handles a heavily established song without drift', () => {
    expect(expectOk(addUpvotes(4_500_000, 12_345))).toBe(4_512_345);
  });

  it('stays exact across many large additions', () => {
    let k = 0;
    for (let i = 0; i < 1000; i++) {
      k = expectOk(addUpvotes(k, 1_000_000));
    }
    expect(k).toBe(1_000_000_000);
  });

  it('remains exact at the IEEE-754 safe-integer ceiling', () => {
    // 2^53 - 1 = 9007199254740991. Beyond this, integers stop being exact.
    const nearLimit = 9_007_199_254_740_991;
    expect(Number.isSafeInteger(nearLimit)).toBe(true);
    expect(expectOk(addUpvotes(nearLimit, 0))).toBe(nearLimit);
  });

  it('produces no floating-point residue for exact integer sums', () => {
    expectExact(expectOk(addUpvotes(123_456_789, 987_654_321)), 1_111_111_110);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION (Phase 2 decision)
// ───────────────────────────────────────────────────────────────────────────

describe('V-1..V-4: an invalid starting K is rejected with INVALID_K', () => {
  it('rejects negative K', () => {
    expect(expectErr(addUpvotes(-1, 5))).toBe('INVALID_K');
    expect(expectErr(addDownvotes(-1, 5))).toBe('INVALID_K');
  });

  it('rejects NaN K', () => {
    expect(expectErr(addUpvotes(Number.NaN, 5))).toBe('INVALID_K');
    expect(expectErr(addDownvotes(Number.NaN, 5))).toBe('INVALID_K');
  });

  it('rejects Infinity K', () => {
    expect(expectErr(addUpvotes(Number.POSITIVE_INFINITY, 5))).toBe('INVALID_K');
    expect(expectErr(addUpvotes(Number.NEGATIVE_INFINITY, 5))).toBe('INVALID_K');
  });

  it('rejects fractional K', () => {
    expect(expectErr(addUpvotes(3.7, 5))).toBe('INVALID_K');
    expect(expectErr(addUpvotes(0.5, 5))).toBe('INVALID_K');
  });
});

describe('V-5..V-7: an invalid vote count is rejected with INVALID_MEASUREMENT', () => {
  it('rejects a negative vote count', () => {
    expect(expectErr(addUpvotes(10, -1))).toBe('INVALID_MEASUREMENT');
    expect(expectErr(addDownvotes(10, -1))).toBe('INVALID_MEASUREMENT');
  });

  it('rejects NaN and Infinity vote counts', () => {
    expect(expectErr(addUpvotes(10, Number.NaN))).toBe('INVALID_MEASUREMENT');
    expect(expectErr(addUpvotes(10, Number.POSITIVE_INFINITY))).toBe(
      'INVALID_MEASUREMENT',
    );
    expect(expectErr(addDownvotes(10, Number.NaN))).toBe('INVALID_MEASUREMENT');
  });

  it('rejects a fractional vote count', () => {
    expect(expectErr(addUpvotes(10, 1.5))).toBe('INVALID_MEASUREMENT');
    expect(expectErr(addDownvotes(10, 0.5))).toBe('INVALID_MEASUREMENT');
  });
});

describe('V-8: valid integer inputs succeed', () => {
  it('accepts zero for both arguments', () => {
    expect(expectOk(addUpvotes(0, 0))).toBe(0);
    expect(expectOk(addDownvotes(0, 0))).toBe(0);
  });

  it('accepts large valid integers', () => {
    expect(expectOk(addUpvotes(1_000_000, 1_000_000))).toBe(2_000_000);
  });
});

describe('V-9: rejection leaves K untouched', () => {
  it('returns no value to accidentally commit on rejection', () => {
    const result = addUpvotes(500, -1);
    expect(result.ok).toBe(false);
    // The rejected call exposes no numeric output at all, so a caller cannot
    // accidentally write a failure result back into a song's K.
    expect('value' in result).toBe(false);
  });

  it('carries the offending value in the error context for the inspector', () => {
    const result = addUpvotes(Number.NaN, 3);
    if (result.ok) throw new Error('expected rejection');
    expect(result.error.code).toBe('INVALID_K');
    expect(result.error.context).toBeDefined();
    expect(result.error.message.length).toBeGreaterThan(0);
  });

  it('never coerces or clamps a rejected value into a valid one', () => {
    // A7: reject, never clamp. -5 must not become 0, and 2.5 must not
    // silently become 2.
    expect(expectErr(addUpvotes(-5, 1))).toBe('INVALID_K');
    expect(expectErr(addUpvotes(0, 2.5))).toBe('INVALID_MEASUREMENT');
  });
});

// ───────────────────────────────────────────────────────────────────────────

/** Read k.ts from disk so its import list can be asserted structurally. */
async function readSourceOfK(): Promise<string> {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  return readFileSync(fileURLToPath(new URL('./k.ts', import.meta.url)), 'utf8');
}
