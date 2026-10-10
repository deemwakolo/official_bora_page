/**
 * BORA Engine — hourly vote bucket tests (Phase 3)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   B-1  empty bucket          B-7  determinism
 *   B-2  single upvote         B-8  invalid counts
 *   B-3  upvote accumulation   B-9  hour identity preserved
 *   B-4  downvote accumulation B-10 version rule
 *   B-5  coexist in one hour   B-11 status untouched
 *   B-6  immutability
 *
 * No threshold, C, or Kura mathematics is tested here by design.
 */

import { describe, it, expect } from 'vitest';
import { emptyBucket, applyVote, totalVotes } from './bucket';
import type { VoteBucket, HourIndex, VoteDirection } from './types';

/** Canonical hour for the tests. Identity only — never derived from a clock. */
const HOUR = 1000 as HourIndex;

function ok(result: ReturnType<typeof applyVote>): VoteBucket {
  if (!result.ok) {
    throw new Error(
      `expected success, got ${result.error.code}: ${result.error.message}`,
    );
  }
  return result.value;
}

function errCode(result: ReturnType<typeof applyVote>): string {
  if (result.ok) {
    throw new Error(`expected rejection, but got a bucket`);
  }
  return result.error.code;
}

/** Apply a sequence of votes, threading the bucket through each step. */
function run(
  start: VoteBucket,
  steps: Array<[VoteDirection, number]>,
): VoteBucket {
  return steps.reduce<VoteBucket>(
    (b, [dir, n]) => ok(applyVote(b, dir, n)),
    start,
  );
}

// ───────────────────────────────────────────────────────────────────────────

describe('B-1: an empty bucket starts at zero', () => {
  it('has zero upvotes and zero downvotes', () => {
    const b = emptyBucket(HOUR);
    expect(b.upvotes).toBe(0);
    expect(b.downvotes).toBe(0);
  });

  it('starts at version 0', () => {
    expect(emptyBucket(HOUR).version).toBe(0);
  });

  it('carries the hour it was created for', () => {
    expect(emptyBucket(HOUR).hourIndex).toBe(HOUR);
  });

  it('reports a total of zero votes', () => {
    expect(totalVotes(emptyBucket(HOUR))).toBe(0);
  });
});

describe('B-2: one upvote increments upvotes', () => {
  it('records a single upvote', () => {
    const b = ok(applyVote(emptyBucket(HOUR), 'UP', 1));
    expect(b.upvotes).toBe(1);
    expect(b.downvotes).toBe(0);
  });
});

describe('B-3: upvotes accumulate', () => {
  it('sums repeated upvote operations', () => {
    const b = run(emptyBucket(HOUR), [
      ['UP', 2],
      ['UP', 3],
    ]);
    expect(b.upvotes).toBe(5);
  });

  it('matches the worked example from the phase brief', () => {
    // 0, +2 UP, +3 UP, +1 DOWN  =>  upvotes 5, downvotes 1
    const b = run(emptyBucket(HOUR), [
      ['UP', 2],
      ['UP', 3],
      ['DOWN', 1],
    ]);
    expect(b.upvotes).toBe(5);
    expect(b.downvotes).toBe(1);
  });

  it('accumulates across many operations', () => {
    let b = emptyBucket(HOUR);
    for (let i = 0; i < 50; i++) {
      b = ok(applyVote(b, 'UP', 2));
    }
    expect(b.upvotes).toBe(100);
  });
});

describe('B-4: downvotes accumulate independently', () => {
  it('records downvotes without touching upvotes', () => {
    const b = run(emptyBucket(HOUR), [
      ['DOWN', 4],
      ['DOWN', 6],
    ]);
    expect(b.downvotes).toBe(10);
    expect(b.upvotes).toBe(0);
  });
});

describe('B-5: upvotes and downvotes coexist in the same hour', () => {
  it('tracks both directions in one bucket', () => {
    const b = run(emptyBucket(HOUR), [
      ['UP', 7],
      ['DOWN', 3],
      ['UP', 2],
    ]);
    expect(b.upvotes).toBe(9);
    expect(b.downvotes).toBe(3);
    expect(totalVotes(b)).toBe(12);
  });
});

describe('B-6: the original bucket is immutable', () => {
  it('leaves the source bucket untouched when applying a vote', () => {
    const before = emptyBucket(HOUR);
    const after = ok(applyVote(before, 'UP', 3));

    expect(before.upvotes).toBe(0);
    expect(before.downvotes).toBe(0);
    expect(before.version).toBe(0);

    expect(after.upvotes).toBe(3);
    expect(after).not.toBe(before); // a distinct object, not the same reference
  });

  it('leaves every intermediate bucket in a chain untouched', () => {
    const a = emptyBucket(HOUR);
    const b = ok(applyVote(a, 'UP', 5));
    const c = ok(applyVote(b, 'UP', 5));

    expect(a.upvotes).toBe(0);
    expect(b.upvotes).toBe(5);
    expect(c.upvotes).toBe(10);
  });
});

describe('B-7: identical operation sequences produce identical buckets', () => {
  it('replays a sequence deterministically', () => {
    const steps: Array<[VoteDirection, number]> = [
      ['UP', 3],
      ['DOWN', 1],
      ['UP', 9],
      ['DOWN', 4],
    ];
    const first = run(emptyBucket(HOUR), steps);
    const second = run(emptyBucket(HOUR), steps);

    expect(first).toEqual(second);
  });

  it('produces no dependence on prior state', () => {
    // A fresh bucket and a pre-used bucket must not influence the outcome of
    // the same operation sequence.
    const steps: Array<[VoteDirection, number]> = [
      ['UP', 2],
      ['DOWN', 5],
    ];
    const fromFresh = run(emptyBucket(HOUR), steps);
    const fromOther = run(emptyBucket((HOUR + 50) as HourIndex), steps);
    expect(fromFresh.upvotes).toBe(fromOther.upvotes);
    expect(fromFresh.downvotes).toBe(fromOther.downvotes);
  });
});

