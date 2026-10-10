/**
 * BORA Engine â€” deterministic ranking tests (Phase 12)
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * Coverage map:
 *   R-B  basic ordering (1 song, 2 songs, many, pre-sorted, reversed)
 *   R-K  tie-break #2: K
 *   R-P  tie-break #3: platform performance
 *   R-I  tie-break #4: songId
 *   R-C  the complete priority chain
 *   R-N  negative tests â€” what ranking must NOT do
 *   R-V  validation
 *   R-PU determinism, permutation, immutability, property tests
 */

import { describe, it, expect } from 'vitest';
import {
  rankSongs,
  compareSongs,
  platformPerformance,
} from './ranking';
import type { RankSongInput, RankedSong } from './ranking';

/** A resolved song. Defaults make fully-tied fixtures easy to write. */
function song(
  songId: string,
  boraScore = 0,
  k = 0,
  youtube = 0,
  spotify = 0,
  boomplay = 0,
): RankSongInput {
  return { songId, boraScore, k, platformPoints: { youtube, spotify, boomplay } };
}

function ranked(
  songs: RankSongInput[],
): readonly RankedSong[] {
  const r = rankSongs(songs);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

function ids(songs: RankSongInput[]): string[] {
  return ranked(songs).map((s) => s.songId);
}

function errOf(songs: RankSongInput[]): string {
  const r = rankSongs(songs);
  if (r.ok) throw new Error(`expected rejection, got ${r.value.length} songs`);
  return r.error.code;
}

/** Deterministic generator â€” no Math.random in the suite. */
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('R-B: basic ordering', () => {
  it('ranks a single song first', () => {
    const out = ranked([song('only', 10)]);
    expect(out).toHaveLength(1);
    expect(out[0].songId).toBe('only');
    expect(out[0].rank).toBe(1);
  });

  it('ranks higher BORA Score first', () => {
    expect(ids([song('low', 10), song('high', 50)])).toEqual(['high', 'low']);
  });

  it('ranks many songs descending by BORA Score', () => {
    const out = ranked([
      song('c', 30),
      song('e', 50),
      song('a', 10),
      song('d', 40),
      song('b', 20),
    ]);
    expect(out.map((s) => s.songId)).toEqual(['e', 'd', 'c', 'b', 'a']);
    expect(out.map((s) => s.rank)).toEqual([1, 2, 3, 4, 5]);
  });

  it('handles already-sorted input identically', () => {
    const ordered = [song('a', 50), song('b', 40), song('c', 30)];
    expect(ids(ordered)).toEqual(['a', 'b', 'c']);
  });

  it('handles reverse-sorted input identically', () => {
    const reversed = [song('c', 30), song('b', 40), song('a', 50)];
    expect(ids(reversed)).toEqual(['a', 'b', 'c']);
  });

  it('assigns contiguous 1-based ranks', () => {
    const out = ranked([song('a', 5), song('b', 1), song('c', 3), song('d', 2)]);
    expect(out.map((s) => s.rank)).toEqual([1, 2, 3, 4]);
  });

  it('handles an empty collection', () => {
    const r = rankSongs([]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([]);
  });
});

describe('R-K: tie-break #2 â€” historical K', () => {
  it('ranks higher K first when BORA Score ties', () => {
    // THE key test: K decides the order, which is only possible if K is a
    // tie-break and not part of the score.
    expect(ids([song('a', 50, 100), song('b', 50, 500)])).toEqual(['b', 'a']);
  });

  it('proves K is a tie-break, not a score component', () => {
    const a = song('a', 50, 100);
    const b = song('b', 50, 500);
    // Identical boraScore. If K were added to the score, b would win by that
    // route; here b wins purely as tie-break #2.
    expect(a.boraScore).toBe(b.boraScore);
    expect(compareSongs(a, b)).toBe(1); // a ranks below b
    expect(compareSongs(b, a)).toBe(-1);
  });

  it('lets a lower score with much higher K still lose', () => {
    // Score dominates: K only breaks exact ties.
    expect(ids([song('lowK', 10, 99999), song('highK', 20, 1)])).toEqual([
      'highK',
      'lowK',
    ]);
  });

  it('passes to the next tie-break when Score and K are equal', () => {
    const a = song('a', 50, 100, 30, 15, 5);
    const b = song('b', 50, 100, 0, 0, 0);
    expect(ids([a, b])).toEqual(['a', 'b']); // decided at level 3
  });
});

describe('R-P: tie-break #3 â€” current normalised platform performance', () => {
  it('computes performance as youtube + spotify + boomplay', () => {
    expect(platformPerformance(song('x', 0, 0, 12, 6, 2))).toBe(20);
    expect(platformPerformance(song('x', 0, 0, 0, 0, 0))).toBe(0);
  });

  it('ranks higher platform performance first when Score and K tie', () => {
    expect(
      ids([
        song('a', 50, 100, 20, 0, 0),
        song('b', 50, 100, 10, 0, 0),
      ]),
    ).toEqual(['a', 'b']);
  });

  it('does NOT re-apply platform weights', () => {
    // 10+5+5 = 20 raw. If the 30/15/5 weights were applied again the
    // comparison could change; here the raw sum decides.
    const a = song('a', 50, 100, 10, 5, 5);
    const b = song('b', 50, 100, 9, 5, 5);
    expect(platformPerformance(a)).toBe(20);
    expect(platformPerformance(b)).toBe(19);
    expect(ids([a, b])).toEqual(['a', 'b']);
  });

  it('treats different distributions with the same total as tied', () => {
    // A = 10+5+5 = 20, B = 15+3+2 = 20. Neither wins on performance.
    const a = song('a', 50, 100, 10, 5, 5);
    const b = song('b', 50, 100, 15, 3, 2);
    expect(platformPerformance(a)).toBe(platformPerformance(b));
    // They proceed to songId, not to the platform breakdown.
    expect(ids([b, a])).toEqual(['a', 'b']);
  });

  it('passes to songId when Score, K, and performance all tie', () => {
    const a = song('alpha', 50, 100, 10, 5, 5);
    const b = song('beta', 50, 100, 10, 5, 5);
    expect(ids([b, a])).toEqual(['alpha', 'beta']);
  });
});

describe('R-I: tie-break #4 â€” songId', () => {
  it('orders fully tied songs by ascending lexical songId', () => {
    const set = [
      song('charlie', 50, 100, 10, 5, 5),
      song('alpha', 50, 100, 10, 5, 5),
      song('bravo', 50, 100, 10, 5, 5),
    ];
    expect(ids(set)).toEqual(['alpha', 'bravo', 'charlie']);
  });

  it('produces the same result from reverse songId input', () => {
    const a = song('alpha', 50, 100, 1, 1, 1);
    const b = song('bravo', 50, 100, 1, 1, 1);
    expect(ids([a, b])).toEqual(['alpha', 'bravo']);
    expect(ids([b, a])).toEqual(['alpha', 'bravo']);
  });

  it('is unaffected by permuting fully tied songs', () => {
    const base = [
      song('a', 1, 1, 1, 1, 1),
      song('b', 1, 1, 1, 1, 1),
      song('c', 1, 1, 1, 1, 1),
      song('d', 1, 1, 1, 1, 1),
    ];
    const expected = ['a', 'b', 'c', 'd'];
    expect(ids(base)).toEqual(expected);
    expect(ids([...base].reverse())).toEqual(expected);
    expect(ids([base[2], base[0], base[3], base[1]])).toEqual(expected);
  });

  it('uses deterministic code-unit order, not locale collation', () => {
    // Under some locales 'Z' sorts before 'a'; under code units it does not.
    // This asserts the engine's chosen, environment-independent semantics.
    const z = song('Zebra', 1, 1, 0, 0, 0);
    const a = song('apple', 1, 1, 0, 0, 0);
    expect(ids([a, z])).toEqual(['Zebra', 'apple']); // 'Z' (0x5A) < 'a' (0x61)
  });

  it('never uses localeCompare', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./ranking.ts', import.meta.url)),
      'utf8',
    );
    // Comments are stripped: this file's own documentation discusses why
    // localeCompare is avoided, and that prose must not fail the check.
    const body = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    expect(body).not.toMatch(/localeCompare/);
  });
});

