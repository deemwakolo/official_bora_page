/**
 * BORA Engine — deterministic simulation: reproducibility
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 16 (continued). A normalised, comparable form of a run.
 *
 * The fingerprint exists so "did this scenario reproduce exactly?" can be
 * answered by comparing DATA rather than by eyeballing formatted numbers. It
 * therefore contains no timestamps, no UUIDs, no random values, and no
 * object identity — only explicit song ids, integer hours, and the engine's own
 * numeric output.
 *
 * FLOATING POINT. Engine outputs are IEEE-754 doubles. Comparing a raw
 * `String(number)` is brittle across representations, so numbers are rounded to
 * a fixed number of decimal places before serialisation. The rounding is applied
 * uniformly, so two runs that agree to that precision are treated as identical
 * while a genuine divergence still shows up.
 *
 * PURE: no clock, no randomness, no I/O.
 */

import type { SimulationRun, HourSnapshot } from './snapshot';

/** Decimal places retained when fingerprinting a floating-point value. */
export const FINGERPRINT_PRECISION = 9;

/** Round to a fixed precision so equal doubles serialise identically. */
export function stable(n: number): number {
  if (!Number.isFinite(n)) {
    // Non-finite values are preserved as sentinels rather than coerced to 0,
    // so a NaN or Infinity can never masquerade as a valid number.
    if (Number.isNaN(n)) return 'NaN' as unknown as number;
    return (n > 0 ? 'Infinity' : '-Infinity') as unknown as number;
  }
  const factor = 10 ** FINGERPRINT_PRECISION;
  return Math.round(n * factor) / factor;
}

/** The comparable form of one observed song. */
function fingerprintSong(snapshot: HourSnapshot['active'][number]): unknown {
  return {
    songId: snapshot.songId,
    lifecycle: snapshot.lifecycle,
    k: stable(snapshot.k),
    persistentKura: stable(snapshot.persistentKura),
    activeC: stable(snapshot.activeC),
    xp: stable(snapshot.xp),
    kuraFresh: stable(snapshot.kuraFresh),
    persistentKuraBefore: snapshot.persistentKuraBefore === null
      ? null
      : stable(snapshot.persistentKuraBefore),
    persistentKuraNext: snapshot.persistentKuraNext === null
      ? null
      : stable(snapshot.persistentKuraNext),
    youtube: stable(snapshot.platformPoints.youtube),
    spotify: stable(snapshot.platformPoints.spotify),
    boomplay: stable(snapshot.platformPoints.boomplay),
    boraScore: stable(snapshot.boraScore),
    rank: snapshot.rank,
    source: snapshot.closedHourSource,
    seedHoursRemaining: snapshot.seedHoursRemaining,
  };
}

/** The comparable form of one hour. */
export function fingerprintHour(snapshot: HourSnapshot): unknown {
  return {
    hour: snapshot.hour,
    nextHour: snapshot.nextHour,
    totalActiveC: stable(snapshot.totalActiveC),
    ranking: [...snapshot.ranking],
    appliedEvents: [...snapshot.appliedEvents],
    active: snapshot.active.map(fingerprintSong),
    vaulted: snapshot.vaulted.map(fingerprintSong),
  };
}

/** A complete, normalised, comparable form of a whole run. */
export function fingerprint(run: SimulationRun): unknown {
  return {
    scenarioName: run.scenarioName,
    metrics: run.metrics,
    violations: run.violations.map((v) => ({
      hour: v.hour,
      songId: v.songId,
      invariant: v.invariant,
      detail: v.detail,
    })),
    snapshots: run.snapshots.map(fingerprintHour),
    trace: run.trace.map((t) => ({
      hour: t.hour,
      songId: t.songId,
      source: t.source,
      activeC: stable(t.activeC),
      freshKura: stable(t.freshKura),
      persistentBefore: stable(t.persistentBefore),
      persistentAfter: stable(t.persistentAfter),
      score: stable(t.score),
      rank: t.rank,
    })),
  };
}

/**
 * A deterministic string form of a run.
 *
 * Key order is fixed by construction rather than by insertion order, so two
 * structurally identical runs serialise to identical text.
 */
export function fingerprintText(run: SimulationRun): string {
  return JSON.stringify(fingerprint(run));
}

/** True when two runs produced identical normalised output. */
export function runsIdentical(a: SimulationRun, b: SimulationRun): boolean {
  return fingerprintText(a) === fingerprintText(b);
}