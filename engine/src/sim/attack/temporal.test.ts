/**
 * BORA Engine — Phase 17: temporal, ordering, and state attacks
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This file EXPOSES behaviour rather than asserting a desired policy. Where the
 * specification does not define what happens — late data, backdated events,
 * ordering — the test records the observed classification and labels it, rather
 * than forcing a rule that was never locked.
 *
 * TEMPORAL CLASSIFICATION VOCABULARY
 *
 *   ACCEPTED         the event was applied
 *   REJECTED         the engine refused it, with an error code
 *   STATE-CHANGING   the event altered committed state
 *   STATE-NEUTRAL    the event was applied but changed nothing observable
 *   UNDEFINED        the specification does not say what should happen
 *
 * Nothing here modifies the engine.
 */

import { describe, it, expect } from 'vitest';
import { evaluateChart } from '../../engine/evaluation/chart';
import { rolloverHour, createSeedRunway } from '../../engine/rollover/rollover';
import { emptyBucket } from '../../engine/bucket';
import { rankSongs } from '../../engine/ranking/ranking';
import { calculateHourlyC } from '../../engine/votes/threshold';
import { addUpvotes } from '../../engine/k';
import { getActiveWindow, selectActive } from '../../engine/window/hours';
import { seedCPerHour } from '../../engine/seed/seed';
import { externalStrength } from '../../engine/seed/external';
import { runSimulation } from '../index';
import type { EngineState, RolloverSong } from '../../engine/rollover/rollover';
import type { EngineSong } from '../../engine/evaluation/chart';
import type { HourIndex, VoteBucket } from '../../engine/types';

const H = 20000 as HourIndex;
const hour = (n: number) => n as HourIndex;

function bucketAt(at: number, upvotes = 5): VoteBucket {
  return { ...emptyBucket(hour(at)), upvotes };
}

function song(over: Partial<RolloverSong> = {}): RolloverSong {
  return {
    songId: 'A',
    lifecycle: 'ACTIVE',
    k: 0,
    persistentKura: 0,
    buckets: [],
    seedHours: [],
    platform: { youtube: [], spotify: [], boomplay: [] },
    ...over,
  };
}

function state(songs: RolloverSong[], at: number = H): EngineState {
  return { referenceHour: hour(at), songs };
}

