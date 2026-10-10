/**
 * BORA Engine â€” seed fixture tests (Phase 7, ratified Phase 20R)
 * â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
 *
 * PHASE 20R: the `seedC(p, T_C)` target-share formula was REMOVED from the
 * engine. Its tests are removed with it. The suites below now cover only what
 * remains: the two fixture primitives `seedCPerHour` and `seedHourlyRunway`.
 *
 * Coverage map:
 *   S-D  the uniform 72-hour runway
 *   S-V  validation
 *   S-A  architectural boundary
 *
 * The production seed contract â€” explicit hourly `HourlyCRecord`s supplied from
 * outside the engine â€” is verified in `evaluation/chart.test.ts`.
 */

import { describe, it, expect } from 'vitest';
import { seedCPerHour, seedHourlyRunway, validateSeededHourlyC, MAX_SEED_FIXTURE_TOTAL } from './seed';
import { SEED_RUNWAY_HOURS, C_MAX } from '../constants';

const RUNWAY = SEED_RUNWAY_HOURS; // 72

/** Narrow a Result to its value, failing loudly on an unexpected error. */
function unwrapOk<T, E>(r: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!r.ok) throw new Error(`expected ok, got error`);
  return r.value;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('S-D: uniform 72-hour runway', () => {
  it('divides the seed evenly across all 72 hours', () => {
    const r = seedCPerHour(72);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(1);
  });

  it('produces exactly 72 hourly entries', () => {
    const r = seedHourlyRunway(144);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toHaveLength(RUNWAY);
      expect(RUNWAY).toBe(72);
    }
  });

  it('gives every hour the identical value (no weighting)', () => {
    const r = seedHourlyRunway(72);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const first = r.value[0];
      for (const v of r.value) expect(v).toBe(first);
    }
  });

  it('sums the 72 hourly values back to the fixture total', () => {
    // PHASE 22: totals are bounded by SEED_RUNWAY_HOURS * C_MAX (= 144) so
    // that every per-hour share lands inside the canonical seeded-hourly-C
    // domain [0, C_MAX]. The previous list contained 900 and 1e6, which spread
    // to 12.5 and ~13888 per hour - engine input the engine must reject.
    for (const total of [11.111, 72, 100, 0.5, 0, 144, 1e-9, 143.999]) {
      const r = seedHourlyRunway(total);
      if (!r.ok) throw new Error(r.error.message);
      const sum = r.value.reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - total), `seed=${total}`).toBeLessThanOrEqual(
        Number.EPSILON * 72 * Math.max(1, Math.abs(total)),
      );
    }
  });

  it('preserves a supplied fixture total end to end', () => {
    // The runway must reconstruct the total it was handed â€” nothing added,
    // nothing dropped, no rounding drift beyond floating-point noise.
    const total = 144;
    const r = seedHourlyRunway(total);
    if (!r.ok) throw new Error(r.error.message);
    const sum = r.value.reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - total)).toBeLessThanOrEqual(1e-9);
  });

  it('applies no special coefficient to the current hour', () => {
    // The runway is flat: the newest hour is not weighted differently from the
    // oldest. A transition or recency coefficient here would be an unstated
    // scoring factor.
    const r = seedHourlyRunway(72);
    if (!r.ok) throw new Error(r.error.message);
    expect(new Set(r.value).size).toBe(1);
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('S-V: validation', () => {
  it('rejects a negative or non-finite seed before distribution', () => {
    expect(seedCPerHour(-1).ok).toBe(false);
    expect(seedCPerHour(Number.NaN).ok).toBe(false);
    expect(seedCPerHour(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(seedHourlyRunway(-1).ok).toBe(false);
    expect(seedHourlyRunway(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(seedHourlyRunway(Number.NaN).ok).toBe(false);
  });

  it('never clamps an invalid value into range', () => {
    // A negative seed must NOT become zero; the call must fail outright.
    const r = seedCPerHour(-1);
    expect(r.ok).toBe(false);
    expect('value' in r).toBe(false);
  });

  it('is deterministic across repeated evaluation', () => {
    const first = unwrapOk(seedCPerHour(29.7));
    for (let i = 0; i < 20; i++) {
      expect(unwrapOk(seedCPerHour(29.7))).toBe(first);
    }
  });
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('S-A: architectural boundary', () => {
  /** Read a seed module, stripping comments and string literals. */
  async function codeOf(file: string): Promise<string> {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    return readFileSync(
      fileURLToPath(new URL(file, import.meta.url)),
      'utf8',
    );
  }

  function stripCommentsAndStrings(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
      .replace(/`(?:\\.|[^`\\])*`/g, '""')
      .replace(/'(?:\\.|[^'\\\n])*'/g, '""')
      .replace(/"(?:\\.|[^"\\\n])*"/g, '""');
  }

  function importSpecifiers(src: string): string[] {
    const statements =
      src.match(/import[\s\S]*?from\s+'[^']+'\s*;?/g) ?? [];
    return statements.map((s) => /from\s+'([^']+)'/.exec(s)?.[1] ?? '');
  }

  it('imports no clock, AI, network, simulation, or scoring module', async () => {
    for (const file of ['./seed.ts', './external.ts']) {
      const src = stripCommentsAndStrings(await codeOf(file));
      for (const s of importSpecifiers(src)) {
        // Only the constants and the domain model may be imported.
        expect(s, `${file} imports ${s}`).toMatch(/^\.\.\/(constants|types)$/);
        expect(s).not.toMatch(/threshold|bucket|kura|platform|window/i);
        expect(s).not.toMatch(/ranking|score|seed\/|sim|react|supabase/i);
      }
    }
  });

  it('contains no clock, randomness, fetch, AI call, or global state', async () => {
    for (const file of ['./seed.ts', './external.ts']) {
      const body = stripCommentsAndStrings(await codeOf(file));
      expect(body, file).not.toMatch(
        /\bDate\s*\.\s*now\b|\bnew\s+Date\b|\bperformance\s*\.\s*now\b/,
      );
      expect(body, file).not.toMatch(/\bMath\s*\.\s*random\b|\bfetch\s*\(/);
      expect(body, file).not.toMatch(/\bopenai\b|anthropic|\bllm\b/i);
      expect(body, file).not.toMatch(/\bglobalThis\b|\blocalStorage\b/);
    }
  });

  it('no longer derives a seed from a chart total', async () => {
    // Strip comments and strings first: the module's own documentation
    // legitimately mentions songs, the chart, and other songs, so scanning
    // raw text would flag the very explanation of what it does NOT do.
    const src = stripCommentsAndStrings(await codeOf('./seed.ts'));

    // Phase 20R removed the scalar target-share derivation entirely. The
    // ratified contract supplies explicit hourly records; the engine never
    // turns a chart total into a seed profile.
    expect(src).not.toMatch(/\bseedC\s*\(/);
    expect(src).not.toMatch(/targetShare|TARGET_SHARE/i);

    // No song, chart, or world traversal in executable code: nothing is
    // discovered, estimated, or cached.
    expect(src).not.toMatch(/\bSong\b|\bChartEvaluation\b|\bworld\b|\bsongs\b/i);
    expect(src).not.toMatch(/\.hours\b|\.votes\b|\.platform\b/);
  });

  it('does not implement vote replacement or reseeding', async () => {
    const src = stripCommentsAndStrings(await codeOf('./seed.ts'));
    // Replacement/reseed orchestration belongs to the simulation layer.
    expect(src).not.toMatch(/replace|Reseed|resurrect|actual/i);
  });
});
// ============================================================================
// PHASE 22 -- D-001 RULING: the canonical seeded hourly C domain
// ============================================================================

/**
 * The ruling: an explicit seeded hourly C is valid IFF it is finite and lies
 * in the CLOSED interval [0, C_MAX], where C_MAX = 2.
 *
 * The reason is structural, not cosmetic. The decay equation is
 *
 *     D_h = 0.0025 * (1 - C_h / 2)
 *
 * so a seed above C_MAX drives D_h NEGATIVE and turns decay into GROWTH. Seed
 * values are therefore bounded by the structural maximum hourly C of the BORA
 * activity model.
 *
 * The OLD gate validated a per-hour value by round-tripping it through a scalar
 * -- `seedCPerHour(record.c * 72)` -- intending `c * 72 / 72 === c`. That
 * identity fails at the top of the double range (`(MAX_VALUE / 72) * 72` is
 * Infinity), so the round trip introduced an artificial boundary at
 * MAX_VALUE/72 that the contract never stated, and it did so by multiplying
 * the input by 72 purely to inspect it.
 */
describe('S-22: canonical seeded hourly C domain [0, C_MAX]', () => {
  it('accepts the whole closed interval, including the endpoints', () => {
    for (const c of [0, Number.MIN_VALUE, 1e-12, 0.25, 0.5, 1, 1.25, 1.5, 1.9999, 2]) {
      const r = validateSeededHourlyC(c);
      expect(r.ok, `c=${c}`).toBe(true);
      if (r.ok) expect(r.value).toBe(c);
    }
  });

  it('rejects above C_MAX, below zero, and every non-finite value', () => {
    // -- WHY `2 + 2 * EPSILON` AND NOT `2 + EPSILON` ------------------------
      //
    // `2 + Number.EPSILON === 2` is TRUE. Number.EPSILON is 2^-52, the ulp over
    // the binade [1, 2). The ulp AT 2.0 is 2^-51 - twice as large - because 2.0
    // opens the binade [2, 4). So `2 + EPSILON` is exactly HALF an ulp above 2,
    // an exact tie, and IEEE-754 round-half-to-even resolves it DOWNWARD to 2.0.
    // Writing "just above the maximum" as `2 + EPSILON` therefore re-tests the
    // boundary value 2 itself and proves nothing. The smallest double strictly
    // greater than 2 is 2 + 2*EPSILON.
    expect(2 + Number.EPSILON).toBe(C_MAX);
    const NEXT_ABOVE_C_MAX = 2 + 2 * Number.EPSILON;
    expect(NEXT_ABOVE_C_MAX).toBeGreaterThan(C_MAX);

    const rejected = [
      NEXT_ABOVE_C_MAX,
      2.0000001,
      7.5,
      Number.MAX_VALUE, // finite, but far above C_MAX
      -Number.MIN_VALUE,
      -1e-12,
      -2,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];
    for (const c of rejected) {
      const r = validateSeededHourlyC(c);
      expect(r.ok, `c=${String(c)} should be rejected`).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
    }
  });

  it('rejects rather than clamps: a rejected seed never becomes 0 or C_MAX', () => {
    const high = validateSeededHourlyC(7.5);
    const low = validateSeededHourlyC(-3);
    expect('value' in high).toBe(false);
    expect('value' in low).toBe(false);
  });

  it('preserves the decay invariant 0 <= D <= 0.0025 for every accepted value', () => {
    // The POINT of the upper bound, proved at the authority itself.
    for (let i = 0; i <= 2000; i++) {
      const c = (i / 2000) * 2;
      expect(validateSeededHourlyC(c).ok).toBe(true);
      const decay = 0.0025 * (1 - c / 2);
      expect(decay).toBeGreaterThanOrEqual(0);
      expect(decay).toBeLessThanOrEqual(0.0025 + 1e-18);
    }
  });

  it('the fixture runway cannot emit a seed outside the domain', () => {
    // A fixture constructor that manufactures invalid engine input is a fixture
    // that tests a rejection path instead of the mathematics.
    const atBound = seedHourlyRunway(MAX_SEED_FIXTURE_TOTAL);
    expect(atBound.ok).toBe(true);
    if (atBound.ok) {
      for (const v of atBound.value) {
        expect(validateSeededHourlyC(v).ok).toBe(true);
        expect(v).toBeCloseTo(2, 12);
      }
    }
    expect(seedHourlyRunway(MAX_SEED_FIXTURE_TOTAL + 1).ok).toBe(false);
    expect(seedCPerHour(MAX_SEED_FIXTURE_TOTAL + 1).ok).toBe(false);
  });

  it('MAX_SEED_FIXTURE_TOTAL is exactly the runway length times C_MAX', () => {
    expect(MAX_SEED_FIXTURE_TOTAL).toBe(72 * 2);
    expect(MAX_SEED_FIXTURE_TOTAL).toBe(144);
  });
});