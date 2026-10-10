/**
 * BORA Engine — Phase 19: endurance workload generators
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deterministic LONG-RUN workloads for the endurance gate.
 *
 * ── WHAT THIS FILE IS, AND IS NOT ───────────────────────────────────────────
 *
 * This module GENERATES EVENTS and describes workloads. It contains no BORA
 * mathematics whatsoever: no C, no T_C, no XP, no Kura, no decay, no platform
 * normalisation, no score, no rank. Those are computed only by the engine and
 * read back from its own snapshots.
 *
 * Every workload is a fixed arithmetic pattern keyed on the hour index — no
 * `Math.random()`, no clock, no environment. A given scenario therefore always
 * produces exactly the same events, which is what makes an endurance failure
 * replayable from its scenario name alone.
 */

import type { SimulationEvent } from '../scenario';
import type { RolloverSong } from '../../engine/rollover/rollover';
import type { PlatformId } from '../../engine/types';

const hour = (n: number) => n as HourIndexAlias;

/** Local alias so hour branding is obvious at every construction site. */
type HourIndexAlias = import('../../engine/types').HourIndex;

/** Build a base song with no activity, ready for a workload to feed. */
export function baseSong(songId: string, over: Partial<RolloverSong> = {}): RolloverSong {
  return {
    songId,
    lifecycle: 'ACTIVE',
    k: 0,
    persistentKura: 0,
    buckets: [],
    seedHours: [],
    platform: { youtube: [], spotify: [], boomplay: [] },
    ...over,
  };
}

/**
 * Deterministic vote counts from an hour index.
 *
 * A fixed formula, never a random draw: the same hour always yields the same
 * counts, so any failure reproduces from `(hour, songIndex)` alone.
 */
export function votesAt(h: number, songIndex: number): { upvotes: number; downvotes: number } {
  // Spread songs across the threshold tiers so C takes several values.
  const phase = (h + songIndex * 7) % 12;
  const upvotes = phase === 0 ? 0 : phase <= 4 ? 1 + (phase % 4) : 5 + (phase % 3);
  const downvotes = phase === 11 ? 5 : phase % 3 === 0 ? 1 : 0;
  return { upvotes, downvotes };
}

export function bucketEvent(songId: string, h: number, songIndex: number): SimulationEvent {
  const { upvotes, downvotes } = votesAt(h, songIndex);
  return { kind: 'BUCKET', songId, hour: hour(h), upvotes, downvotes };
}

export function platformEvent(
  songId: string,
  h: number,
  platform: PlatformId,
  value: number,
): SimulationEvent {
  return { kind: 'PLATFORM', songId, hour: hour(h), platform, value };
}

export function vaultEvent(songId: string, h: number): SimulationEvent {
  return { kind: 'VAULT', songId, hour: hour(h) };
}

export function restoreEvent(songId: string, h: number): SimulationEvent {
  return { kind: 'RESTORE', songId, hour: hour(h) };
}

// ── WORKLOAD 1 — SUSTAINED ACTIVITY ────────────────────────────────────────

/** Several songs active every single hour, across all C tiers. */
export function sustainedEvents(
  startHour: number,
  hours: number,
  songIds: readonly string[],
): SimulationEvent[] {
  const out: SimulationEvent[] = [];
  for (let i = 0; i < hours; i++) {
    const h = startHour + i;
    songIds.forEach((id, idx) => {
      out.push(bucketEvent(id, h, idx));
      out.push(platformEvent(id, h, 'youtube', (h % 17) + idx * 3));
      out.push(platformEvent(id, h, 'spotify', (h % 11) * 2));
    });
  }
  return out;
}

// ── WORKLOAD 2 — SPARSE ACTIVITY (long C = 0 stretches) ────────────────────

/**
 * Activity only in a narrow band, leaving long stretches where every song has
 * C = 0. The silence is the point: T_C = 0 must stay mathematically valid.
 */
export function sparseEvents(
  startHour: number,
  hours: number,
  songIds: readonly string[],
): SimulationEvent[] {
  const out: SimulationEvent[] = [];
  for (let i = 0; i < hours; i++) {
    const h = startHour + i;
    // Two busy hours per 24, leaving ~22 silent hours.
    if (h % 24 > 1) continue;
    songIds.forEach((id, idx) => out.push(bucketEvent(id, h, idx)));
  }
  return out;
}

// ── WORKLOAD 3 — WINDOW TURNOVER ───────────────────────────────────────────

/**
 * Each song is fed on its own staggered cadence, so different hours enter and
 * leave the 72-hour window at different times. This is what makes the
 * H-71 / H-72 boundary continuously observable rather than a one-off.
 */
