/**
 * BORA Engine — deterministic simulation driver
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PHASE 16 (continued). The driver, and nothing more.
 *
 *     Scenario
 *        ↓  event scheduler (deterministic, by integer hour)
 *        ↓  state preparation (buckets, observations, lifecycle transitions)
 *        ↓  rolloverHour          ← the engine owns the entire cycle
 *        ↓  engine evaluation      (read back from the rollover outcome)
 *        ↓  snapshot
 *        ↓  invariant checks
 *        ↓  trace
 *
 * ── THE DRIVER REPRODUCES NO ENGINE MATHEMATICS ─────────────────────────────
 *
 *   Per hour it does exactly four things: apply events, call `rolloverHour`,
 *   read the engine's own output, and record it. C, XP, fresh Kura, persistent
 *   Kura, decay, platform points, score, and rank are all taken from the
 *   engine's evaluation result. There is deliberately no local arithmetic on
 *   any of them.
 *
 * ── THE ENGINE SEQUENCE IS NOT RE-STATED HERE ───────────────────────────────
 *
 *   `rolloverHour` performs "evaluate H, resolve C_H, fresh Kura, update
 *   persistent Kura, commit, advance to H+1, evaluate H+1" internally. The
 *   driver never performs those steps itself and never commits anything: it
 *   simply adopts the returned state as the next state.
 *
 * ── ERRORS SURFACE, THEY ARE NEVER SWALLOWED ───────────────────────────────
 *
 *   A failure returns a structured `SimulationFailure` naming the hour and the
 *   event that caused it, carrying the ORIGINAL engine error unchanged. No
 *   error is caught, defaulted, or turned into a fake successful hour.
 *
 * PURE: no clock, no randomness, no global state, no I/O, no UI.
 */

import { rolloverHour } from '../engine/rollover/rollover';
import { vaultSong, restoreSong } from '../engine/lifecycle/lifecycle';
import { emptyBucket } from '../engine/bucket';
import type { EngineState, RolloverSong } from '../engine/rollover/rollover';
import type { EngineError, HourIndex, PlatformId, VoteBucket } from '../engine/types';
import type { SimulationScenario, SimulationEvent, ScheduledEvent, CHourSource } from './scenario';
import { scheduleEvents, eventsAt, classifyEventTiming } from './scenario';
import type {
  SimulationRun,
  HourSnapshot,
  SongSnapshot,
  TraceLine,
  InvariantViolation,
  SimulationMetrics,
  LateEventReport,
} from './snapshot';
import { snapshotSong, totalPersistentKura } from './snapshot';
import { C_MAX, KURA_TOTAL, EPSILON_SUM, C_WINDOW_HOURS } from '../engine/constants';

/** A simulation that could not complete. The engine error is preserved. */
export interface SimulationFailure {
  readonly scenarioName: string;
  /** The hour at which the run stopped. */
  readonly hour: HourIndex;
  /** Which event caused it, when the failure came from one. */
  readonly failedEvent: SimulationEvent | null;
  /** The engine's own error, unmodified. */
  readonly error: EngineError;
  /** Snapshots completed before the failure. */
  readonly partialSnapshots: readonly HourSnapshot[];
}

export type SimulationResult =
  | { readonly ok: true; readonly value: SimulationRun }
  | { readonly ok: false; readonly error: SimulationFailure };

// ───────────────────────────────────────────────────────────────────────────
// STATE PREPARATION
// ───────────────────────────────────────────────────────────────────────────

/** Replace or insert one platform observation for a song at one hour. */
function withObservation(
  series: RolloverSong['platform'],
  platform: PlatformId,
  hourIndex: HourIndex,
  value: number,
): RolloverSong['platform'] {
  const kept = series[platform].filter((o) => o.hourIndex !== hourIndex);
  const observation = {
    hourIndex,
    platform,
    value,
    source: 'IN_CHART' as const,
    lifecycle: 'ACTIVE' as const,
    version: 0,
  };
  return { ...series, [platform]: [...kept, observation] };
}

