/**
 * BORA — PHASE 21 INDEPENDENT REFERENCE MODEL
 * ═══════════════════════════════════════════════════════════════════════════
 * REF-ROLLOVER — the hourly state transition.
 *
 * ── THE LOCKED SEQUENCE (A3) ─────────────────────────────────────────────────
 *
 * Given the state at H, with H being the hour that has just CLOSED:
 *
 *     1. evaluate the chart AT H
 *     2. resolve C_H  (actual, else seed, else 0)
 *     3. take fresh Kura from the H evaluation
 *     4. calculate D_H from C_H
 *     5. commit persistentNext into a NEW state
 *     6. advance the reference hour H → H+1
 *     7. evaluate the chart AT H+1, which sees the committed Kura
 *
 * TWO ORDERING FACTS ARE THE WHOLE POINT:
 *
 *   · Step 2 always uses H, NEVER H+1. D_h is the decay of the hour that just
 *     ended, so computing it from the new hour's activity would let a song's
 *     balance decay against activity it had not yet earned.
 *
 *   · Fresh Kura is injected BEFORE decay, so the amount just earned is itself
 *     subject to that cycle's decay.
 *
 * ONE HOUR ONLY. A caller needing H → H+3 calls this three times, so each
 * elapsed hour receives its own C and its own decay. Collapsing a multi-hour
 * gap into one cycle would decay three hours as though only one had passed.
 *
 * VAULT IS AN EXCLUSION, NEVER A RESET. A Vaulted song is copied through
 * untouched: no fresh Kura, no decay, no place in either chart. Its dormant
 * balance must not silently decay while it is not being scored.
 *
 * NOTHING IS REGENERATED. Buckets and seed records are carried verbatim;
 * expiry removes no record, it only stops that record from being selected.
 *
 * PURE: no clock, no randomness, no mutation of the input state, no global
 * state. The same input always produces an identical output.
 */

import {
  refEvaluate,
  refIsActive,
  refResolvedCForHour,
  refPersistentNext,
  refDecayRate,
} from './model';

import type { RefSong, RefChart } from './types';

/** The committed state at one reference hour. */
export interface RefState {
  readonly referenceHour: number;
  readonly songs: readonly RefSong[];
}

/** What one rollover did to one song's persistent Kura. */
export interface RefRolloverStep {
  readonly songId: string;
  readonly hourClosed: number;
  /** C of the just-closed hour — the input to D_h. */
  readonly closedHourC: number;
  /** The fresh Kura injected this cycle. */
  readonly freshInjected: number;
  /** D_h, the decay RATE. */
  readonly decayRate: number;
  /** Amount removed by decay this cycle. */
  readonly decayed: number;
  readonly persistentBefore: number;
  readonly persistentAfter: number;
}

/** The outcome of advancing exactly one hour. */
export interface RefRolloverOutcome {
  readonly fromHour: number;
  readonly toHour: number;
  /** The committed state AFTER the hour advanced. */
  readonly state: RefState;
  /** The chart as it stood AT fromHour, before commitment. */
  readonly chartAtClosedHour: RefChart;
  /** The chart AT toHour, which sees the newly committed Kura. */
  readonly chartAtNextHour: RefChart;
  readonly steps: readonly RefRolloverStep[];
}

/**
 * Advance the reference model by exactly one hour.
 *
 * @param state      The committed state at `state.referenceHour`.
 * @param closedHour The hour that has just closed. Must equal that hour.
 */
export function refRolloverHour(
  state: RefState,
  closedHour: number,
): RefRolloverOutcome {
  // 0. The hour being closed must be the state's own reference hour. Rollover
  //    advances exactly one hour and never skips or invents one.
  if (closedHour !== state.referenceHour) {
    throw new Error(
      'REF-ROLLOVER: closedHour must equal the state referenceHour; rollover ' +
        'advances exactly one hour and never skips or invents one.',
    );
  }

  // 1. THE CHART AT H, before any commitment.
  const chartAtClosed = refEvaluate({
    referenceHour: closedHour,
    closedHourC: null,
    songs: state.songs,
  });

  const freshBySong = new Map<string, number>();
  for (const entry of chartAtClosed.active) {
    freshBySong.set(entry.songId, entry.freshKura);
  }

  const nextHour = closedHour + 1;
  const steps: RefRolloverStep[] = [];
  const nextSongs: RefSong[] = [];

  for (const song of state.songs) {
    // VAULT: copied through untouched. No decay, no injection, no deletion.
    if (!refIsActive(song)) {
      nextSongs.push(song);
      continue;
    }

    // 2 + 3 + 4. Resolve C of the hour that JUST CLOSED — never H+1's — then
    // take that song's fresh Kura from the H evaluation and compute D_H.
    const resolved = refResolvedCForHour(song, closedHour, closedHour);
    const freshInjected = freshBySong.get(song.id) ?? 0;
    const decayRate = refDecayRate(resolved.c);

    // 5. COMMIT into a NEW song object. The input song is never touched.
    const persistentAfter = refPersistentNext(
      song.persistentKura,
      freshInjected,
      resolved.c,
    );
    nextSongs.push({ ...song, persistentKura: persistentAfter });

    steps.push({
      songId: song.id,
      hourClosed: closedHour,
      closedHourC: resolved.c,
      freshInjected,
      decayRate,
      decayed: song.persistentKura + freshInjected - persistentAfter,
      persistentBefore: song.persistentKura,
      persistentAfter,
    });
  }

  // 6. Advance the reference hour. Buckets and seed records are carried over
  //    untouched — expiry is selection, never deletion.
  const nextState: RefState = { referenceHour: nextHour, songs: nextSongs };

  // 7. The chart AT H+1, which now sees the committed persistent Kura.
  const chartAtNext = refEvaluate({
    referenceHour: nextHour,
    closedHourC: null,
    songs: nextState.songs,
  });

  return {
    fromHour: closedHour,
    toHour: nextHour,
    state: nextState,
    chartAtClosedHour: chartAtClosed,
    chartAtNextHour: chartAtNext,
    steps,
  };
}
