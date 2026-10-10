/**
 * BORA Engine — deterministic simulation: scenarios and events
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 16. A deterministic LABORATORY for the engine, not a second engine.
 *
 * This module defines only what to run and when. Every mathematical result
 * comes from the engine: `rolloverHour` owns the hourly cycle, and the engine's
 * evaluation produces every C, XP, fresh Kura, platform point, score, and rank.
 * Nothing here recomputes any of them.
 *
 * ── WHY A SCENARIO ──────────────────────────────────────────────────────────
 *
 *   A simulation answers "does the locked specification behave correctly over
 *   time?". That question is only meaningful if the run is exactly repeatable,
 *   so a scenario is fully explicit data: a name, a starting state, an hour
 *   count, and a list of events keyed by integer hour. No clock is read, no
 *   randomness is drawn, and nothing depends on the environment.
 *
 * ── HOURS ARE INTEGERS ─────────────────────────────────────────────────────
 *
 *   Time is an explicit `HourIndex`. The simulation never calls `Date`, never
 *   derives "now", and never skips or invents an hour.
 *
 * PURE: no clock, no randomness, no filesystem, no network, no global state.
 */

import type { HourIndex, PlatformId } from '../engine/types';
import type { EngineState } from '../engine/rollover/rollover';

// ───────────────────────────────────────────────────────────────────────────
// EVENTS
// ───────────────────────────────────────────────────────────────────────────

/** Where a resolved hourly C came from, as observed by the simulation. */
export type CHourSource = 'ACTUAL' | 'SEED' | 'NONE';

/** A deterministic change to the engine state at one explicit hour. */
export type SimulationEvent =
  /**
   * Insert or replace the raw vote bucket for one song-hour.
   *
   * `upvotes: 0, downvotes: 0` is a REAL bucket whose effective C is 0, which
   * the engine treats as actual activity that SUPPRESSES any seed for that
   * hour. That is a meaningful case, distinct from having no bucket at all.
   */
  | {
      readonly kind: 'BUCKET';
      readonly songId: string;
      readonly hour: HourIndex;
      readonly upvotes: number;
      readonly downvotes: number;
    }

  /** Record platform activity for one song at one hour. */
  | {
      readonly kind: 'PLATFORM';
      readonly songId: string;
      readonly hour: HourIndex;
      readonly platform: PlatformId;
      readonly value: number;
    }

  /** Move a song ACTIVE → VAULT through the Phase 13 transition. */
  | {
      readonly kind: 'VAULT';
      readonly songId: string;
      readonly hour: HourIndex;
    }

  /**
   * Move a song VAULT → ACTIVE through the Phase 13 transition.
   *
   * Restore RESETS persistent Kura to 0 and never creates a seed. The engine's
   * `restoreSong` owns both rules; the simulation only calls it.
   */
  | {
      readonly kind: 'RESTORE';
      readonly songId: string;
      readonly hour: HourIndex;
    };

/**
 * When an event may be applied, relative to the commitment boundary.
 *
 * ── S1 LATE-DATA POLICY ──────────────────────────────────────────────────────
 *
 *   `rolloverHour(state, H)` is the COMMITMENT BOUNDARY. It closes hour H and
 *   advances the state to H+1. Once that has happened, hour H is settled and
 *   nothing may revise it.
 *
 *   The engine itself has no notion of "late" — it is a pure function over the
 *   state it is handed, and it has no clock. Lateness is therefore a property of
 *   ORCHESTRATION, and it is classified here, explicitly and without a clock.
 */
export type EventTiming =
  /** Targets the currently open hour. Applied, and it closes that hour. */
  | 'ON_TIME'
  /** Targets an hour that has not been reached yet. Held until it opens. */
  | 'FUTURE'
  /**
   * Targets an hour at or before the last COMMITTED hour.
   *
   * The event is never applied and never mutates committed state. It is still
   * REPORTED, so late data can never disappear silently (S1).
   */
  | 'LATE';

/**
 * Classify one event against the commitment boundary. Pure, clock-free.
 *
 * ── WHY AN EVENT AT THE INITIAL REFERENCE HOUR IS ON_TIME (Phase 20R, R5) ────
 *
 * RATIFIED. The late-data boundary is defined RELATIVE TO THE LATEST COMMITTED
 * REFERENCE HOUR, not relative to the first hour the simulation happens to
 * name. Before the first rollover, `lastCommittedHour` is `null`: no hour has
 * been committed, so no hour can have been missed. An event targeting the
 * initial reference hour is therefore ON_TIME — nothing has yet crossed the
 * commitment boundary.
 *
 * This is not a special case bolted on; it falls out of the boundary being
 * defined in terms of commitment. `rolloverHour` is what makes an hour late,
 * and it has not run yet.
 *
 * Scheduler behaviour is unchanged by this ratification.
 *
 * @param event            The event being considered.
 * @param referenceHour    The currently open hour (`state.referenceHour`).
 * @param lastCommittedHour The most recent hour already committed, or null when
 *                          nothing has been committed yet.
 */
export function classifyEventTiming(
  event: SimulationEvent,
  referenceHour: HourIndex,
  lastCommittedHour: HourIndex | null,
): EventTiming {
  const target = event.hour;

  // Future data is legitimate: it waits for its own hour to open.
  if (target > referenceHour) {
    return 'FUTURE';
  }

  // Nothing has been committed yet, so no hour can be late. An event at the
  // INITIAL reference hour is ON_TIME for exactly this reason: the boundary is
  // defined by commitment, and no rollover has occurred to create one.
  // (Ratified Phase 20R, R5.)
  if (lastCommittedHour === null) {
    return 'ON_TIME';
  }

  // The commitment boundary. Anything at or before the last committed hour has
  // already been settled and cannot be revisited.
  if (target <= lastCommittedHour) {
    return 'LATE';
  }

  return 'ON_TIME';
}

/** One event bound to an explicit hour, ready for the scheduler. */
export interface ScheduledEvent {
  readonly hour: HourIndex;

  /** Declaration order within the hour, so ordering is deterministic. */
  readonly order: number;

  readonly event: SimulationEvent;
}

// ───────────────────────────────────────────────────────────────────────────
// SCENARIO
// ───────────────────────────────────────────────────────────────────────────

/** Everything needed to reproduce a run exactly. */
export interface SimulationScenario {
  /** Stable identifier, used in traces and failure reports. */
  readonly name: string;

  /** The committed state at `initialState.referenceHour`. */
  readonly initialState: EngineState;

  /** How many hourly cycles to execute. Always a non-negative integer. */
  readonly hours: number;

  /** Events, keyed by the hour at which they are applied. */
  readonly events: readonly SimulationEvent[];

  /** When false, invariant violations are collected but do not stop the run. */
  readonly strictInvariants?: boolean;
}

/**
 * Order events deterministically.
 *
 * Sorting by `order` (declaration index) within an hour means two runs of the
 * same scenario apply the same events in the same sequence, which is what makes
 * replay reproducible. Declaration order is preserved rather than sorted by any
 * content, so an event never silently overtakes an earlier one.
 */
export function scheduleEvents(
  events: readonly SimulationEvent[],
): ScheduledEvent[] {
  return events
    .map((event, order) => ({
      hour: (event as { hour: HourIndex }).hour,
      order,
      event,
    }))
    .sort((a, b) => (a.hour - b.hour) || (a.order - b.order));
}

/** The events scheduled for one hour, in deterministic order. */
export function eventsAt(
  schedule: readonly ScheduledEvent[],
  hour: HourIndex,
): ScheduledEvent[] {
  return schedule.filter((e) => e.hour === hour);
}