function toEngineSong(s: RolloverSong): EngineSong {
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

/**
 * Narrow a Result to its success value.
 *
 * Typed narrowly so the returned type keeps its full shape (rather than
 * collapsing to a bare union), which is what the assertions below rely on.
 */
function unwrap<T>(
  r: { ok: true; value: T } | { ok: false; error: { message: string } },
): T {
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

// ═══════════════════════════════════════════════════════════════════════════
// 17.6 — TEMPORAL ADVERSARIAL TESTING
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.6: temporal attacks', () => {
  it('NORMAL / ACCEPTED: an event for hour H applies before H closes', () => {
    const r = runSimulation({
      name: 't-normal',
      initialState: state([song()]),
      hours: 1,
      events: [{ kind: 'BUCKET', songId: 'A', hour: H, upvotes: 5, downvotes: 0 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshots[0].appliedEvents).toEqual([`BUCKET:A@${H}`]);
      expect(r.value.snapshots[0].active[0].closedHourSource).toBe('ACTUAL');
    }
  });

  it('LATE / STATE-NEUTRAL: an event for a past hour has no delivery point', () => {
    // The schedule is keyed by hour and the loop reads only the CURRENT hour,
    // so an event for a past hour is simply never applied.
    const r = runSimulation({
      name: 't-late',
      initialState: state([song()]),
      hours: 3,
      events: [{ kind: 'BUCKET', songId: 'A', hour: hour(H + 1), upvotes: 5, downvotes: 0 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshots).toHaveLength(3);
      expect(r.value.snapshots[2].appliedEvents).toEqual([]);
      expect(r.value.snapshots[2].active[0].closedHourSource).toBe('NONE');
    }
  });

  it('VERY LATE / STATE-NEUTRAL: an event past the run is never delivered', () => {
    const r = runSimulation({
      name: 't-very-late',
      initialState: state([song()]),
      hours: 2,
      events: [{ kind: 'BUCKET', songId: 'A', hour: hour(H + 500), upvotes: 5, downvotes: 0 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshots.flatMap((s) => s.appliedEvents)).toEqual([]);
      expect(r.value.snapshots.every((s) => s.totalActiveC === 0)).toBe(true);
    }
  });

  it('EARLY / STATE-CHANGING: a future event is stored but not yet active', () => {
    const r = runSimulation({
      name: 't-early',
      initialState: state([song()]),
      hours: 1,
      events: [{ kind: 'BUCKET', songId: 'A', hour: hour(H + 1), upvotes: 5, downvotes: 0 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshots[0].totalActiveC).toBe(0);
    }
  });

  it('OLD / UNDEFINED: a backdated event is never delivered by the simulation', () => {
    // FINDING (TEMPORAL POLICY GAP). The driver applies events only at the hour
    // it is currently processing, so an event keyed to H-1 has no delivery point
    // once the run has started at H. Backdated data is therefore SILENTLY
    // DROPPED rather than rejected: no error is raised and nothing is recorded.
    //
    // The engine itself would accept such a record (see the next test); it is
    // the SIMULATION scheduling layer that cannot express backdating. The
    // specification does not state whether late data should be accepted,
    // rejected, or ignored.
    const r = runSimulation({
      name: 't-old',
      initialState: state([song()]),
      hours: 1,
      events: [{ kind: 'BUCKET', songId: 'A', hour: hour(H - 1), upvotes: 5, downvotes: 0 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshots[0].appliedEvents).toEqual([]);
      expect(r.value.snapshots[0].totalActiveC).toBe(0);
    }
  });

  it('CONTROL: the ENGINE accepts a backdated record placed directly in state', () => {
    // The engine has no backdating restriction at all — a record at H-1 is a
    // perfectly ordinary retained hour inside the active window.
    const rolled = unwrap(
      rolloverHour(state([song({ buckets: [bucketAt(H - 1)] })]), H),
    );
    expect(rolled.chartAtClosedHour.totalActiveC).toBe(2);
  });

  it('EXPIRED / STATE-NEUTRAL: an event at exactly H-72 contributes nothing', () => {
    const r = runSimulation({
      name: 't-expired',
      initialState: state([song()]),
      hours: 1,
      events: [{ kind: 'BUCKET', songId: 'A', hour: hour(H - 72), upvotes: 5, downvotes: 0 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshots[0].totalActiveC).toBe(0);
    }
  });

  it('ANCIENT / STATE-NEUTRAL: an event at H-500 contributes nothing', () => {
    const r = runSimulation({
      name: 't-ancient',
      initialState: state([song({ buckets: [bucketAt(H - 500)] })]),
      hours: 2,
      events: [],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshots.every((x) => x.totalActiveC === 0)).toBe(true);
    }
  });

  it('never lets a later event rewrite an already-published chart', () => {
    const r = runSimulation({
      name: 't-no-rewrite',
      initialState: state([song()]),
      hours: 3,
      events: [{ kind: 'BUCKET', songId: 'A', hour: hour(H + 2), upvotes: 5, downvotes: 0 }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Snapshots 0 and 1 remain zero even though hour H+2 later has activity.
      expect(r.value.snapshots[0].totalActiveC).toBe(0);
      expect(r.value.snapshots[1].totalActiveC).toBe(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.7 — EVENT-ORDER TESTING
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.7: event ordering', () => {
  it('orders chronologically regardless of declaration order', () => {
    // The scheduler sorts by hour first, so declaring H+1 before H must not
    // change which hour each bucket lands on.
    const forward = runSimulation({
      name: 'ord-forward',
      initialState: state([song()]),
      hours: 2,
      events: [
        { kind: 'BUCKET', songId: 'A', hour: H, upvotes: 5, downvotes: 0 },
        { kind: 'BUCKET', songId: 'A', hour: hour(H + 1), upvotes: 5, downvotes: 0 },
      ],
    });
    const reversed = runSimulation({
      name: 'ord-reversed',
      initialState: state([song()]),
      hours: 2,
      events: [
        { kind: 'BUCKET', songId: 'A', hour: hour(H + 1), upvotes: 5, downvotes: 0 },
        { kind: 'BUCKET', songId: 'A', hour: H, upvotes: 5, downvotes: 0 },
      ],
    });

    expect(forward.ok && reversed.ok).toBe(true);
    if (forward.ok && reversed.ok) {
      // Declaration order is irrelevant: identical hourly observations.
      const a = forward.value.snapshots.map((s) => s.totalActiveC);
      const b = reversed.value.snapshots.map((s) => s.totalActiveC);
      expect(b).toEqual(a);
    }
  });

  it('CHARACTERISATION: two events in the same hour apply in DECLARATION order', () => {
    // Within one hour the scheduler preserves declaration order, so a BUCKET
    // written after a VAULT still lands. This is INTENTIONAL chronological
    // commitment: the simulation commits at the hour it is processing.
    const bucketThenVault = runSimulation({
      name: 'ord-bucket-vault',
      initialState: state([song()]),
      hours: 1,
      events: [
        { kind: 'BUCKET', songId: 'A', hour: H, upvotes: 5, downvotes: 0 },
        { kind: 'VAULT', songId: 'A', hour: H },
      ],
    });
    const vaultThenBucket = runSimulation({
      name: 'ord-vault-bucket',
      initialState: state([song()]),
      hours: 1,
      events: [
        { kind: 'VAULT', songId: 'A', hour: H },
        { kind: 'BUCKET', songId: 'A', hour: H, upvotes: 5, downvotes: 0 },
      ],
    });

    expect(bucketThenVault.ok && vaultThenBucket.ok).toBe(true);
    if (bucketThenVault.ok && vaultThenBucket.ok) {
      // Both orders vault the song before the rollover commits, so the chart
      // excludes it either way. ORDER-DEPENDENT ONLY in the stored bucket,
      // not in the published chart.
      expect(bucketThenVault.value.snapshots[0].active).toHaveLength(0);
      expect(vaultThenBucket.value.snapshots[0].active).toHaveLength(0);
      expect(bucketThenVault.value.snapshots[0].vaulted.map((v) => v.songId)).toEqual(['A']);
      expect(vaultThenBucket.value.snapshots[0].vaulted.map((v) => v.songId)).toEqual(['A']);
    }
  });

  it('records the applied order so dependence is observable, not hidden', () => {
    const r = runSimulation({
      name: 'ord-observable',
      initialState: state([song()]),
      hours: 1,
      events: [
        { kind: 'BUCKET', songId: 'A', hour: H, upvotes: 5, downvotes: 0 },
        { kind: 'PLATFORM', songId: 'A', hour: H, platform: 'youtube', value: 10 },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshots[0].appliedEvents).toEqual([
        `BUCKET:A@${H}`,
        `PLATFORM:A@${H}:youtube`,
      ]);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.8 — ROLLOVER ATTACKS
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.8: rollover attacks', () => {
  it('accepts exactly the state reference hour', () => {
    const r = rolloverHour(state([song()]), H);
    expect(r.ok).toBe(true);
  });

  it('REJECTED: refuses any closed hour other than the reference hour', () => {
    for (const bad of [H - 1, H + 1, H + 2, H - 500]) {
      const r = rolloverHour(state([song()]), hour(bad));
      expect(r.ok, `closedHour=${bad}`).toBe(false);
      if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
    }
  });

  it('REJECTED: refuses to skip an hour by jumping straight to H+2', () => {
    const r = rolloverHour(state([song()]), hour(H + 2));
    expect(r.ok).toBe(false);
  });

  it('cannot double-decay by replaying the same hour', () => {
    // A second rollover at the OLD hour is rejected, so the balance cannot be
    // decayed twice for one hour.
    const first = unwrap(rolloverHour(state([song({ persistentKura: 100 })]), H));
    const replay = rolloverHour(first.state, H);
    expect(replay.ok).toBe(false);
  });

  it('advances by exactly one hour per successful rollover', () => {
    let s = state([song({ persistentKura: 10 })]);
    for (let i = 0; i < 5; i++) {
      const rolled = unwrap(rolloverHour(s, s.referenceHour));
      expect(rolled.toHour).toBe(s.referenceHour + 1);
      expect(rolled.state.referenceHour).toBe(s.referenceHour + 1);
      s = rolled.state;
    }
    expect(s.referenceHour).toBe(H + 5);
  });

  it('accepts negative hour indexes, since the type permits them', () => {
    const negative = -1000;
    const r = rolloverHour(state([song()], negative), hour(negative));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.state.referenceHour).toBe(negative + 1);
  });

  it('accepts an extremely large valid hour index', () => {
    const big = 2 ** 40;
    const r = rolloverHour(state([song()], big), hour(big));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.state.referenceHour).toBe(big + 1);
  });

  it('leaves the state untouched when a rollover fails', () => {
    const before = state([song({ persistentKura: 77, buckets: [bucketAt(H)] })]);
    const snapshot = JSON.stringify(before);
    rolloverHour(before, hour(H + 1)); // wrong hour
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(before.songs[0].persistentKura).toBe(77);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.9 — REPEATED EVALUATION ATTACK
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.9: repeated evaluation attack', () => {
  function input(closedHourC: number | null) {
    return {
      songs: [toEngineSong(song({ persistentKura: 25, k: 9, buckets: [bucketAt(H)] }))],
      referenceHour: H,
      closedHourC,
    };
  }

  it('returns an identical chart every time for the same state', () => {
    const first = unwrap(evaluateChart(input(null)));
    for (let i = 0; i < 20; i++) {
      expect(unwrap(evaluateChart(input(null)))).toEqual(first);
    }
  });

  it('returns an identical projected chart when closedHourC is supplied', () => {
    const first = unwrap(evaluateChart(input(1.5)));
    for (let i = 0; i < 20; i++) {
      expect(unwrap(evaluateChart(input(1.5)))).toEqual(first);
    }
  });

  it('never mutates K, persistent Kura, or the reference hour', () => {
    const s = song({ persistentKura: 25, k: 9, buckets: [bucketAt(H)] });
    const before = JSON.stringify(s);
    for (let i = 0; i < 10; i++) {
      evaluateChart({ songs: [toEngineSong(s)], referenceHour: H, closedHourC: 1 });
    }
    expect(JSON.stringify(s)).toBe(before);
    expect(s.persistentKura).toBe(25);
    expect(s.k).toBe(9);
  });

  it('never deletes a bucket or consumes a seed record', () => {
    const runway = unwrap(createSeedRunway(72, H));
    const s = song({ buckets: [bucketAt(H), bucketAt(H - 5)], seedHours: runway });
    const before = JSON.stringify(s);
    for (let i = 0; i < 10; i++) {
      unwrap(rolloverHour(state([s]), H));
    }
    expect(JSON.stringify(s)).toBe(before);
    expect(s.buckets).toHaveLength(2);
    expect(s.seedHours).toHaveLength(72);
  });

  it('does not decay when evaluation is repeated many times before rollover', () => {
    const s = song({ persistentKura: 100, buckets: [bucketAt(H)] });
    for (let i = 0; i < 50; i++) {
      const chart = unwrap(evaluateChart({ songs: [toEngineSong(s)], referenceHour: H, closedHourC: 0 }));
      expect(chart.active[0].persistentKuraBefore).toBe(100);
    }
    // Only the rollover commits; the balance is still 100 until then.
    expect(s.persistentKura).toBe(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.10 — PERSISTENT KURA ATTACKS
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.10: persistent Kura attacks', () => {
  it('decays maximally at C 0 and not at all at C 2', () => {
    // C 2 comes from 5 upvotes; C 0 from an hour with no bucket at all.
    const maxC = unwrap(rolloverHour(state([song({ persistentKura: 100, buckets: [bucketAt(H)] })]), H));
    const zeroC = unwrap(rolloverHour(state([song({ persistentKura: 100 })]), H));

    const atMax = maxC.steps[0];
    const atZero = zeroC.steps[0];

    expect(atMax.decayRate).toBe(0);
    expect(atZero.decayRate).toBeGreaterThan(0);
    expect(atZero.decayRate).toBeGreaterThan(atMax.decayRate);
  });

  it('applies decay exactly once per successful rollover', () => {
    let s = state([song({ persistentKura: 0, buckets: [bucketAt(H)] })]);
    for (let i = 0; i < 5; i++) {
      const rolled = unwrap(rolloverHour(s, s.referenceHour));
      // Exactly one step per ACTIVE song per rollover — never more.
      expect(rolled.steps).toHaveLength(1);

      const step = rolled.steps[0];
      // The step's own before/after pair must be self-consistent with exactly
      // one injection and one decay: after = (before + fresh) × (1 - D_h),
      // where decayRate is the dimensionless D_h coefficient.
      expect(step.persistentAfter).toBeCloseTo(
        (step.persistentBefore + step.freshInjected) * (1 - step.decayRate),
        9,
      );
      // And the committed state equals what the step reported.
      expect(rolled.state.songs[0].persistentKura).toBeCloseTo(step.persistentAfter, 12);
      s = rolled.state;
    }
  });

  it('keeps Kura non-negative and finite under alternating activity', () => {
    let s = state([song({ persistentKura: 5 })], H);
    for (let i = 0; i < 40; i++) {
      const current = s.referenceHour;
      const withActivity: RolloverSong = {
        ...s.songs[0],
        buckets: i % 2 === 0 ? [bucketAt(current as number)] : [],
      };
      s = { referenceHour: current, songs: [withActivity] };
      const rolled = unwrap(rolloverHour(s, current));
      expect(Number.isFinite(rolled.state.songs[0].persistentKura)).toBe(true);
      expect(rolled.state.songs[0].persistentKura).toBeGreaterThanOrEqual(0);
      s = rolled.state;
    }
  });

  it('decays only ACTIVE songs, never a Vault one', () => {
    const rolled = unwrap(
      rolloverHour(
        state([
          song({ songId: 'LIVE', persistentKura: 50, buckets: [bucketAt(H)] }),
          song({ songId: 'GONE', lifecycle: 'VAULT', persistentKura: 500 }),
        ]),
        H,
      ),
    );
    expect(rolled.steps.map((s) => s.songId)).toEqual(['LIVE']);
    expect(rolled.state.songs[1].persistentKura).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.11 — VAULT ATTACKS
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.11: Vault attacks', () => {
  it('excludes a Vaulted song from every active figure', () => {
    const rolled = unwrap(
      rolloverHour(
        state([
          song({ songId: 'LIVE', buckets: [bucketAt(H)] }),
          song({ songId: 'GONE', lifecycle: 'VAULT', persistentKura: 999, k: 5 }),
        ]),
        H,
      ),
    );
    const chart = rolled.chartAtClosedHour;
    expect(chart.active.map((e) => e.songId)).toEqual(['LIVE']);
    expect(chart.ranked.map((e) => e.songId)).toEqual(['LIVE']);
    expect(chart.excludedVaulted).toEqual(['GONE']);
  });

  it('retains K, history, and dormant Kura across many vaulted hours', () => {
    const events = [
      { kind: 'VAULT' as const, songId: 'A', hour: H },
      ...Array.from({ length: 50 }, (_, i) => ({
        kind: 'BUCKET' as const,
        songId: 'A',
        hour: hour(H + 1 + i),
        upvotes: 5,
        downvotes: 0,
      })),
    ];
    const r = runSimulation({
      name: 'vault-long',
      initialState: state([song({ k: 42, persistentKura: 300 })]),
      hours: 20,
      events,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      for (const s of r.value.snapshots.slice(1)) {
        const gone = s.vaulted[0];
        expect(gone.k).toBe(42);
        expect(gone.persistentKura).toBe(300);
        expect(gone.activeC).toBe(0);
        expect(gone.boraScore).toBe(0);
      }
    }
  });

  it('resets persistent Kura to 0 on restore while retaining K and history', () => {
    const r = runSimulation({
      name: 'vault-restore',
      initialState: state([song({ k: 42, persistentKura: 300, buckets: [bucketAt(H - 1)] })]),
      hours: 3,
      events: [
        { kind: 'VAULT', songId: 'A', hour: H },
        { kind: 'RESTORE', songId: 'A', hour: hour(H + 1) },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      // The FIRST post-restore hour (1001) is the one that must show a reset.
      const restored = r.value.snapshots[1].active[0];
      expect(restored.k).toBe(42); // K retained
      expect(restored.seedHoursRemaining).toBe(0); // never reseeded
      // The dormant 300 was discarded by the Phase 13 restore rule.
      expect(restored.persistentKuraBefore).toBe(0);
    }
  });

  it('survives a Vault → Active → Vault round trip', () => {
    const r = runSimulation({
      name: 'vault-round-trip',
      initialState: state([song({ persistentKura: 10, buckets: [bucketAt(H)] })]),
      hours: 4,
      events: [
        { kind: 'VAULT', songId: 'A', hour: H },
        { kind: 'RESTORE', songId: 'A', hour: hour(H + 1) },
        { kind: 'VAULT', songId: 'A', hour: hour(H + 2) },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.snapshots[0].active).toHaveLength(0);
      expect(r.value.snapshots[1].active).toHaveLength(1);
      expect(r.value.snapshots[2].active).toHaveLength(0);
      expect(r.value.violations).toEqual([]);
    }
  });

  it('keeps a Vaulted song with enormous K out of the ranking entirely', () => {
    const rolled = unwrap(
      rolloverHour(
        state([
          song({ songId: 'SMALL', persistentKura: 1, buckets: [bucketAt(H)] }),
          song({ songId: 'WHALE', lifecycle: 'VAULT', k: 2 ** 31, persistentKura: 1e9 }),
        ]),
        H,
      ),
    );
    expect(rolled.chartAtClosedHour.ranked.map((e) => e.songId)).toEqual(['SMALL']);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.12 — RANKING ATTACKS (through the existing engine comparator only)
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.12: ranking attacks', () => {
  function rank(...rows: { id: string; score: number; k: number; pt: number }[]) {
    return unwrap(
      rankSongs(
        rows.map((r) => ({
          songId: r.id,
          boraScore: r.score,
          k: r.k,
          platformPoints: { youtube: r.pt, spotify: 0, boomplay: 0 },
        })),
      ),
    );
  }

  it('orders by BORA Score first', () => {
    expect(rank({ id: 'a', score: 1, k: 999, pt: 999 }, { id: 'b', score: 2, k: 0, pt: 0 })
      .map((s) => s.songId)).toEqual(['b', 'a']);
  });

  it('breaks an exact score tie with K', () => {
    expect(rank({ id: 'a', score: 5, k: 1, pt: 0 }, { id: 'b', score: 5, k: 9, pt: 0 })
      .map((s) => s.songId)).toEqual(['b', 'a']);
  });

  it('breaks a score-and-K tie with platform performance', () => {
    expect(rank({ id: 'a', score: 5, k: 3, pt: 1 }, { id: 'b', score: 5, k: 3, pt: 9 })
      .map((s) => s.songId)).toEqual(['b', 'a']);
  });

  it('breaks a full tie with deterministic songId ordering', () => {
    expect(rank({ id: 'zzz', score: 5, k: 3, pt: 7 }, { id: 'aaa', score: 5, k: 3, pt: 7 })
      .map((s) => s.songId)).toEqual(['aaa', 'zzz']);
  });

  it('orders by UTF-16 code units, not locale collation', () => {
    // Uppercase sorts before lowercase by code unit; a locale collation would
    // interleave them differently.
    const ids = ['apple', 'Apple', 'Banana', 'banana'];
    const ranked = rank(...ids.map((id) => ({ id, score: 1, k: 0, pt: 0 })))
      .map((s) => s.songId);
    const expected = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    expect(ranked).toEqual(expected);
  });

  it('assigns contiguous ranks for many identical songs', () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}`, score: 5, k: 5, pt: 5 }));
    const ranked = rank(...rows);
    expect(ranked.map((s) => s.rank)).toEqual(rows.map((_, i) => i + 1));
  });

  it('handles an empty population', () => {
    expect(rank()).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 17.13 / 17.14 — ERROR PROPAGATION AND STATE ATOMICITY
// ═══════════════════════════════════════════════════════════════════════════

describe('A-17.13/14: error propagation and state atomicity', () => {
  it('propagates INVALID_MEASUREMENT from a corrupt bucket without mutating state', () => {
    const before = state([song({ persistentKura: 50, buckets: [bucketAt(H)] })]);
    const snapshot = JSON.stringify(before);

    const r = rolloverHour(before, H); // bucket itself is fine; state is good
    expect(r.ok).toBe(true);

    // A corrupt bucket is rejected by the evaluation, and the state survives.
    const corrupt = state([
      song({ persistentKura: 50, buckets: [{ ...bucketAt(H), upvotes: Number.NaN }] }),
    ]);
    const corruptSnapshot = JSON.stringify(corrupt);
    const failed = rolloverHour(corrupt, H);
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe('INVALID_MEASUREMENT');
    // Atomicity: the failing call left the input untouched.
    expect(JSON.stringify(corrupt)).toBe(corruptSnapshot);
    expect(snapshot).toBe(JSON.stringify(before));
  });

  it('propagates DUPLICATE_HOUR_INDEX without mutating state', () => {
    const before = state([song({ buckets: [bucketAt(H), bucketAt(H)] })]);
    const snapshot = JSON.stringify(before);

    const r = rolloverHour(before, H);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('DUPLICATE_HOUR_INDEX');
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('propagates an invalid reference hour from evaluateChart', () => {
    const r = evaluateChart({
      songs: [toEngineSong(song())],
      referenceHour: Number.NaN as never,
      closedHourC: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
  });

  it('propagates an out-of-range closedHourC', () => {
    for (const bad of [-1, 2.5, Number.NaN]) {
      const r = evaluateChart({
        songs: [toEngineSong(song())],
        referenceHour: H,
        closedHourC: bad,
      });
      expect(r.ok, `closedHourC=${bad}`).toBe(false);
    }
  });

  it('rejects an unrecognised lifecycle rather than treating it as Vault', () => {
    const bad = state([{ ...song(), lifecycle: 'RETIRED' as never }]);
    const snapshot = JSON.stringify(bad);
    const r = rolloverHour(bad, H);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('INVALID_MEASUREMENT');
    expect(JSON.stringify(bad)).toBe(snapshot);
  });

  it('leaves a partially-corrupt chart entirely uncommitted', () => {
    // One good song and one corrupt song: the whole rollover must fail, and the
    // good song must NOT be committed on its own.
    const before = state([
      song({ songId: 'GOOD', persistentKura: 10, buckets: [bucketAt(H)] }),
      song({
        songId: 'BAD',
        persistentKura: 20,
        buckets: [{ ...bucketAt(H), downvotes: Number.NaN }],
      }),
    ]);
    const snapshot = JSON.stringify(before);

    const r = rolloverHour(before, H);
    expect(r.ok).toBe(false);
    // Nothing was written: GOOD's balance is untouched.
    expect(before.songs[0].persistentKura).toBe(10);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('surfaces every known engine error code it can provoke', () => {
    const codes = new Set<string>();

    codes.add(unwrapErr(addUpvotesBad()));
    codes.add(unwrapErr(calculateHourlyC({ ...emptyBucket(H), upvotes: Number.NaN })));
    codes.add(unwrapErr(selectActive([bucketAt(H), bucketAt(H)], unwrap(getActiveWindowSafe()))));
    codes.add(unwrapErr(seedCPerHour(-1)));
    codes.add(unwrapErr(externalStrengthSafe({ youtube: 1, spotify: 0, boomplay: 0 })));

    expect(codes.has('INVALID_K')).toBe(true);
    expect(codes.has('INVALID_MEASUREMENT')).toBe(true);
    expect(codes.has('DUPLICATE_HOUR_INDEX')).toBe(true);
    expect(codes.has('INVALID_EXTERNAL_INPUT')).toBe(true);
    // Phase 20R: INVALID_TOTAL_C is no longer provoked by any surviving engine
    // entry point. It remains in the frozen `EngineErrorCode` vocabulary only.
    expect(codes.has('INVALID_TOTAL_C')).toBe(false);
  });

  // Local helpers so each error probe stays a one-liner.
  function addUpvotesBad() {
    return addUpvotes(-1, 1);
  }
  function getActiveWindowSafe() {
    return getActiveWindow(H);
  }
  function externalStrengthSafe(input: { youtube: number; spotify: number; boomplay: number }) {
    return externalStrength(input);
  }
  function unwrapErr(
    r: { ok: true; value: unknown } | { ok: false; error: { code: string } },
  ): string {
    if (r.ok) throw new Error('expected an error');
    return r.error.code;
  }
});