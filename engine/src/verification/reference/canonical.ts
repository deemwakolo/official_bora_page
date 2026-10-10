/**
 * BORA — PHASE 21 INDEPENDENT REFERENCE MODEL
 * ═══════════════════════════════════════════════════════════════════════════
 * Canonical comparison form.
 *
 * ── WHY A CANONICAL FORM AT ALL ───────────────────────────────────────────────
 *
 * Two correct implementations of the same chart will not produce objects with
 * identical SHAPES. The engine returns engine types with engine field names and
 * its own entry ordering conventions; the reference model returns its own.
 * Comparing the raw objects would compare vocabulary, not mathematics.
 *
 * So both are reduced to ONE flat row per song, holding only quantities the
 * contract defines, in a fixed field order, with songs ordered by songId rather
 * than by whichever implementation happened to iterate first.
 *
 * Nothing irrelevant is included. Object key order, array order, and the
 * presence of bookkeeping fields are all excluded, because none of them is a
 * mathematical claim.
 *
 * PURE: no imports from `src/engine/**`. This file knows nothing about the
 * engine; the test-layer adapter is what translates engine output into these
 * rows.
 */

/** One song's full mathematical claim, in comparison order. */
export interface CanonicalRow {
  readonly songId: string;
  readonly k: number;
  readonly activeC: number;
  readonly tC: number;
  readonly xp: number;
  readonly freshKura: number;
  readonly persistentKuraBefore: number;
  readonly persistentKuraNext: number | null;
  readonly yt: number;
  readonly sp: number;
  readonly bp: number;
  readonly platformTotal: number;
  readonly boraScore: number;
  readonly rank: number | null;
}

/** A whole chart's mathematical claim. */
export interface CanonicalChart {
  readonly referenceHour: number;
  readonly tC: number;
  readonly rows: readonly CanonicalRow[];
  readonly excludedVaulted: readonly string[];
  readonly platformTotals: {
    readonly youtube: number;
    readonly spotify: number;
    readonly boomplay: number;
  };
}

/**
 * Order rows deterministically by songId.
 *
 * Sorting is done here, once, so neither implementation's own ordering can
 * leak into the comparison. Two charts that agree mathematically must produce
 * identical canonical rows regardless of how either one ordered its output.
 */
export function sortRows(rows: readonly CanonicalRow[]): CanonicalRow[] {
  return [...rows].sort((a, b) => (a.songId < b.songId ? -1 : a.songId > b.songId ? 1 : 0));
}

/** Build a canonical chart from parts, applying the canonical ordering. */
export function canonicalChart(
  referenceHour: number,
  tC: number,
  rows: readonly CanonicalRow[],
  excludedVaulted: readonly string[],
  platformTotals: {
    readonly youtube: number;
    readonly spotify: number;
    readonly boomplay: number;
  },
): CanonicalChart {
  return {
    referenceHour,
    tC,
    rows: sortRows(rows),
    excludedVaulted: [...excludedVaulted].sort(),
    platformTotals,
  };
}

/**
 * Canonical field order. Declared as data so the serialiser and the differ
 * cannot drift apart, and so a newly added field is a visible edit rather than
 * a silent omission.
 */

/**
 * A deterministic text serialisation.
 *
 * Phase 21 §27 requires that two runs of the conformance suite produce
 * BYTE-IDENTICAL output. A fixed field order with `String(x)` per value is
 * exactly that: doubles render via their shortest round-tripping decimal form,
 * which is stable for a given value in a given runtime, so two identical
 * computations produce identical bytes.
 *
 * Values are rendered as TEXT rather than compared as objects, so the
 * determinism check cannot be satisfied by two different values that happen to
 * stringify alike.
 */
export function serialise(chart: CanonicalChart): string {
  const lines: string[] = [];
  lines.push(`referenceHour=${chart.referenceHour}`);
  lines.push(`tC=${String(chart.tC)}`);
  lines.push(`excluded=${chart.excludedVaulted.join(',')}`);
  lines.push(
    `platformTotals=${String(chart.platformTotals.youtube)},` +
      `${String(chart.platformTotals.spotify)},` +
      `${String(chart.platformTotals.boomplay)}`,
  );
  for (const row of chart.rows) {
    lines.push(ROW_FIELDS.map((field) => `${field}=${String(row[field])}`).join('|'));
  }
  return lines.join('\n');
}

/** A single field-level difference between two canonical charts. */
export interface CanonicalDifference {
  readonly songId: string;
  readonly field: string;
  readonly expected: string;
  readonly actual: string;
  readonly delta: number;
}

/**
 * Compare two canonical charts numerically, reporting every difference.
 *
 * Tolerance is passed in explicitly by the caller and is NEVER widened
 * silently: a caller wanting 1e-6 has to say so, and the tests that do name the
 * extreme-seed reason in their own text.
 *
 * Discrete quantities — `k`, `rank`, and song identity — are compared EXACTLY,
 * with no tolerance at all. They are integers and orderings; an epsilon on a
 * rank is meaningless and would mask a real disagreement.
 */
export function diffCanonical(
  expected: CanonicalChart,
  actual: CanonicalChart,
  tolerance: number,
): CanonicalDifference[] {
  const differences: CanonicalDifference[] = [];

  const expectId = expected.rows.map((r) => r.songId).join(',');
  const actualId = actual.rows.map((r) => r.songId).join(',');
  if (expectId !== actualId) {
    differences.push({
      songId: '*',
      field: 'population',
      expected: expectId,
      actual: actualId,
      delta: Number.NaN,
    });
    return differences;
  }

  if (expected.excludedVaulted.join(',') !== actual.excludedVaulted.join(',')) {
    differences.push({
      songId: '*',
      field: 'excludedVaulted',
      expected: expected.excludedVaulted.join(','),
      actual: actual.excludedVaulted.join(','),
      delta: Number.NaN,
    });
  }

  for (let i = 0; i < expected.rows.length; i++) {
    const a = expected.rows[i];
    const b = actual.rows[i];

    for (const field of ROW_FIELDS) {
      const left = a[field];
      const right = b[field];

      if (field === 'songId' || field === 'k' || field === 'rank') {
        if (left !== right) {
          differences.push({
            songId: a.songId,
            field,
            expected: String(left),
            actual: String(right),
            delta: Number.NaN,
          });
        }
        continue;
      }

      const leftNum = left as number;
      const rightNum = right as number;
      const delta = Math.abs(leftNum - rightNum);

      if (!(delta <= tolerance)) {
        differences.push({
          songId: a.songId,
          field,
          expected: String(leftNum),
          actual: String(rightNum),
          delta,
        });
      }
    }
  }

  return differences;
}

/** Render differences as a readable failure message. */
export function formatDifferences(
  differences: readonly CanonicalDifference[],
): string {
  return differences
    .map(
      (d) =>
        `  ${d.songId}.${d.field}: expected ${d.expected}, engine ${d.actual}` +
        (Number.isNaN(d.delta) ? '' : ` (|Δ| = ${d.delta.toExponential(3)})`),
    )
    .join('\n');
}

export const ROW_FIELDS = [
  'songId',
  'k',
  'activeC',
  'tC',
  'xp',
  'freshKura',
  'persistentKuraBefore',
  'persistentKuraNext',
  'yt',
  'sp',
  'bp',
  'platformTotal',
  'boraScore',
  'rank',
] as const;