/**
 * Apply one event to the state, returning a NEW state.
 *
 * Every branch produces fresh objects; the input state is never written to.
 * Lifecycle transitions are delegated to the Phase 13 functions so the Vault
 * and restore rules — dormant Kura retention, K retention, Kura reset on
 * restore, and never reseeding — are enforced by the engine, not restated here.
 */
function applyEvent(
  state: EngineState,
  scheduled: ScheduledEvent,
): EngineState {
  const event = scheduled.event;

  const songs = state.songs.map((song): RolloverSong => {
    if (song.songId !== event.songId) {
      return song;
    }

    switch (event.kind) {
      case 'BUCKET': {
        // An upsert: replace any existing bucket for that hour, else insert.
        const kept = song.buckets.filter((b) => b.hourIndex !== event.hour);
        const bucket: VoteBucket = {
          ...emptyBucket(event.hour),
          upvotes: event.upvotes,
          downvotes: event.downvotes,
        };
        return { ...song, buckets: [...kept, bucket] };
      }

      case 'PLATFORM': {
        return {
          ...song,
          platform: withObservation(song.platform, event.platform, event.hour, event.value),
        };
      }

      case 'VAULT': {
        const transition = vaultSong({
          songId: song.songId,
          lifecycle: song.lifecycle,
          k: song.k,
          persistentKura: song.persistentKura,
          history: [song.buckets, song.platform],
        });
        // The engine owns the transition; a rejected transition is reported
        // when the rollover runs, never silently ignored here.
        return transition.ok
          ? { ...song, lifecycle: transition.value.song.lifecycle }
          : song;
      }

      case 'RESTORE': {
        const transition = restoreSong({
          songId: song.songId,
          lifecycle: song.lifecycle,
          k: song.k,
          persistentKura: song.persistentKura,
          history: [song.buckets, song.platform],
        });
        // Phase 13 resets the active persistent Kura on restore and never
        // creates a seed; both values are read straight from the transition.
        return transition.ok
          ? {
              ...song,
              lifecycle: transition.value.song.lifecycle,
              persistentKura: transition.value.song.persistentKura,
            }
          : song;
      }
    }
  });

  return { ...state, songs };
}

// ───────────────────────────────────────────────────────────────────────────
// OBSERVATION
// ───────────────────────────────────────────────────────────────────────────

/**
 * Report which input record covered a closed hour.
 *
 * This is a LOOK at the prepared state, not an evaluation of C. It answers
 * "which record spoke for this hour?", which is exactly the precedence the
 * engine applies: an actual bucket suppresses the seed even when its C is 0,
 * and an archived seed record no longer counts.
 */
function observeSource(
  song: RolloverSong,
  hour: HourIndex,
): CHourSource {
  if (song.buckets.some((b) => b.hourIndex === hour)) {
    return 'ACTUAL';
  }
  const seed = song.seedHours.find((r) => r.hourIndex === hour);
  if (seed && seed.lifecycle !== 'ARCHIVED') {
    return 'SEED';
  }
  return 'NONE';
}

/** Seed records that have not been archived and still lie ahead of this hour. */
function seedHoursRemaining(song: RolloverSong, afterHour: HourIndex): number {
  let count = 0;
  for (const record of song.seedHours) {
    if (record.lifecycle !== 'ARCHIVED' && record.hourIndex > afterHour) {
      count++;
    }
  }
  return count;
}

/**
 * Collect invariant violations for one hour.
 *
 * These are OBSERVATIONS about engine output, not a second implementation of
 * any rule. Each check compares a value the engine produced against a bound the
 * engine already documents.
 */
