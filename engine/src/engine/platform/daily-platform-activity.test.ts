import { describe, expect, it } from 'vitest';
import { rankToActivity, sumLatestRankActivity } from './daily-platform-activity';

describe('rankToActivity', () => {
  it('converts higher positions to proportionally lower activity', () => {
    expect(
      rankToActivity([
        { songId: 'first', rank: 1 },
        { songId: 'second', rank: 2 },
        { songId: 'tenth', rank: 10 },
      ]),
    ).toEqual({
      ok: true,
      value: [
        { songId: 'first', activity: 1 },
        { songId: 'second', activity: 0.5 },
        { songId: 'tenth', activity: 0.1 },
      ],
    });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid rank %s',
    (rank) => {
      expect(rankToActivity([{ songId: 'song', rank }]).ok).toBe(false);
    },
  );

  it('rejects duplicate song ids instead of double-counting a platform', () => {
    expect(
      rankToActivity([
        { songId: 'song', rank: 1 },
        { songId: 'song', rank: 2 },
      ]),
    ).toMatchObject({ ok: false });
  });

  it('accepts an empty population without manufacturing activity', () => {
    expect(rankToActivity([])).toEqual({ ok: true, value: [] });
  });
});

describe('sumLatestRankActivity', () => {
  it('sums inverse ranks over the latest seven EAT-day snapshots', () => {
    const snapshots = Array.from({ length: 8 }, (_, index) => ({
      effectiveDate: `2026-01-${String(index + 1).padStart(2, '0')}`,
      ranks:
        index === 0
          ? [{ songId: 'a', rank: 1 }, { songId: 'b', rank: 2 }]
          : [{ songId: 'a', rank: 2 }, { songId: 'b', rank: 1 }],
    }));

    const result = sumLatestRankActivity(snapshots, ['a', 'b']);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([
        { songId: 'a', activity: 3.5 },
        { songId: 'b', activity: 7 },
      ]);
    }
  });

  it('rejects snapshots that do not contain the complete active population', () => {
    const result = sumLatestRankActivity(
      [{
        effectiveDate: '2026-01-01',
        ranks: [{ songId: 'a', rank: 1 }],
      }],
      ['a', 'b'],
    );

    expect(result.ok).toBe(false);
  });

  it('ignores extra ranked songs outside the active population', () => {
    const result = sumLatestRankActivity(
      [{
        effectiveDate: '2026-01-01',
        ranks: [
          { songId: 'active', rank: 1 },
          { songId: 'vaulted', rank: 2 },
        ],
      }],
      ['active'],
    );

    expect(result).toEqual({
      ok: true,
      value: [{ songId: 'active', activity: 1 }],
    });
  });

  it('rejects tied positions within a platform snapshot', () => {
    const result = sumLatestRankActivity(
      [{
        effectiveDate: '2026-01-01',
        ranks: [{ songId: 'a', rank: 1 }, { songId: 'b', rank: 1 }],
      }],
      ['a', 'b'],
    );

    expect(result.ok).toBe(false);
  });
});
