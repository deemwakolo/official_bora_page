/**
 * BORA Engine — S1 late / backdated data policy
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * THE POLICY (locked at this gate)
 *
 *   `rolloverHour(state, H)` is the COMMITMENT BOUNDARY. It closes hour H and
 *   advances the state to H+1. After that commitment, hour H is settled.
 *
 *   Therefore, for `state.referenceHour = H`:
 *
 *     event targeting H   → ON_TIME — applied, closes H
 *     event targeting H+1 → FUTURE  — held until that hour opens
 *     event targeting H or earlier, after that hour committed → LATE
 *
 *   A LATE event is never applied, never mutates committed chart history, and
 *   is REPORTED so it cannot disappear silently.
 *
 * BEFORE THE FIRST ROLLOVER (Phase 20R, R5 — RATIFIED):
 *
 *   The boundary is defined RELATIVE TO THE LATEST COMMITTED HOUR. Before the
 *   first `rolloverHour`, no hour has been committed, so nothing has yet
 *   crossed the commitment boundary. An event targeting the initial reference
 *   hour is therefore ON_TIME:
 *
 *     before any rollover, event targeting H → ON_TIME (no commit yet)
 *
 *   This falls out of the definition rather than being a special case: it is
 *   `rolloverHour` that makes an hour late, and it has not run. Scheduler
 *   behaviour is unchanged by the ratification.
 *
 *   The pure engine has no clock and no notion of lateness. This is a contract
 *   about the ORCHESTRATION boundary, exercised through the simulation driver.
 *   No ingestion service, storage schema, or API is defined here.
 */

import { describe, it, expect } from 'vitest';
import { runSimulation, classifyEventTiming } from './index';
import type { SimulationScenario, SimulationEvent } from './scenario';
import type { RolloverSong } from '../engine/rollover/rollover';
import { emptyBucket } from '../engine/bucket';
import type { HourIndex } from '../engine/types';

const H = 5000 as HourIndex;
const hour = (n: number) => n as HourIndex;

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

function scenario(events: readonly SimulationEvent[], hours = 4): SimulationScenario {
  return { name: 's1', initialState: { referenceHour: H, songs: [song()] }, hours, events };
}

function bucket(at: number, upvotes = 5): SimulationEvent {
  return { kind: 'BUCKET', songId: 'A', hour: hour(at), upvotes, downvotes: 0 };
}

function run(events: readonly SimulationEvent[], hours = 4) {
  const r = runSimulation(scenario(events, hours));
  if (!r.ok) throw new Error(`run failed at hour ${r.error.hour}: ${r.error.error.message}`);
  return r.value;
}

// ── S1-1 … S1-6: classification of each arrival case ────────────────────────

describe('S1: arrival timing classification', () => {
  it('S1-1 event targeting the current uncommitted hour is applied', () => {
    const r = run([bucket(H)]);
    expect(r.snapshots[0].appliedEvents).toEqual([`BUCKET:A@${H}`]);
    expect(r.lateEvents).toEqual([]);
    expect(r.snapshots[0].totalActiveC).toBe(2);
  });

  it('S1-2 an event targeting exactly the committed hour was applied on time', () => {
    // The boundary is about ARRIVAL, not the target. An event delivered while
    // its hour is still open is on time, however old the target looks.
    const r = run([bucket(H), bucket(H + 1, 1)]);
    expect(r.snapshots[0].appliedEvents).toEqual([`BUCKET:A@${H}`]);
    expect(r.snapshots[1].appliedEvents).toEqual([`BUCKET:A@${H + 1}`]);
    expect(r.lateEvents).toEqual([]);
  });

  it('S1-3 H-1 after H committed is LATE and is reported', () => {
    // The run starts at H, so H-1 can never be on time: it is already past.
    const r = run([bucket(H - 1)]);
    expect(r.lateEvents.map((l) => l.targetHour)).toEqual([H - 1]);
    expect(r.lateEvents[0].timing).toBe('LATE');
    expect(r.lateEvents[0].description).toBe(`BUCKET:A@${H - 1}`);
    expect(r.snapshots.flatMap((s) => s.appliedEvents)).toEqual([]);
  });

  it('S1-4 an event at H-72 is LATE', () => {
    const r = run([bucket(H - 72)]);
    expect(r.lateEvents.map((l) => l.targetHour)).toEqual([H - 72]);
    expect(r.snapshots.flatMap((s) => s.appliedEvents)).toEqual([]);
  });

  it('S1-5 an ancient event is LATE', () => {
    const r = run([bucket(H - 500)]);
    expect(r.lateEvents.map((l) => l.targetHour)).toEqual([H - 500]);
    expect(r.lateEvents[0].reason).toContain('commitment boundary');
  });

  it('S1-6 a future H+1 event is held, not late', () => {
    const r = run([bucket(H + 1)]);
    expect(r.lateEvents).toEqual([]);
    // It commits when its own hour arrives.
    expect(r.snapshots[1].appliedEvents).toEqual([`BUCKET:A@${H + 1}`]);
  });
});

// ── S1-7 … S1-12: observability, inertness, ordering ────────────────────────