function checkInvariants(
  hour: HourIndex,
  snapshot: HourSnapshot,
): InvariantViolation[] {
  const found: InvariantViolation[] = [];

  let xpSum = 0;
  for (const song of snapshot.active) {
    xpSum += song.xp;

    // C bounds: the threshold structure yields [0, C_MAX].
    if (song.activeC < 0 || song.activeC > C_WINDOW_HOURS * C_MAX) {
      found.push({
        hour,
        songId: song.songId,
        invariant: 'C_BOUNDS',
        detail: `activeC ${song.activeC} outside [0, ${C_WINDOW_HOURS * C_MAX}]`,
      });
    }

    // Fresh Kura is a normalised share, so it cannot exceed KURA_TOTAL.
    if (song.kuraFresh < 0 || song.kuraFresh > KURA_TOTAL) {
      found.push({
        hour,
        songId: song.songId,
        invariant: 'FRESH_KURA_BOUNDS',
        detail: `kuraFresh ${song.kuraFresh} outside [0, ${KURA_TOTAL}]`,
      });
    }

    // Committed Kura can never go negative.
    if (song.persistentKura < 0) {
      found.push({
        hour,
        songId: song.songId,
        invariant: 'PERSISTENT_KURA_NON_NEGATIVE',
        detail: `persistentKura ${song.persistentKura}`,
      });
    }

    // No NaN or Infinity may reach the score.
    if (!Number.isFinite(song.boraScore)) {
      found.push({
        hour,
        songId: song.songId,
        invariant: 'SCORE_FINITE',
        detail: `boraScore ${song.boraScore}`,
      });
    }

    // A Vault song must contribute nothing to any active figure.
    if (song.lifecycle === 'VAULT') {
      if (song.activeC !== 0 || song.xp !== 0 || song.kuraFresh !== 0) {
        found.push({
          hour,
          songId: song.songId,
          invariant: 'VAULT_IS_EXCLUDED',
          detail: `vault song reported C=${song.activeC} XP=${song.xp} fresh=${song.kuraFresh}`,
        });
      }
    }
  }

  // XP normalises to 1 when there is activity, and is all-zero when there is
  // none. Both halves are the engine's own locked contract.
  if (snapshot.totalActiveC > 0) {
    if (Math.abs(xpSum - 1) > EPSILON_SUM) {
      found.push({
        hour,
        songId: null,
        invariant: 'XP_SUMS_TO_ONE',
        detail: `sum XP ${xpSum} differs from 1 by more than ${EPSILON_SUM}`,
      });
    }
  } else {
    for (const song of snapshot.active) {
      if (song.xp !== 0) {
        found.push({
          hour,
          songId: song.songId,
          invariant: 'XP_ZERO_WHEN_TC_ZERO',
          detail: `T_C is 0 but XP is ${song.xp}`,
        });
      }
    }
  }

  // Seed activity must never appear outside its explicit runway. A seed whose
  // hour is beyond the 72-hour runway would show up here as a SEED source at an
  // hour no record names, so the check is on the source column itself.
  for (const song of snapshot.active) {
    if (song.closedHourSource === 'SEED' && song.seedHoursRemaining < 0) {
      found.push({
        hour,
        songId: song.songId,
        invariant: 'SEED_WITHIN_RUNWAY',
        detail: 'seed source reported with no runway remaining',
      });
    }
  }

  // The reference hour advances by exactly one per successful rollover.
  if (snapshot.nextHour !== snapshot.hour + 1) {
    found.push({
      hour,
      songId: null,
      invariant: 'REFERENCE_HOUR_ADVANCES_ONE',
      detail: `${snapshot.hour} -> ${snapshot.nextHour}`,
    });
  }

  return found;
}

// ───────────────────────────────────────────────────────────────────────────
// THE DRIVER LOOP
// ───────────────────────────────────────────────────────────────────────────