describe('B-8: invalid vote counts are rejected', () => {
  it('rejects a negative count', () => {
    expect(errCode(applyVote(emptyBucket(HOUR), 'UP', -1))).toBe(
      'INVALID_MEASUREMENT',
    );
    expect(errCode(applyVote(emptyBucket(HOUR), 'DOWN', -5))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('rejects a fractional count', () => {
    expect(errCode(applyVote(emptyBucket(HOUR), 'UP', 1.5))).toBe(
      'INVALID_MEASUREMENT',
    );
    expect(errCode(applyVote(emptyBucket(HOUR), 'DOWN', 0.5))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('rejects NaN and Infinity counts', () => {
    expect(errCode(applyVote(emptyBucket(HOUR), 'UP', Number.NaN))).toBe(
      'INVALID_MEASUREMENT',
    );
    expect(errCode(applyVote(emptyBucket(HOUR), 'UP', Number.POSITIVE_INFINITY))).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('never clamps, rounds, or coerces a rejected count', () => {
    // -5 must not become 0; 1.5 must not become 1 or 2 (A7).
    const negative = applyVote(emptyBucket(HOUR), 'UP', -5);
    const fractional = applyVote(emptyBucket(HOUR), 'UP', 1.5);
    expect(negative.ok).toBe(false);
    expect(fractional.ok).toBe(false);
    expect('value' in negative).toBe(false);
    expect('value' in fractional).toBe(false);
  });

  it('rejects a bucket whose stored state is already invalid', () => {
    const corrupt: VoteBucket = {
      ...emptyBucket(HOUR),
      upvotes: Number.NaN,
    };
    expect(errCode(applyVote(corrupt, 'UP', 1))).toBe('INVALID_MEASUREMENT');
  });
});

describe('B-9: hour identity is preserved through updates', () => {
  it('keeps the same hourIndex after every operation', () => {
    let b = emptyBucket(HOUR);
    for (let i = 0; i < 5; i++) {
      b = ok(applyVote(b, 'UP', 1));
      expect(b.hourIndex).toBe(HOUR);
    }
  });

  it('keeps distinct hours distinct', () => {
    const a = ok(applyVote(emptyBucket(1000 as HourIndex), 'UP', 1));
    const b = ok(applyVote(emptyBucket(1001 as HourIndex), 'UP', 1));
    expect(a.hourIndex).not.toBe(b.hourIndex);
  });

  it('derives identity from hourIndex, never from array position', () => {
    // Reordering the collection must not change any bucket's identity.
    const first = ok(applyVote(emptyBucket(1000 as HourIndex), 'UP', 2));
    const second = ok(applyVote(emptyBucket(1001 as HourIndex), 'UP', 3));
    const reordered = [second, first];
    expect(reordered[0].hourIndex).toBe(1001);
    expect(reordered[1].hourIndex).toBe(1000);
  });
});

describe('B-10: the version rule is deterministic', () => {
  it('starts at 0 and advances by exactly 1 per successful mutation', () => {
    let b = emptyBucket(HOUR);
    expect(b.version).toBe(0);
    for (let i = 1; i <= 4; i++) {
      b = ok(applyVote(b, 'UP', 1));
      expect(b.version).toBe(i);
    }
  });

  it('advances by 1 regardless of the count applied', () => {
    // count = 5 in ONE operation is version + 1, not version + 5.
    const b = ok(applyVote(emptyBucket(HOUR), 'UP', 5));
    expect(b.version).toBe(1);
    expect(b.upvotes).toBe(5);
  });

  it('does not advance on a rejected vote', () => {
    const before = emptyBucket(HOUR);
    const rejected = applyVote(before, 'UP', -1);
    expect(rejected.ok).toBe(false);
    // The caller's bucket is untouched, so its version is unchanged.
    expect(before.version).toBe(0);
  });

  it('counts a DOWN vote the same as an UP vote', () => {
    const down = ok(applyVote(emptyBucket(HOUR), 'DOWN', 3));
    const up = ok(applyVote(emptyBucket(HOUR), 'UP', 3));
    expect(down.version).toBe(up.version);
  });

  it('is independent of hour identity', () => {
    const a = run(emptyBucket(1000 as HourIndex), [['UP', 1]]);
    const b = run(emptyBucket(2000 as HourIndex), [['UP', 1]]);
    expect(a.version).toBe(b.version);
  });
});

describe('B-11: status is not changed by applying a vote', () => {
  it('preserves CLOSED by default', () => {
    const b = ok(applyVote(emptyBucket(HOUR), 'UP', 3));
    expect(b.phase).toBe(emptyBucket(HOUR).phase);
  });

  it('preserves OPEN', () => {
    const open = emptyBucket(HOUR, 'OPEN');
    expect(ok(applyVote(open, 'UP', 1)).phase).toBe('OPEN');
  });

  it('preserves TRANSITION', () => {
    const t = emptyBucket(HOUR, 'TRANSITION');
    expect(ok(applyVote(t, 'DOWN', 1)).phase).toBe('TRANSITION');
  });

  it('never opens or closes an hour as a side effect', () => {
    const closed = emptyBucket(HOUR, 'CLOSED');
    let b = closed;
    for (let i = 0; i < 10; i++) {
      b = ok(applyVote(b, 'UP', 1));
      expect(b.phase).toBe('CLOSED');
    }
  });
});