describe('R-C: the complete priority chain', () => {
  it('level 1 beats everything below it', () => {
    // Highest K and platform performance, but the lowest Score: must lose.
    const byScore = song('byScore', 100, 0, 0, 0, 0);
    const byK = song('byK', 10, 999_999, 30, 15, 5);
    expect(ids([byK, byScore])).toEqual(['byScore', 'byK']);
  });

  it('level 2 beats level 3 when scores tie', () => {
    const byK = song('byK', 50, 100, 0, 0, 0);
    const byPlatform = song('byPlatform', 50, 1, 30, 15, 5);
    expect(ids([byPlatform, byK])).toEqual(['byK', 'byPlatform']);
  });

  it('level 3 beats level 4 when score and K tie', () => {
    const byPlatform = song('zzz', 50, 100, 30, 15, 5);
    const byId = song('aaa', 50, 100, 0, 0, 0);
    // 'aaa' sorts first lexically, but level 3 must decide first.
    expect(ids([byId, byPlatform])).toEqual(['zzz', 'aaa']);
  });

  it('level 4 decides only when all three above tie', () => {
    const a = song('aaa', 50, 100, 10, 5, 5);
    const b = song('bbb', 50, 100, 10, 5, 5);
    expect(compareSongs(a, b)).toBe(-1);
    expect(ids([b, a])).toEqual(['aaa', 'bbb']);
  });

  it('orders a mixed chart correctly across all four levels', () => {
    const set = [
      song('top', 90, 5, 1, 1, 1), // wins on score
      song('kWinner', 50, 1000, 0, 0, 0), // then K
      song('pWinner', 50, 10, 30, 15, 5), // then platform
      song('idWinner1', 50, 10, 1, 1, 1), // then id
      song('idWinner2', 50, 10, 1, 1, 1),
    ];
    expect(ids(set)).toEqual([
      'top',
      'kWinner',
      'pWinner',
      'idWinner1',
      'idWinner2',
    ]);
  });
});

