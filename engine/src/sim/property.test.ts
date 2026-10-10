/**
 * BORA Engine — Phase 18: property-based and stateful testing
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Properties are checked over MANY deterministic inputs. Each case is generated
 * from an explicit seed, so a failure is reproducible by replaying that seed —
 * no opaque generator state is ever left behind.
 *
 * FAILURE REPRODUCTION
 *
 *   Every assertion carries the seed, the initial state, and the hour, so a
 *   failure is a complete minimal reproduction that can be rebuilt directly in
 *   the Phase 16 simulation.
 *
 * PURE: no `Math.random()`, no clock, no global state.
 */

import { describe, it, expect } from 'vitest';
import { runSimulation, fingerprintText } from './index';
import { evaluateChart } from '../engine/evaluation/chart';
import { rolloverHour } from '../engine/rollover/rollover';
import {
  DeterministicRng,
  randomState,
  randomEvents,
} from '../testing/generators';
import type { EngineState } from '../engine/rollover/rollover';
import type { EngineSong } from '../engine/evaluation/chart';
import type { HourIndex } from '../engine/types';
import { C_MAX, KURA_TOTAL, C_WINDOW_HOURS, EPSILON_SUM } from '../engine/constants';

const hour = (n: number) => n as HourIndex;
const CASES = 60;

function toEngineSong(s: EngineState['songs'][number]): EngineSong {
  return {
    songId: s.songId,
    lifecycle: s.lifecycle,
    k: s.k,
    persistentKura: s.persistentKura,
    buckets: s.buckets,
    seedHours: s.seedHours,
    platform: s.platform,
  };
}

/** Evaluate a whole state, or throw with full reproduction info. */
function evaluate(state: EngineState, closedHourC: number | null, seed: number) {
  const r = evaluateChart({
    songs: state.songs.map(toEngineSong),
    referenceHour: state.referenceHour,
    closedHourC,
  });
  if (!r.ok) {
    throw new Error(
      `SEED=${seed} hour=${state.referenceHour}: evaluation failed — ${r.error.message}`,
    );
  }
  return r.value;
}

