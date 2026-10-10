/**
 * BORA Engine — deterministic simulation: snapshots and trace
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 16 (continued). Observational output only.
 *
 * A snapshot is a READ of engine output. Nothing here writes to engine state,
 * and nothing here recomputes an engine value: every figure is either copied
 * from the engine's evaluation result or read from the state the simulation
 * itself prepared. The seed provenance columns are the only values the
 * simulation derives, and they are derived by LOOKING at which input record
 * covered the hour — never by evaluating C.
 *
 * Keeping derived columns out of `EngineState` is deliberate: a snapshot that
 * fed back into state would create a second source of truth.
 *
 * PURE: no clock, no randomness, no mutation, no engine formula.
 */

import type { CHourSource } from './scenario';
import type { RolloverStep } from '../engine/rollover/rollover';
import type { EvaluatedSong } from '../engine/evaluation/chart';
import type { SongLifecycle, PlatformId, HourIndex } from '../engine/types';

/** One song as observed at one simulated hour. */
export interface SongSnapshot {
  readonly songId: string;
  readonly lifecycle: SongLifecycle;

  /** Permanent historical upvotes, read from state. */
  readonly k: number;

  /** Committed persistent Kura at this hour, read from state. */
  readonly persistentKura: number;

  /** Raw C summed by the engine over the active window. */
  readonly activeC: number;
  readonly xp: number;
  readonly kuraFresh: number;

  /** Persistent Kura as the engine scored it — always the committed value. */
  readonly persistentKuraBefore: number | null;

  /** The rollover projection, present only when the hour produced a step. */
  readonly persistentKuraNext: number | null;

  readonly platformPoints: {
    readonly youtube: number;
    readonly spotify: number;
    readonly boomplay: number;
  };

  readonly boraScore: number;
  readonly rank: number | null;

  /**
   * Whether the hour just closed was resolved from an actual bucket, a seed
   * record, or nothing at all. 'NONE' means the hour carried no value and
   * contributed C = 0.
   */
  readonly closedHourSource: CHourSource;

  /** How many unarchived seed records for this song remain after this hour. */
  readonly seedHoursRemaining: number;
}

/** The complete observation of one simulated hour. */
export interface HourSnapshot {
  /** The hour that was CLOSED by this rollover. */
  readonly hour: HourIndex;

  /** The hour the engine advanced to. */
  readonly nextHour: HourIndex;

  /** ACTIVE songs, in engine input order. */
  readonly active: readonly SongSnapshot[];

  /** Vault songs, retained but contributing nothing. */
  readonly vaulted: readonly SongSnapshot[];

  /** Chart-wide T_C as the engine reported it. */
  readonly totalActiveC: number;

  /** Song ids in ranked order, as the engine ranked them. */
  readonly ranking: readonly string[];

  readonly platformTotals: Readonly<Record<PlatformId, number>>;

  /** Ids of events applied before this rollover ran. */
  readonly appliedEvents: readonly string[];
}

/** A compact, machine-testable line of the hourly trace. */
export interface TraceLine {
  readonly hour: HourIndex;
  readonly songId: string;
  readonly source: CHourSource;
  readonly activeC: number;
  readonly freshKura: number;
  readonly persistentBefore: number;
  readonly persistentAfter: number;
  readonly score: number;
  readonly rank: number | null;
}

/** Structured result of a whole simulation run. */
export interface SimulationRun {
  readonly scenarioName: string;

  /** One entry per executed hour, in order. */
  readonly snapshots: readonly HourSnapshot[];

  /** One line per song per hour, in a stable order. */
  readonly trace: readonly TraceLine[];

  /** Invariant violations observed, in discovery order. */
  readonly violations: readonly InvariantViolation[];

  /**
   * Every event that targeted an already-COMMITTED hour, in discovery order.
   *
   * ── S1 ────────────────────────────────────────────────────────────────────
   * `rolloverHour(state, H)` is the commitment boundary. An event at or before a
   * committed hour is LATE: it is never applied, it never mutates committed
   * chart history, and it is recorded here so it cannot vanish silently.
   *
   * This is a report, not a repair mechanism. Nothing here re-opens, re-derives,
   * or corrects a committed hour — a production ingestion layer may store,
   * surface, correct, or review a late event, but it must not rewrite what the
   * engine already committed.
   */
  readonly lateEvents: readonly LateEventReport[];

  /** Per-hour metric totals, for long-run observation. */
  readonly metrics: SimulationMetrics;
}

/**
 * One event that arrived after its target hour had been committed.
 *
 * Reported for observability only. No engine or driver state was changed by it.
 */
export interface LateEventReport {
  /** The hour the event targeted. */
  readonly targetHour: HourIndex;

  /** The most recent hour already committed when it was classified. */
  readonly lastCommittedHour: HourIndex;

  /** A stable description, e.g. `BUCKET:A@990`. */
  readonly description: string;

  /** Always 'LATE'. Present so a future policy can widen the union safely. */
  readonly timing: 'LATE';

  /** Why it was not applied. */
  readonly reason: string;
}

/** An observed breach of a locked engine invariant. */
export interface InvariantViolation {
  readonly hour: HourIndex;
  readonly songId: string | null;
  readonly invariant: string;
  readonly detail: string;
}

/** Aggregate observations over a run. Never an engine computation. */
export interface SimulationMetrics {
  readonly hoursSimulated: number;

  /** Hours whose T_C was greater than zero. */
  readonly hoursWithActivity: number;

  /** Sum of T_C across the run, as reported by the engine. */
  readonly totalActiveC: number;

  /** Committed persistent Kura across ACTIVE songs at the last hour. */
  readonly finalTotalPersistentKura: number;

  /** Highest committed persistent Kura seen for any single song. */
  readonly peakPersistentKura: number;

  /** Hours in which the ranking's first song changed. */
  readonly rankingChanges: number;
}

/**
 * Build one song's snapshot from engine output plus the prepared state.
 *
 * `entry` is the engine's own evaluation row and `step` is the engine's own
 * rollover record. Neither is recomputed here; this only reshapes them.
 */
export function snapshotSong(
  songId: string,
  lifecycle: SongLifecycle,
  k: number,
  persistentKura: number,
  entry: EvaluatedSong | undefined,
  step: RolloverStep | undefined,
  closedHourSource: CHourSource,
  seedHoursRemaining: number,
): SongSnapshot {
  return {
    songId,
    lifecycle,
    k,
    persistentKura,
    activeC: entry ? entry.activeC : 0,
    xp: entry ? entry.xp : 0,
    kuraFresh: entry ? entry.kuraFresh : 0,
    persistentKuraBefore: entry ? entry.persistentKuraBefore : null,
    persistentKuraNext: step ? step.persistentAfter : null,
    platformPoints: entry
      ? entry.platformPerformance
      : { youtube: 0, spotify: 0, boomplay: 0 },
    boraScore: entry ? entry.boraScore : 0,
    rank: entry ? entry.rank : null,
    closedHourSource,
    seedHoursRemaining,
  };
}

/** Total Kura across the ACTIVE songs of one snapshot. */
export function totalPersistentKura(snapshot: HourSnapshot): number {
  let total = 0;
  for (const song of snapshot.active) {
    total += song.persistentKura;
  }
  return total;
}