export function turnoverEvents(
  startHour: number,
  hours: number,
  songIds: readonly string[],
): SimulationEvent[] {
  const out: SimulationEvent[] = [];
  for (let i = 0; i < hours; i++) {
    const h = startHour + i;
    songIds.forEach((id, idx) => {
      if ((h + idx * 5) % (3 + (idx % 3)) === 0) {
        out.push(bucketEvent(id, h, idx));
      }
    });
  }
  return out;
}

// ── WORKLOAD 4 & 5 — SEED COVERAGE AND SEED EXPIRATION ─────────────────────

/**
 * Actual activity laid over a FINITE seed runway, so the D1 contract is
 * exercised hour after hour rather than in one isolated test.
 *
 * `partial` selects how much of the window the runway covers:
 *   0 → no seed at all
 *   1 → a single seeded hour (the D1 regression shape)
 *   2 → two non-contiguous seeded hours
 *   3 → a full 72-hour runway
 *
 * The runway itself is attached to the song's `seedHours`, not generated here —
 * it is state, not an event.
 */
export function seedWorkloadEvents(
  startHour: number,
  hours: number,
  songId: string,
  partial: 0 | 1 | 2 | 3,
): SimulationEvent[] {
  const out: SimulationEvent[] = [];
  for (let i = 0; i < hours; i++) {
    const h = startHour + i;
    if (partial === 1 && h % 24 === 5) {
      // Actual C > 0 lands on a seeded hour: ACTUAL must replace the seed.
      out.push({ kind: 'BUCKET', songId, hour: hour(h), upvotes: 5, downvotes: 0 });
    } else if (partial === 2 && (h % 24 === 3 || h % 24 === 9)) {
      out.push({ kind: 'BUCKET', songId, hour: hour(h), upvotes: 5, downvotes: 0 });
    } else if (partial === 3 && h % 24 === 7) {
      // A ZERO-vote bucket: measured silence must still suppress the seed.
      out.push({ kind: 'BUCKET', songId, hour: hour(h), upvotes: 0, downvotes: 0 });
    }
  }
  return out;
}

// ── WORKLOAD 6 — LIFECYCLE CHURN ───────────────────────────────────────────

/**
 * Repeated ACTIVE → VAULT → ACTIVE cycles on a fixed cadence.
 *
 * A song stays vaulted for a span far longer than the 72-hour window, so its
 * history has genuinely expired by the time it returns — that is what makes
 * "history retained" a meaningful assertion rather than a tautology.
 */
export function lifecycleEvents(
  startHour: number,
  hours: number,
  songId: string,
  vaultLength = 100,
): SimulationEvent[] {
  const out: SimulationEvent[] = [];
  for (let h = startHour; h < startHour + hours; h++) {
    const phase = (h - startHour) % (vaultLength + 10);
    if (phase === 0) out.push(vaultEvent(songId, h));
    if (phase === vaultLength) out.push(restoreEvent(songId, h));
    // Activity continues while vaulted: retained, never scored.
    out.push(bucketEvent(songId, h, 1));
  }
  return out;
}

// ── WORKLOAD 7 — PLATFORM CHURN ────────────────────────────────────────────

/**
 * All three platforms appear and disappear on different cadences, including
 * long gaps with no observation at all, so idle-platform behaviour and the
 * 7-day window are both continuously visible.
 */
export function platformChurnEvents(
  startHour: number,
  hours: number,
  songIds: readonly string[],
): SimulationEvent[] {
  const out: SimulationEvent[] = [];
  for (let i = 0; i < hours; i++) {
    const h = startHour + i;
    songIds.forEach((id, idx) => {
      out.push(bucketEvent(id, h, idx));
      if (h % 4 !== 3) out.push(platformEvent(id, h, 'youtube', (h * (idx + 1)) % 97));
      if (h % 37 < 20) out.push(platformEvent(id, h, 'spotify', (h % 13) * (idx + 2)));
      if (h % 53 === idx * 7) out.push(platformEvent(id, h, 'boomplay', 40 + idx));
    });
  }
  return out;
}

// ── WORKLOAD 8 — RANKING CHURN ─────────────────────────────────────────────

/**
 * Vote counts chosen so every song lands on identical C, and therefore ties
 * constantly on BORA Score. Ties are what exercise the tie-break chain:
 * score → K → platform performance → songId.
 */
export function tieHeavyEvents(
  startHour: number,
  hours: number,
  songIds: readonly string[],
): SimulationEvent[] {
  const out: SimulationEvent[] = [];
  for (let i = 0; i < hours; i++) {
    const h = startHour + i;
    songIds.forEach((id) => {
      out.push({ kind: 'BUCKET', songId: id, hour: hour(h), upvotes: 5, downvotes: 0 });
    });
    if (h % 6 === 0) {
      songIds.forEach((id) => out.push(platformEvent(id, h, 'youtube', 25)));
    }
  }
  return out;
}