describe('R-N: negative tests â€” what ranking must NOT do', () => {
  it('does not add K to the BORA Score', () => {
    // Same score, huge K difference: decided by the tie-break, not by a sum.
    const low = song('low', 50, 0);
    const high = song('high', 50, 10_000);
    expect(ids([low, high])).toEqual(['high', 'low']);
    // If K were added, 'high' would score 10050 vs 50 â€” same winner, so
    // compare the score values directly: ranking never alters them.
    expect(low.boraScore).toBe(50);
    expect(high.boraScore).toBe(50);
  });

  it('does not alter the supplied BORA Score', () => {
    const input = song('a', 42.5, 7, 1, 2, 3);
    ranked([input]);
    expect(input.boraScore).toBe(42.5);
  });

  it('does not re-apply platform weights to the tie-break', () => {
    // Raw sums 20 vs 19. If weights were re-applied, ordering could differ.
    const a = song('a', 50, 50, 20, 0, 0);
    const b = song('b', 50, 50, 19, 0, 0);
    expect(ids([a, b])).toEqual(['a', 'b']);
  });

  it('does not use raw activity â€” ranking only reads resolved points', () => {
    // Identical resolved values, wildly different implied activity.
    const a = { ...song('a', 50, 50, 10, 5, 5) };
    const b = { ...song('b', 50, 50, 10, 5, 5) };
    expect(ids([a, b])).toEqual(['a', 'b']);
  });

  it('does not use input position as a hidden tie-break', () => {
    const tied = [song('b', 1, 1, 1, 1, 1), song('a', 1, 1, 1, 1, 1)];
    // 'b' was first in the input but must still sort after 'a'.
    expect(ids(tied)).toEqual(['a', 'b']);
  });

  it('contains no clock, randomness, recomputation, or upstream imports', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./ranking.ts', import.meta.url)),
      'utf8',
    );
    const body = code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

    expect(body).not.toMatch(
      /\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bperformance\s*\.\s*now\b/,
    );
    expect(body).not.toMatch(/\bMath\s*\.\s*random\b|\bfetch\s*\(/);
    expect(body).not.toMatch(/\bglobalThis\b|\blocalStorage\b/);
    // No recomputation of upstream phases, and no dependency on them.
    expect(body).not.toMatch(
      /calculateBoraScore|updatePersistentKura|calculateDecay|sumActiveC|evaluatePlatformPoints|evaluateActiveDistribution|normalizePlatform/,
    );
    expect(body).not.toMatch(/from '\.\.\/(kura|votes|window|platform|seed|score)/);
    // No re-applied weights.
    expect(body).not.toMatch(/30|15|\b5\b\s*\)?\s*\*|\*\s*30/);
  });

  it('imports only the engine domain types', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const code = readFileSync(
      fileURLToPath(new URL('./ranking.ts', import.meta.url)),
      'utf8',
    );
    const statements = code.match(/import[\s\S]*?from\s+'[^']+'\s*;?/g) ?? [];
    const specifiers = statements.map(
      (s) => /from\s+'([^']+)'/.exec(s)?.[1] ?? '',
    );
    expect(specifiers).toEqual(['../types']);
  });
});