describe('S1: late events are observable and inert', () => {
  it('S1-7 late-event classification is visible on the run', () => {
    const r = run([bucket(H - 1), bucket(H - 5)]);
    expect(r.lateEvents).toHaveLength(2);
    for (const late of r.lateEvents) {
      expect(late.timing).toBe('LATE');
      // Two legitimate reasons reach the same classification: the hour is
      // already committed, or it precedes the run entirely. Both are stated
      // explicitly so a late event is never unexplained.
      expect(late.reason).toMatch(/already committed|precedes the run/i);
    }
  });

  it('S1-8 a late event does not mutate any committed chart state', () => {
    const clean = run([bucket(H)]);
    const withLate = run([bucket(H), bucket(H - 1)]);

    // Adding a late event changes NOTHING about any committed hour.
    expect(withLate.snapshots).toEqual(clean.snapshots);
    expect(withLate.trace).toEqual(clean.trace);
    expect(withLate.metrics).toEqual(clean.metrics);
    // The ONLY difference is the report itself.
    expect(withLate.lateEvents).toHaveLength(1);
    expect(clean.lateEvents).toHaveLength(0);
  });

  it('S1-9 chronological valid events still commit normally', () => {
    const r = run([bucket(H), bucket(H + 1, 1), bucket(H + 2, 0)]);
    expect(r.lateEvents).toEqual([]);
    for (let i = 0; i < 3; i++) {
      expect(r.snapshots[i].hour).toBe(H + i);
      expect(r.snapshots[i].nextHour).toBe(H + i + 1);
    }
    expect(r.violations).toEqual([]);
  });

  it('S1-10 same-hour declaration order remains deterministic', () => {
    // Two BUCKET events for one hour: the second upserts over the first, so the
    // committed value is the LAST declared one. S2: same-hour order is
    // declaration order — preserved, not redesigned.
    const r = run([
      { kind: 'BUCKET', songId: 'A', hour: hour(H), upvotes: 1, downvotes: 0 },
      { kind: 'BUCKET', songId: 'A', hour: hour(H), upvotes: 5, downvotes: 0 },
    ]);
    expect(r.snapshots[0].appliedEvents).toEqual([`BUCKET:A@${H}`, `BUCKET:A@${H}`]);
    // 5 upvotes ⇒ C 2, proving the later declaration won.
    expect(r.snapshots[0].totalActiveC).toBe(2);
    expect(r.violations).toEqual([]);
  });

  it('S1-11 cross-hour declarations commit identically in any order', () => {
    // S3: commitment is chronological, so declaration order across DIFFERENT
    // hours cannot change the committed outcome.
    const forward = run([bucket(H), bucket(H + 1, 1), bucket(H + 2, 0)]);
    const reversed = run([bucket(H + 2, 0), bucket(H + 1, 1), bucket(H)]);

    expect(reversed.snapshots).toEqual(forward.snapshots);
    expect(reversed.lateEvents).toEqual([]);
  });

  it('S1-12 late classification is a pure function of the boundary', () => {
    // Direct unit checks — no clock, no state, no engine involvement.
    expect(classifyEventTiming(bucket(H), H, null)).toBe('ON_TIME');
    expect(classifyEventTiming(bucket(H + 1), H, null)).toBe('FUTURE');
    expect(classifyEventTiming(bucket(H), hour(H + 1), H)).toBe('LATE');
    expect(classifyEventTiming(bucket(H - 1), hour(H + 1), H)).toBe('LATE');
    expect(classifyEventTiming(bucket(H + 1), hour(H + 1), H)).toBe('ON_TIME');
  });
});

// ── S1-13 / S1-14: atomicity ────────────────────────────────────────────────

describe('S1: atomicity — a late event changes nothing', () => {
  it('S1-13 dropping the late event leaves byte-identical committed state', () => {
    const withLate = run([bucket(H), bucket(H - 1), bucket(H - 300)]);
    const without = run([bucket(H)]);

    expect(withLate.lateEvents).toHaveLength(2);
    expect(withLate.snapshots).toEqual(without.snapshots);
    expect(withLate.trace).toEqual(without.trace);
    expect(withLate.metrics).toEqual(without.metrics);
    expect(withLate.violations).toEqual([]);
  });

  it('S1-14 the engine itself never rewrites a committed hour', () => {
    // The pure engine has no notion of lateness. Proof by contrast: a backdated
    // bucket placed DIRECTLY in state does count normally — which is exactly
    // why the ORCHESTRATION layer, not the engine, must refuse to deliver it.
    const backdated = runSimulation({
      name: 's1-engine-control',
      initialState: {
        referenceHour: H,
        songs: [song({ buckets: [{ ...emptyBucket(hour(H - 1)), upvotes: 5 }] })],
      },
      hours: 1,
      events: [],
    });
    expect(backdated.ok).toBe(true);
    if (backdated.ok) {
      expect(backdated.value.snapshots[0].totalActiveC).toBe(2);
      // The SAME data arriving as a late EVENT does not.
      expect(run([bucket(H - 1)]).snapshots[0].totalActiveC).toBe(0);
    }
  });
});