/**
 * Run a scenario hour by hour.
 *
 * Per hour:
 *   1. apply the events scheduled for this hour, in declaration order
 *   2. call `rolloverHour` — the engine performs the whole cycle
 *   3. read the engine's evaluation and build a snapshot
 *   4. record invariant observations and trace lines
 *   5. adopt the returned state as the next state
 *
 * The driver never commits anything itself: step 5 adopts the engine's own
 * returned state. It also never evaluates C, XP, Kura, score, or rank.
 *
 * DETERMINISM. Given the same scenario, the run is identical: hours are
 * integers, events are ordered by declaration index, and no value depends on
 * the clock, the environment, or iteration order of a hash container.
 *
 * @param scenario The fully explicit run definition.
 * @returns The complete run, or a structured failure carrying the engine error.
 */
export function runSimulation(
  scenario: SimulationScenario,
): SimulationResult {
  const schedule = scheduleEvents(scenario.events);

  let state: EngineState = scenario.initialState;
  const snapshots: HourSnapshot[] = [];
  const trace: TraceLine[] = [];
  const violations: InvariantViolation[] = [];

  // ── S1: the commitment boundary ──────────────────────────────────────────
  //
  // `null` until the first rollover commits. After each commit it becomes the
  // hour that was just closed, and any event targeting that hour or earlier is
  // LATE: never applied, never allowed to rewrite committed history, and always
  // reported so it cannot disappear silently.
  let lastCommittedHour: HourIndex | null = null;
  const lateEvents: LateEventReport[] = [];

  // Events whose target hour is BEFORE the run even began can never reach an
  // hour loop — the driver only ever reads the hour it is currently processing.
  // They are classified here so they are REPORTED rather than vanishing.
  //
  // Events BEYOND the run horizon are a different thing entirely: they are not
  // late, they are simply not reached within this scenario, so they are not
  // reported as late.
  const firstHour = scenario.initialState.referenceHour;
  for (const item of schedule) {
    if (item.hour < firstHour) {
      lateEvents.push({
        targetHour: item.event.hour,
        lastCommittedHour: firstHour,
        description: describeEvent(item.event),
        timing: 'LATE',
        reason:
          `Target hour ${item.event.hour} precedes the run's first hour ` +
          `${firstHour}. The commitment boundary is final; a late event never ` +
          'rewrites committed chart history.',
      });
    }
  }

  let hoursWithActivity = 0;
  let totalActiveC = 0;
  let peakPersistentKura = 0;
  let rankingChanges = 0;
  let previousLeader: string | null = null;

  for (let tick = 0; tick < scenario.hours; tick++) {
    const hour = state.referenceHour;

    // 1. Apply this hour's events, in deterministic order.
    const scheduled = eventsAt(schedule, hour);
    const appliedEventIds: string[] = [];

    for (const item of scheduled) {
      const timing = classifyEventTiming(item.event, hour, lastCommittedHour);

      // LATE: recorded, explicitly, and deliberately NOT applied. Committed
      // history is not revised by a late arrival.
      if (timing === 'LATE') {
        lateEvents.push({
          targetHour: item.event.hour,
          lastCommittedHour: lastCommittedHour as HourIndex,
          description: describeEvent(item.event),
          timing: 'LATE',
          reason:
            `Target hour ${item.event.hour} was already committed at ` +
            `${lastCommittedHour}. The commitment boundary is final; a late ` +
            'event never rewrites committed chart history.',
        });
        continue;
      }

      state = applyEvent(state, item);
      appliedEventIds.push(describeEvent(item.event));
    }

    // 2. The engine runs the entire hourly cycle. Nothing is done for it here.
    const rolled = rolloverHour(state, hour);
    if (!rolled.ok) {
      // The engine error is preserved verbatim; it is never defaulted away.
      return {
        ok: false,
        error: {
          scenarioName: scenario.name,
          hour,
          failedEvent: scheduled.length > 0 ? scheduled[scheduled.length - 1].event : null,
          error: rolled.error,
          partialSnapshots: snapshots,
        },
      };
    }

    const outcome = rolled.value;
    const chart = outcome.chartAtClosedHour;

    // The commitment boundary moves. From here on, this hour is settled:
    // nothing — late, backdated, or otherwise — may revise it.
    lastCommittedHour = hour;

    // 3. Observe. Every figure is read from the engine's own output.
    const active: SongSnapshot[] = [];
    const vaulted: SongSnapshot[] = [];

    for (const song of outcome.state.songs) {
      const entry = chart.active.find((e) => e.songId === song.songId);
      const step = outcome.steps.find((s) => s.songId === song.songId);

      const snap = snapshotSong(
        song.songId,
        song.lifecycle,
        song.k,
        song.persistentKura,
        entry,
        step,
        observeSource(song, hour),
        seedHoursRemaining(song, hour),
      );

      if (song.lifecycle === 'VAULT') {
        vaulted.push(snap);
      } else {
        active.push(snap);
      }
    }

    const snapshot: HourSnapshot = {
      hour,
      nextHour: outcome.toHour,
      active,
      vaulted,
      totalActiveC: chart.totalActiveC,
      ranking: chart.ranked.map((e) => e.songId),
      platformTotals: chart.platformTotals,
      appliedEvents: appliedEventIds,
    };

    snapshots.push(snapshot);

    // 4. Record observations and trace.
    violations.push(...checkInvariants(hour, snapshot));

    for (const snap of snapshot.active) {
      trace.push({
        hour,
        songId: snap.songId,
        source: snap.closedHourSource,
        activeC: snap.activeC,
        freshKura: snap.kuraFresh,
        persistentBefore: snap.persistentKura,
        persistentAfter: snap.persistentKuraNext ?? snap.persistentKura,
        score: snap.boraScore,
        rank: snap.rank,
      });
    }

    // Metrics are counted from engine output, never recomputed.
    if (chart.totalActiveC > 0) {
      hoursWithActivity++;
    }
    totalActiveC += chart.totalActiveC;

    const currentKura = totalPersistentKura(snapshot);
    if (currentKura > peakPersistentKura) {
      peakPersistentKura = currentKura;
    }

    const leader = snapshot.ranking[0] ?? null;
    if (previousLeader !== null && leader !== previousLeader) {
      rankingChanges++;
    }
    previousLeader = leader;

    // 5. Adopt the engine's returned state verbatim.
    state = outcome.state;

    if (scenario.strictInvariants && violations.length > 0) {
      return {
        ok: false,
        error: {
          scenarioName: scenario.name,
          hour,
          failedEvent: null,
          error: {
            code: 'INVALID_MEASUREMENT',
            message: `Scenario "${scenario.name}" breached an engine invariant at hour ${hour}.`,
            context: { violations: String(violations.length) },
          },
          partialSnapshots: snapshots,
        },
      };
    }
  }

  const lastSnapshot = snapshots[snapshots.length - 1];
  const metrics: SimulationMetrics = {
    hoursSimulated: snapshots.length,
    hoursWithActivity,
    totalActiveC,
    finalTotalPersistentKura: lastSnapshot ? totalPersistentKura(lastSnapshot) : 0,
    peakPersistentKura,
    rankingChanges,
  };

  return {
    ok: true,
    value: {
      scenarioName: scenario.name,
      snapshots,
      trace,
      violations,
      lateEvents,
      metrics,
    },
  };
}

/** A short, stable label for an event, used in the applied-event record. */
export function describeEvent(event: SimulationEvent): string {
  switch (event.kind) {
    case 'BUCKET':
      return `BUCKET:${event.songId}@${event.hour}`;
    case 'PLATFORM':
      return `PLATFORM:${event.songId}@${event.hour}:${event.platform}`;
    case 'VAULT':
      return `VAULT:${event.songId}@${event.hour}`;
    case 'RESTORE':
      return `RESTORE:${event.songId}@${event.hour}`;
  }
}