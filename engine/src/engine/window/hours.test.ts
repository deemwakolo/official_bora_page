/**
 * BORA Engine — rolling 72-clock-hour window tests (Phase 5)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Coverage map:
 *   W-B  window definition and the H−71 / H−72 boundary
 *   W-S  selection: ordering, exclusion, archived/future handling
 *   W-Z  72 CLOCK-HOURS ≠ 72 STORED RECORDS (the central distinction)
 *   W-M  missing hours contribute zero, nothing fabricated
 *   W-N  no mutation; archived and future records untouched
 *   W-V  validation and rejection
 *   W-R  determinism
 */

import { describe, it, expect } from 'vitest';
import {
  getActiveWindow,
  isHourInWindow,
  selectActive,
  getActiveBuckets,
  sumActiveC,
} from './hours';
import { emptyBucket } from '../bucket';
import { C_WINDOW_HOURS, C_MAX } from '../constants';
import type { VoteBucket, HourIndex, ActiveWindow } from '../types';

const H = 1000 as HourIndex; // reference hour for most tests
const hour = (n: number) => n as HourIndex;

function win(referenceHour: HourIndex = H): ActiveWindow {
  const r = getActiveWindow(referenceHour);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

/** Build a stored bucket with exact raw counts at a given hour. */
function bucketAt(h: number, upvotes: number, downvotes = 0): VoteBucket {
  return { ...emptyBucket(hour(h)), upvotes, downvotes };
}

function cOf(b: readonly VoteBucket[], referenceHour: HourIndex = H): number {
  const r = sumActiveC(b, referenceHour);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

// ───────────────────────────────────────────────────────────────────────────

describe('W-B: the window is 72 clock-hours, H−71 … H inclusive', () => {
  it('anchors the start at H − 71, not H − 72', () => {
    const w = win();
    expect(w.startHour).toBe(H - 71);
    expect(w.endHour).toBe(H);
  });

  it('reports exactly 72 clock-hours', () => {
    expect(win().hours).toBe(72);
    expect(win().hours).toBe(C_WINDOW_HOURS);
  });

  it('includes H−71 (the oldest included hour)', () => {
    expect(isHourInWindow(hour(H - 71), win())).toBe(true);
  });

  it('includes H (the reference hour)', () => {
    expect(isHourInWindow(H, win())).toBe(true);
  });

  it('EXCLUDES H−72 (the first expired hour)', () => {
    expect(isHourInWindow(hour(H - 72), win())).toBe(false);
  });

  it('EXCLUDES H+1 (future)', () => {
    expect(isHourInWindow(hour(H + 1), win())).toBe(false);
  });

  it('excludes H−100, far outside the window', () => {
    expect(isHourInWindow(hour(H - 100), win())).toBe(false);
  });

  it('spans exactly 72 hour-steps, not 73', () => {
    // The off-by-one guard: H − startHour + 1 must be 72.
    const w = win();
    expect(w.endHour - w.startHour + 1).toBe(72);
  });

  it('is a 72-hour window at any reference hour', () => {
    for (const ref of [0, 1, 71, 72, 999, 1_000_000, -50]) {
      const r = getActiveWindow(hour(ref));
      if (!r.ok) throw new Error(`rejected ${ref}`);
      expect(r.value.hours, `ref ${ref}`).toBe(72);
      expect(r.value.endHour - r.value.startHour + 1, `ref ${ref}`).toBe(72);
      expect(r.value.endHour, `ref ${ref}`).toBe(hour(ref));
    }
  });
});

describe('W-S: selection excludes archived and future records', () => {
  it('returns an empty array for an empty collection', () => {
    const r = getActiveBuckets([], H);
    if (!r.ok) throw new Error('unexpected rejection');
    expect(r.value).toEqual([]);
  });

  it('sums to zero for an empty collection', () => {
    expect(cOf([])).toBe(0);
  });

  it('excludes only-old buckets (entirely outside the window)', () => {
    const old = [
      bucketAt(H - 100, 5),
      bucketAt(H - 500, 5),
      bucketAt(H - 73, 5),
    ];
    const r = getActiveBuckets(old, H);
    if (!r.ok) throw new Error('unexpected rejection');
    expect(r.value).toHaveLength(0);
    expect(cOf(old)).toBe(0);
  });

  it('excludes only-future buckets', () => {
    const future = [bucketAt(H + 1, 5), bucketAt(H + 2, 5), bucketAt(H + 50, 5)];
    const r = getActiveBuckets(future, H);
    if (!r.ok) throw new Error('unexpected rejection');
    expect(r.value).toHaveLength(0);
    expect(cOf(future)).toBe(0);
  });

  it('excludes H−72 but includes H−71 and H', () => {
    const mixed = [bucketAt(H - 72, 5), bucketAt(H - 71, 5), bucketAt(H, 5)];
    const r = getActiveBuckets(mixed, H);
    if (!r.ok) throw new Error('unexpected rejection');
    expect(r.value.map((b) => b.hourIndex)).toEqual([hour(H - 71), H]);
    // 5 upvotes → C_U 2 per active hour, so 2 hours × 2 = 4.
    expect(cOf(mixed)).toBe(4);
  });

  it('returns buckets in ascending chronological order', () => {
    const shuffled = [
      bucketAt(H, 1),
      bucketAt(H - 40, 1),
      bucketAt(H - 71, 1),
      bucketAt(H - 5, 1),
    ];
    const r = getActiveBuckets(shuffled, H);
    if (!r.ok) throw new Error('unexpected rejection');
    expect(r.value.map((b) => b.hourIndex)).toEqual([
      hour(H - 71),
      hour(H - 40),
      hour(H - 5),
      H,
    ]);
  });

  it('produces the same order regardless of input order', () => {
    const a = [bucketAt(H - 10, 1), bucketAt(H - 30, 1), bucketAt(H, 1)];
    const b = [...a].reverse();
    const ra = getActiveBuckets(a, H);
    const rb = getActiveBuckets(b, H);
    if (!ra.ok || !rb.ok) throw new Error('unexpected rejection');
    expect(ra.value.map((x) => x.hourIndex)).toEqual(
      rb.value.map((x) => x.hourIndex),
    );
  });

  it('rejects a duplicate active hour rather than double-counting', () => {
    // Phase 5 revision: a song holds ONE state per clock hour. Two records
    // for H−5 is invalid data. Summing them would silently double-count.
    const dupes = [bucketAt(H - 5, 1), bucketAt(H - 5, 2), bucketAt(H, 1)];
    const r = getActiveBuckets(dupes, H);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
  });

  it('handles a fully dense 72-hour window', () => {
    const dense: VoteBucket[] = [];
    for (let i = 71; i >= 0; i--) {
      dense.push(bucketAt(H - i, 5));
    }
    const r = getActiveBuckets(dense, H);
    if (!r.ok) throw new Error('unexpected rejection');
    expect(r.value).toHaveLength(72);
    // 72 hours × C 2 = 144, the structural maximum for a full window.
    expect(cOf(dense)).toBe(72 * C_MAX);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('W-Z: 72 clock-hours ≠ 72 stored records', () => {
  it('keeps a 72-hour window when only 3 buckets are stored', () => {
    const sparse = [bucketAt(H - 71, 5), bucketAt(H - 10, 5), bucketAt(H, 5)];

    // The window is still 72 clock-hours…
    expect(win().hours).toBe(72);
    expect(win().endHour - win().startHour + 1).toBe(72);

    // …but only 3 stored buckets exist, and only they contribute.
    const r = getActiveBuckets(sparse, H);
    if (!r.ok) throw new Error('unexpected rejection');
    expect(r.value).toHaveLength(3);
    expect(cOf(sparse)).toBe(3 * C_MAX);
  });

  it('does NOT end the window early with only 71 stored records', () => {
    // 71 records must not behave like a 71-hour window.
    const almost = [
      bucketAt(H - 71, 1),
      bucketAt(H, 1),
    ];
    // Two records, but the window still covers 72 clock hours.
    expect(win().hours).toBe(72);
    expect(cOf(almost)).toBe(2); // only the two stored hours contribute

    // Now 71 distinct records spread across the window.
    const seventyOne: VoteBucket[] = [];
    for (let i = 0; i < 71; i++) {
      seventyOne.push(bucketAt(H - i, 5));
    }
    const r = getActiveBuckets(seventyOne, H);
    if (!r.ok) throw new Error('unexpected rejection');
    expect(r.value).toHaveLength(71);
    expect(win().hours).toBe(72); // window is STILL 72 hours
    expect(cOf(seventyOne)).toBe(71 * C_MAX);
  });

  it('treats a single stored bucket as a 72-hour window', () => {
    expect(win().hours).toBe(72);
    expect(cOf([bucketAt(H, 5)])).toBe(C_MAX);
  });

  it('agrees on the window span whatever the record count', () => {
    for (const count of [0, 1, 5, 40, 71, 72]) {
      const list: VoteBucket[] = [];
      for (let i = 0; i < count; i++) list.push(bucketAt(H - i, 1));
      const r = getActiveBuckets(list, H);
      if (!r.ok) throw new Error('unexpected rejection');
      expect(r.value.length).toBeLessThanOrEqual(72);
      expect(win().hours).toBe(72); // invariant regardless of count
    }
  });
});

describe('W-M: missing hours contribute zero and are not fabricated', () => {
  it('does not materialise absent hours as records', () => {
    // Three stored buckets must yield three records, NOT seventy-two.
    const sparse = [bucketAt(H - 71, 5), bucketAt(H - 33, 5), bucketAt(H, 5)];
    const r = getActiveBuckets(sparse, H);
    if (!r.ok) throw new Error('unexpected rejection');
    expect(r.value).toHaveLength(3);
  });

  it('contributes zero for a large gap of missing hours', () => {
    const gapped = [bucketAt(H - 71, 5), bucketAt(H, 5)];
    expect(cOf(gapped)).toBe(2 * C_MAX);
  });

  it('treats a stored but empty hour as contributing exactly zero', () => {
    const emptyHour = bucketAt(H - 10, 0, 0);
    expect(cOf([emptyHour, bucketAt(H, 5)])).toBe(C_MAX);
  });

  it('gives the same sum whether an empty hour is stored or absent', () => {
    // A stored zero-activity hour and a missing hour must be
    // mathematically indistinguishable in the sum.
    const withEmpty = [bucketAt(H - 10, 0, 0), bucketAt(H, 5)];
    const withoutEmpty = [bucketAt(H, 5)];
    expect(cOf(withEmpty)).toBe(cOf(withoutEmpty));
  });

  it('accumulates correctly across a sparse window', () => {
    // 5 upvotes → C 2;  1 upvote → C 1;  5 down → floor 0.
    const mixed = [
      bucketAt(H - 71, 5),
      bucketAt(H - 40, 1),
      bucketAt(H - 20, 0, 5),
      bucketAt(H, 5),
    ];
    expect(cOf(mixed)).toBe(2 + 1 + 0 + 2);
  });
});

describe('W-N: nothing is mutated, archived, or deleted', () => {
  it('does not mutate or reorder the input array', () => {
    const input = [bucketAt(H, 1), bucketAt(H - 50, 1), bucketAt(H - 71, 1)];
    const before = input.map((b) => b.hourIndex);
    const votes = input.map((b) => b.upvotes);

    getActiveBuckets(input, H);
    cOf(input);

    expect(input.map((b) => b.hourIndex)).toEqual(before);
    expect(input.map((b) => b.upvotes)).toEqual(votes);
  });

  it('leaves excluded (archived) records intact in the caller array', () => {
    const archived = bucketAt(H - 100, 5);
    const input = [archived, bucketAt(H, 5)];

    getActiveBuckets(input, H);
    cOf(input);

    // Still present, still holding its votes. Selection is not deletion.
    expect(input).toHaveLength(2);
    expect(archived.upvotes).toBe(5);
    expect(archived.hourIndex).toBe(hour(H - 100));
  });

  it('leaves future records intact', () => {
    const future = bucketAt(H + 10, 5);
    const input = [future];
    cOf(input);
    expect(input).toHaveLength(1);
    expect(future.upvotes).toBe(5);
  });

  it('returns a new array rather than the input reference', () => {
    const input = [bucketAt(H, 1)];
    const r = getActiveBuckets(input, H);
    if (!r.ok) throw new Error('unexpected rejection');
    expect(r.value).not.toBe(input);
  });

  it('does not invent a lifecycle field on any record', () => {
    const input = [bucketAt(H - 100, 1), bucketAt(H, 1)];
    cOf(input);
    for (const b of input) {
      expect(Object.keys(b).sort()).toEqual(
        ['downvotes', 'hourIndex', 'phase', 'upvotes', 'version'].sort(),
      );
    }
  });

  it('selects from hour-bearing data without mutating it', () => {
    const records = [
      { hourIndex: hour(H - 100), c: 2 },
      { hourIndex: hour(H - 5), c: 1 },
      { hourIndex: hour(H + 3), c: 2 },
    ];
    const before = JSON.stringify(records);
    const r = selectActive(records, win());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.map((x) => x.hourIndex)).toEqual([hour(H - 5)]);
    }
    expect(JSON.stringify(records)).toBe(before);
  });
});

describe('W-V: invalid input is rejected, not coerced', () => {
  it('rejects a NaN reference hour', () => {
    const r = getActiveWindow(Number.NaN as HourIndex);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
  });

  it('rejects an infinite reference hour', () => {
    expect(getActiveWindow(Number.POSITIVE_INFINITY as HourIndex).ok).toBe(false);
  });

  it('rejects a fractional reference hour', () => {
    expect(getActiveWindow(1000.5 as HourIndex).ok).toBe(false);
  });

  it('propagates rejection through getActiveBuckets and sumActiveC', () => {
    expect(getActiveBuckets([], Number.NaN as HourIndex).ok).toBe(false);
    expect(sumActiveC([], Number.NaN as HourIndex).ok).toBe(false);
  });

  it('fails the whole sum when an ACTIVE bucket is corrupt', () => {
    const corrupt = { ...bucketAt(H - 5, 1), upvotes: Number.NaN };
    const r = sumActiveC([corrupt, bucketAt(H, 5)], H);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
  });

  it('ignores a corrupt EXPIRED bucket without failing', () => {
    // An expired record is outside the window, so it is never thresholded.
    const corruptOld = { ...bucketAt(H - 200, 1), upvotes: Number.NaN };
    const r = sumActiveC([corruptOld, bucketAt(H, 5)], H);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(C_MAX);
  });
});

describe('W-R: evaluation is deterministic', () => {
  it('returns identical results across repeated evaluation', () => {
    const data = [bucketAt(H - 30, 5), bucketAt(H, 1), bucketAt(H - 70, 3)];
    const first = cOf(data);
    for (let i = 0; i < 25; i++) {
      expect(cOf(data)).toBe(first);
    }
  });

  it('is unaffected by evaluating in a different order', () => {
    const data = [bucketAt(H - 30, 5), bucketAt(H, 1), bucketAt(H - 70, 3)];
    expect(cOf([...data].reverse())).toBe(cOf(data));
  });

  it('expires the oldest hour as the reference hour advances', () => {
    // H−71, H−50 and H are all active at reference hour H.
    const data = [bucketAt(H - 71, 5), bucketAt(H - 50, 5), bucketAt(H, 5)];
    expect(cOf(data, H)).toBe(3 * C_MAX);

    // Advance one hour: the window is now H−70 … H+1, so H−71 has expired.
    expect(cOf(data, hour(H + 1))).toBe(2 * C_MAX);

    // Advance again: the window is H−69 … H+2, still two active.
    expect(cOf(data, hour(H + 2))).toBe(2 * C_MAX);
  });

  it('admits a future hour only once the reference hour reaches it', () => {
    // H+1 is in the future at reference hour H, so it must be excluded.
    const data = [bucketAt(H - 71, 5), bucketAt(H, 5), bucketAt(H + 1, 5)];

    // At H the window is H−71 … H: H−71 and H are active, H+1 is not.
    expect(cOf(data, H)).toBe(2 * C_MAX);

    // At H+1 the window is H−70 … H+1: H−71 expired, H and H+1 are active.
    expect(cOf(data, hour(H + 1))).toBe(2 * C_MAX);
  });

  it('never includes more than 72 hours of C, however long the history', () => {
    // A very long history, summed at a single reference hour, is capped by
    // the window rather than by the amount of stored data.
    const long: VoteBucket[] = [];
    for (let i = 0; i < 500; i++) {
      long.push(bucketAt(H - i, 5));
    }
    expect(cOf(long, H)).toBe(72 * C_MAX);
  });
});

describe('W-G: the module stays within Phase 5 scope', () => {
  it('imports no Kura, platform, ranking, simulation, UI, or network module', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./hours.ts', import.meta.url)),
      'utf8',
    );

    const withoutComments = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const statements =
      withoutComments.match(/import[\s\S]*?from\s+'[^']+'\s*;?/g) ?? [];
    const specifiers = statements.map(
      (s) => /from\s+'([^']+)'/.exec(s)?.[1] ?? '',
    );

    expect(specifiers.slice().sort()).toEqual([
      '../constants',
      '../types',
      '../votes/threshold',
    ]);

    for (const s of specifiers) {
      expect(s).not.toMatch(/kura/i);
      expect(s).not.toMatch(/platform/i);
      expect(s).not.toMatch(/ranking|score/i);
      expect(s).not.toMatch(/sim/i);
      expect(s).not.toMatch(/react|supabase/i);
    }
  });

  it('contains no real clock, randomness, or global state', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./hours.ts', import.meta.url)),
      'utf8',
    );
    // Strip comments so documentation mentioning the clock is not flagged.
    const body = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    expect(body).not.toMatch(/Date\.|Math\.random|performance\.|globalThis/);
    expect(body).not.toMatch(/localStorage|fetch\(/);
  });
});