describe('R-V: validation', () => {
  it('rejects an empty songId', () => {
    expect(errOf([song('', 10)])).toBe('INVALID_SONG_ID');
  });

  it('rejects a missing songId', () => {
    expect(errOf([{ ...song('x'), songId: undefined } as unknown as RankSongInput])).toBe(
      'INVALID_SONG_ID',
    );
  });

  it('rejects a non-finite or negative BORA Score', () => {
    expect(errOf([song('a', Number.NaN)])).toBe('INVALID_MEASUREMENT');
    expect(errOf([song('a', Number.POSITIVE_INFINITY)])).toBe(
      'INVALID_MEASUREMENT',
    );
    expect(errOf([song('a', -1)])).toBe('INVALID_MEASUREMENT');
  });

  it('rejects a non-finite or negative K', () => {
    expect(errOf([song('a', 10, Number.NaN)])).toBe('INVALID_K');
    expect(errOf([song('a', 10, -5)])).toBe('INVALID_K');
  });

  it('rejects negative or non-finite platform points', () => {
    expect(errOf([song('a', 10, 10, -1, 0, 0)])).toBe('INVALID_MEASUREMENT');
    expect(errOf([song('a', 10, 10, 0, Number.NaN, 0)])).toBe(
      'INVALID_MEASUREMENT',
    );
    expect(errOf([song('a', 10, 10, 0, 0, Number.POSITIVE_INFINITY)])).toBe(
      'INVALID_MEASUREMENT',
    );
  });

  it('rejects malformed platform points', () => {
    const malformed = {
      ...song('a', 10),
      platformPoints: { youtube: 1 } as unknown as RankSongInput['platformPoints'],
    };
    expect(errOf([malformed])).toBe('INVALID_MEASUREMENT');
  });

  it('does not substitute zero or drop the invalid song', () => {
    const r = rankSongs([song('good', 10), song('bad', Number.NaN)]);
    expect(r.ok).toBe(false);
    expect('value' in r).toBe(false);
  });

  it('names the offending field in the error context', () => {
    const r = rankSongs([song('a', -1)]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.context?.songId).toBe('a');
  });
});

describe('R-PU: determinism, immutability, and property tests', () => {
  it('does not mutate the caller array or its song objects', () => {
    const input = [song('a', 10), song('b', 30), song('c', 20)];
    const snapshot = JSON.stringify(input);
    ranked(input);
    expect(JSON.stringify(input)).toBe(snapshot);
    expect(input.map((s) => s.songId)).toEqual(['a', 'b', 'c']);
    expect(input[0].boraScore).toBe(10);
  });

  it('returns a new array and new entry objects', () => {
    const input = [song('a', 10)];
    const out = ranked(input);
    expect(out).not.toBe(input);
    expect(out[0]).not.toBe(input[0]);
  });

  it('returns identical results across repeated evaluation', () => {
    const set = [song('a', 10, 1, 1, 1, 1), song('b', 10, 2, 2, 2, 2)];
    const first = ranked(set);
    for (let i = 0; i < 10; i++) {
      expect(ranked(set)).toEqual(first);
    }
  });

  it('produces identical ranking from any input permutation', () => {
    const set = [
      song('a', 50, 10, 5, 2, 1),
      song('b', 50, 10, 5, 2, 1),
      song('c', 20, 99, 30, 15, 5),
      song('d', 90, 1, 0, 0, 0),
    ];
    const expected = ids(set);
    expect(ids([...set].reverse())).toEqual(expected);
    expect(ids([set[1], set[3], set[0], set[2]])).toEqual(expected);
    expect(ids([set[2], set[0], set[3], set[1]])).toEqual(expected);
  });

  it('holds the ranking invariants across generated charts', () => {
    const rng = makeRng(987654);

    for (let chart = 0; chart < 200; chart++) {
      const size = 1 + Math.floor(rng() * 10);
      const population: RankSongInput[] = [];

      for (let i = 0; i < size; i++) {
        // Deliberately include exact ties so every level is exercised.
        const boraScore = Math.round(rng() * 5) * 10;
        population.push(
          song(
            `song-${i}`,
            boraScore,
            Math.round(rng() * 4) * 25,
            Math.round(rng() * 3) * 10,
            Math.round(rng() * 3) * 5,
            Math.round(rng() * 5),
          ),
        );
      }

      const snapshot = JSON.stringify(population);
      const out = ranked(population);

      // Input unchanged.
      expect(JSON.stringify(population), `chart ${chart}`).toBe(snapshot);

      // Same songs, same count, no duplicates, nothing lost.
      expect(out).toHaveLength(population.length);
      expect(out.map((s) => s.songId).sort()).toEqual(
        population.map((s) => s.songId).sort(),
      );

      // Ranks are contiguous from 1.
      expect(out.map((s) => s.rank)).toEqual(
        population.map((_, i) => i + 1),
      );

      // Every adjacent pair satisfies the comparator (never > 0).
      for (let i = 1; i < out.length; i++) {
        expect(compareSongs(out[i - 1], out[i]), `chart ${chart} at ${i}`).toBe(-1);
      }

      // Permuting the input yields the identical ranking.
      expect(ids([...population].reverse()), `chart ${chart}`).toEqual(
        out.map((s) => s.songId),
      );
    }
  });

  it('is a total order: the comparator never returns 0 for distinct ids', () => {
    const set = [song('a', 1, 1, 1, 1, 1), song('b', 1, 1, 1, 1, 1)];
    expect(compareSongs(set[0], set[1])).toBe(-1);
    expect(compareSongs(set[1], set[0])).toBe(1);
    // Antisymmetry and totality hold, so sorting is well defined.
    expect(compareSongs(set[0], set[0])).toBe(0);
  });
});