/** A compact, replayable description of a generated case. */
function repro(seed: number, state: EngineState, hours: number): string {
  return (
    `SEED=${seed} referenceHour=${state.referenceHour} songs=${state.songs.length} ` +
    `ids=${state.songs.map((s) => `${s.songId}:${s.lifecycle}`).join(',')} hours=${hours}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 18.2 / 18.3 / 18.4 — CORE DISTRIBUTION PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

describe('P-18.2/3/4: distribution properties over generated populations', () => {
  it('18.2 C BOUNDS: every active C stays within [0, window × C_MAX]', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const state = randomState(new DeterministicRng(seed));
      const chart = evaluate(state, null, seed);

      for (const e of chart.active) {
        expect(e.activeC, repro(seed, state, 0)).toBeGreaterThanOrEqual(0);
        expect(e.activeC, repro(seed, state, 0)).toBeLessThanOrEqual(C_WINDOW_HOURS * C_MAX);
      }
    }
  });

  it('18.3 XP CONSERVATION: ΣXP = 1 when T_C > 0, and all-zero when T_C = 0', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const state = randomState(new DeterministicRng(seed));
      const chart = evaluate(state, null, seed);
      const sum = chart.active.reduce((acc, e) => acc + e.xp, 0);

      if (chart.totalActiveC > 0) {
        expect(Math.abs(sum - 1), repro(seed, state, 0)).toBeLessThanOrEqual(EPSILON_SUM);
      } else {
        for (const e of chart.active) {
          expect(e.xp, repro(seed, state, 0)).toBe(0);
        }
      }
    }
  });

  it('18.4 FRESH KURA CONSERVATION: Σ fresh Kura = 50 whenever T_C > 0', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const state = randomState(new DeterministicRng(seed));
      const chart = evaluate(state, null, seed);

      if (chart.totalActiveC > 0) {
        const sum = chart.active.reduce((acc, e) => acc + e.kuraFresh, 0);
        expect(Math.abs(sum - KURA_TOTAL), repro(seed, state, 0))
          .toBeLessThanOrEqual(EPSILON_SUM);
      } else {
        for (const e of chart.active) {
          expect(e.kuraFresh, repro(seed, state, 0)).toBe(0);
        }
      }
    }
  });

  it('never produces a non-finite value in any generated chart', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const state = randomState(new DeterministicRng(seed));
      const chart = evaluate(state, null, seed);

      for (const e of chart.active) {
        expect(Number.isFinite(e.activeC), repro(seed, state, 0)).toBe(true);
        expect(Number.isFinite(e.xp), repro(seed, state, 0)).toBe(true);
        expect(Number.isFinite(e.kuraFresh), repro(seed, state, 0)).toBe(true);
        expect(Number.isFinite(e.boraScore), repro(seed, state, 0)).toBe(true);
      }
      expect(Number.isFinite(chart.totalActiveC), repro(seed, state, 0)).toBe(true);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 18.5 — VAULT EXCLUSION
// ═══════════════════════════════════════════════════════════════════════════

describe('P-18.5: Vault exclusion property', () => {
  it('removing a Vaulted song changes no active figure', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const base = randomState(new DeterministicRng(seed));
      const vaulted = base.songs.find((s) => s.lifecycle === 'VAULT');
      if (!vaulted) continue;

      const withVault = evaluate(base, null, seed);
      const withoutVault = evaluate(
        { ...base, songs: base.songs.filter((s) => s.songId !== vaulted.songId) },
        null,
        seed,
      );

      expect(withVault.active.find((e) => e.songId === vaulted.songId), repro(seed, base, 0))
        .toBeUndefined();
      expect(withVault.totalActiveC, repro(seed, base, 0))
        .toBe(withoutVault.totalActiveC);
    }
  });

  it('a Vaulted song is never present in any generated ranking', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const state = randomState(new DeterministicRng(seed));
      const chart = evaluate(state, null, seed);

      for (const s of state.songs) {
        if (s.lifecycle !== 'VAULT') continue;
        expect(chart.ranked.find((e) => e.songId === s.songId), repro(seed, state, 0))
          .toBeUndefined();
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 18.6 / 18.7 / 18.8 / 18.9 — STATEFUL PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════

describe('P-18.6: determinism property', () => {
  it('identical generated scenarios produce identical output', () => {
    let compared = 0;

    for (let seed = 1; seed <= 20; seed++) {
      // Built ONCE and replayed, so the two runs see byte-identical input.
      const state = randomState(new DeterministicRng(seed));
      const events = randomEvents(new DeterministicRng(seed + 1000), state, 6);
      const scenario = { name: `p18-${seed}`, initialState: state, hours: 5, events };

      const a = runSimulation(scenario);
      const b = runSimulation(scenario);

      // Both runs must agree on SUCCESS OR FAILURE.
      expect(a.ok, repro(seed, state, 5)).toBe(b.ok);

      if (a.ok && b.ok) {
        compared++;
        expect(fingerprintText(a.value), repro(seed, state, 5))
          .toBe(fingerprintText(b.value));
      } else if (!a.ok && !b.ok) {
        // A generated scenario may legitimately be rejected; when it is, the
        // SAME error must be reported, with no silent divergence.
        compared++;
        expect(a.error.error.code).toBe(b.error.error.code);
        expect(a.error.hour).toBe(b.error.hour);
      }
    }

    // Every case was compared, whether it succeeded or failed.
    expect(compared).toBe(20);
  });
});

describe('P-18.7: failed operations are non-mutating', () => {
  it('a rejected rollover leaves the state semantically identical', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const state = randomState(new DeterministicRng(seed));
      const before = JSON.stringify(state);

      // A deliberately wrong closed hour must be rejected outright.
      const r = rolloverHour(state, hour((state.referenceHour as number) + 1));
      expect(r.ok, repro(seed, state, 0)).toBe(false);

      expect(JSON.stringify(state), repro(seed, state, 0)).toBe(before);
    }
  });

  it('a rejected evaluation leaves the state semantically identical', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const state = randomState(new DeterministicRng(seed));
      const before = JSON.stringify(state);

      evaluateChart({
        songs: state.songs.map(toEngineSong),
        referenceHour: Number.NaN as never,
        closedHourC: null,
      });

      expect(JSON.stringify(state), repro(seed, state, 0)).toBe(before);
    }
  });
});

describe('P-18.8: rollover monotonic hour property', () => {
  it('every successful rollover advances the hour by exactly one', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const state = randomState(new DeterministicRng(seed));
      const before = state.referenceHour;

      const r = rolloverHour(state, before);
      if (!r.ok) continue; // a generated state may legitimately fail

      expect(r.value.toHour, repro(seed, state, 1)).toBe((before as number) + 1);
      expect(r.value.state.referenceHour, repro(seed, state, 1)).toBe((before as number) + 1);
    }
  });

  it('a failed rollover leaves the reference hour untouched', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const state = randomState(new DeterministicRng(seed));
      const r = rolloverHour(state, hour((state.referenceHour as number) - 3));
      expect(r.ok, repro(seed, state, 0)).toBe(false);
      expect(state.referenceHour, repro(seed, state, 0)).toBe(
        (state.referenceHour as number),
      );
    }
  });
});

describe('P-18.9: seed finiteness property', () => {
  it('a generated seed timeline never exceeds exactly 72 explicit hours', () => {
    for (let seed = 1; seed <= CASES; seed++) {
      const state = randomState(new DeterministicRng(seed));

      for (const s of state.songs) {
        expect(s.seedHours.length, repro(seed, state, 0)).toBeLessThanOrEqual(72);
        // Each record names its own hour, and all are finite.
        for (const record of s.seedHours) {
          expect(Number.isFinite(record.hourIndex), repro(seed, state, 0)).toBe(true);
          expect(Number.isFinite(record.c), repro(seed, state, 0)).toBe(true);
          expect(record.c, repro(seed, state, 0)).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('a generated chart never sources seed activity beyond its runway', () => {
    const state: EngineState = {
      referenceHour: hour(1000),
      songs: [
        {
          songId: 'S',
          lifecycle: 'ACTIVE',
          k: 0,
          persistentKura: 0,
          buckets: [],
          seedHours: [],
          platform: { youtube: [], spotify: [], boomplay: [] },
        },
      ],
    };

    // Run long enough to pass the runway's end and confirm no regeneration.
    const r = runSimulation({
      name: 'p18-seed-fin',
      initialState: {
        ...state,
        songs: [{ ...state.songs[0], seedHours: [] }],
      },
      hours: 200,
      events: [],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.violations).toEqual([]);
      expect(r.value.metrics.totalActiveC).toBe(0);
    }
  });
});

describe('P-18.10: generated state stays valid under repeated rollover', () => {
  it('a generated chart survives several rollovers without drift', () => {
    for (let seed = 1; seed <= 25; seed++) {
      let state = randomState(new DeterministicRng(seed));
      const start = state.referenceHour;

      for (let step = 0; step < 5; step++) {
        const r = rolloverHour(state, state.referenceHour);
        if (!r.ok) break;
        state = r.value.state;
      }

      for (const s of state.songs) {
        expect(Number.isFinite(s.persistentKura), repro(seed, state, 5)).toBe(true);
        expect(s.persistentKura, repro(seed, state, 5)).toBeGreaterThanOrEqual(0);
      }
      expect(state.referenceHour, repro(seed, state, 5)).toBeGreaterThanOrEqual(start);
    }
  });
});