// ───────────────────────────────────────────────────────────────────────────

describe('W-D: duplicate hour indices are invalid data (Phase 5 revision)', () => {
  it('rejects a duplicate ACTIVE hour with DUPLICATE_HOUR_INDEX', () => {
    const r = getActiveBuckets([bucketAt(H - 5, 1), bucketAt(H - 5, 2)], H);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
      expect(r.error.context?.hourIndex).toBe(String(H - 5));
    }
  });

  it('rejects a duplicate EXPIRED hour', () => {
    // A repeated hour is a data defect whether or not it is currently active.
    const r = getActiveBuckets([bucketAt(H - 200, 1), bucketAt(H - 200, 2)], H);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
  });

  it('rejects a duplicate FUTURE hour', () => {
    const r = getActiveBuckets([bucketAt(H + 9, 1), bucketAt(H + 9, 2)], H);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
  });

  it('rejects the exact sequence from the decision: H-5, H-4, H-4, H-3', () => {
    const seq = [
      bucketAt(H - 5, 1),
      bucketAt(H - 4, 1),
      bucketAt(H - 4, 1),
      bucketAt(H - 3, 1),
    ];
    const r = getActiveBuckets(seq, H);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
  });

  it('detects duplicates independently of input ordering', () => {
    const base = [
      bucketAt(H - 5, 1),
      bucketAt(H - 4, 1),
      bucketAt(H - 4, 2),
      bucketAt(H - 3, 1),
    ];
    const permutations = [
      base,
      [...base].reverse(),
      [base[1], base[3], base[2], base[0]],
      [base[2], base[0], base[3], base[1]],
    ];
    for (const perm of permutations) {
      const r = getActiveBuckets(perm, H);
      expect(r.ok, 'must reject regardless of order').toBe(false);
      if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
    }
  });

  it('propagates the rejection through sumActiveC', () => {
    const dupes = [bucketAt(H - 5, 1), bucketAt(H - 5, 2)];
    const r = sumActiveC(dupes, H);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
  });

  it('never double-counts: rejection instead of a summed value', () => {
    // The failure mode this rule exists to prevent. If duplicates were summed,
    // this would silently yield a larger, entirely fictional C.
    const dupes = [bucketAt(H - 5, 5), bucketAt(H - 5, 5)];
    const r = sumActiveC(dupes, H);
    expect(r.ok).toBe(false);
    expect('value' in r).toBe(false);
  });

  it('leaves valid UNIQUE sparse buckets behaving exactly as before', () => {
    // The revision must not disturb any non-duplicate behaviour.
    const sparse = [bucketAt(H - 71, 5), bucketAt(H - 10, 5), bucketAt(H, 5)];
    const r = getActiveBuckets(sparse, H);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toHaveLength(3);
      expect(r.value.map((b) => b.hourIndex)).toEqual([
        hour(H - 71),
        hour(H - 10),
        H,
      ]);
    }
    expect(cOf(sparse)).toBe(3 * C_MAX);
  });

  it('still accepts a fully dense, unique 72-hour window', () => {
    const dense: VoteBucket[] = [];
    for (let i = 71; i >= 0; i--) dense.push(bucketAt(H - i, 5));
    const r = getActiveBuckets(dense, H);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toHaveLength(72);
    expect(cOf(dense)).toBe(72 * C_MAX);
  });

  it('accepts an empty collection', () => {
    const r = getActiveBuckets([], H);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([]);
  });
});

