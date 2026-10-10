/**
 * BORA Engine — Phase 19: per-hour invariant checking
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Invariants are checked AFTER EVERY COMMITTED HOUR, not once at the end, so a
 * failure names the exact hour it broke on and can be isolated to a minimal
 * deterministic timeline.
 *
 * ── THE RULE THIS FILE FOLLOWS ──────────────────────────────────────────────
 *
 * It READS the engine's own outputs. It never recomputes them.
 *
 * It does not calculate C, XP, Kura, decay, platform points, score or rank.
 * Where a bound is needed, it comes from `src/engine/constants.ts` — the same
 * constants the engine uses. Where a relationship is checked (XP sums to 1, K
 * never falls), it is checked BETWEEN two values the engine produced at two
 * different hours, not against a value this file derived.
 *
 * That is what keeps the endurance harness from becoming a second engine.
 */

import type { HourSnapshot, SimulationRun } from '../snapshot';
import { C_MAX, C_WINDOW_HOURS, KURA_TOTAL, EPSILON_SUM } from '../../engine/constants';

/** How an invariant failure is classified, per the Phase 19 failure taxonomy. */
export type FailureClass =
  | 'TEST_DEFECT'
  | 'SCENARIO_DEFECT'
  | 'EXPECTED_BEHAVIOR'
  | 'EXISTING_ENGINE_DEFECT'
  | 'SIMULATOR_DEFECT'
  | 'PERFORMANCE_LIMIT'
  | 'NUMERICAL_STABILITY_ISSUE'
  | 'STATE_GROWTH_ISSUE';

export interface InvariantFailure {
  readonly hour: number;
  readonly songId: string | null;
  readonly invariant: string;
  readonly detail: string;
  readonly classification: FailureClass;
}

export interface InvariantReport {
  /** Total individual assertions evaluated across the whole run. */
  readonly checks: number;
  readonly failures: readonly InvariantFailure[];
}

function finite(x: number): boolean {
  return Number.isFinite(x) && !Number.isNaN(x);
}

/**
 * Validate one committed hour.
 *
 * Every assertion reads from the snapshot, which the driver built entirely
 * from the engine's evaluation and rollover output.
 */
export function checkHour(hour: number, s: HourSnapshot): { checks: number; failures: InvariantFailure[] } {
  let checks = 0;
  const failures: InvariantFailure[] = [];

  const fail = (
    songId: string | null,
    invariant: string,
    detail: string,
    classification: FailureClass = 'EXISTING_ENGINE_DEFECT',
  ) => failures.push({ hour, songId, invariant, detail, classification });

  // ── Numerical safety ──────────────────────────────────────────────────────
  if (!finite(s.totalActiveC) || s.totalActiveC < 0) {
    fail(null, 'NUMERICAL_SAFETY', `totalActiveC ${s.totalActiveC}`);
  }
  checks++;

  // Platform totals must stay finite and non-negative.
  for (const platform of ['youtube', 'spotify', 'boomplay'] as const) {
    const v = s.platformTotals[platform];
    if (!finite(v) || v < 0) {
      fail(null, 'NUMERICAL_SAFETY', `platformTotals.${platform} ${v}`);
    }
    checks++;
  }

  // ── XP: normalised within the hour ────────────────────────────────────────
  let xpSum = 0;
  for (const song of s.active) {
    if (!finite(song.activeC) || song.activeC < 0) {
      fail(song.songId, 'NUMERICAL_SAFETY', `activeC ${song.activeC}`);
    }
    if (!finite(song.xp) || song.xp < 0 || song.xp > 1) {
      fail(song.songId, 'XP_RANGE', `xp ${song.xp} outside [0,1]`);
    }
    if (!finite(song.kuraFresh) || song.kuraFresh < 0) {
      fail(song.songId, 'NUMERICAL_SAFETY', `kuraFresh ${song.kuraFresh}`);
    }
    if (!finite(song.boraScore)) {
      fail(song.songId, 'NUMERICAL_SAFETY', `boraScore ${song.boraScore}`);
    }
    if (!finite(song.persistentKura) || song.persistentKura < 0) {
      fail(song.songId, 'PERSISTENT_KURA_NON_NEGATIVE', `persistentKura ${song.persistentKura}`);
    }
    if (song.kuraFresh > KURA_TOTAL + 1e-9) {
      fail(song.songId, 'FRESH_KURA_BOUNDS', `kuraFresh ${song.kuraFresh} > ${KURA_TOTAL}`);
    }
    xpSum += song.xp;
    checks += 6;
  }

  // XP sums to 1 when the chart has activity, and is uniformly 0 when it has
  // none. Both branches read the engine's own T_C and XP — neither is computed
  // here.
  if (s.totalActiveC > 0) {
    if (Math.abs(xpSum - 1) > EPSILON_SUM) {
      fail(null, 'XP_CONSERVATION', `sum(xp) ${xpSum} != 1 while T_C = ${s.totalActiveC}`);
    }
  } else if (xpSum !== 0) {
    fail(null, 'XP_ZERO_WHEN_TC_ZERO', `sum(xp) ${xpSum} with T_C = 0`);
  }
  checks++;

  // ── C bounds: within the window's theoretical maximum ─────────────────────
  const perSongCeiling = C_WINDOW_HOURS * C_MAX;
  for (const song of s.active) {
    if (song.activeC > perSongCeiling + 1e-9) {
      fail(song.songId, 'C_BOUNDS', `activeC ${song.activeC} > ${perSongCeiling}`);
    }
    checks++;
  }

  // ── Lifecycle: a Vaulted song is never scored ─────────────────────────────
  for (const song of s.vaulted) {
    if (song.boraScore !== 0 || song.activeC !== 0 || song.xp !== 0 || song.kuraFresh !== 0) {
      fail(
        song.songId,
        'VAULT_EXCLUSION',
        `vaulted song scored: C=${song.activeC} xp=${song.xp} fresh=${song.kuraFresh} score=${song.boraScore}`,
      );
    }
    if (song.persistentKura < 0) {
      fail(song.songId, 'PERSISTENT_KURA_NON_NEGATIVE', `vaulted persistentKura ${song.persistentKura}`);
    }
    checks += 2;
  }

  // ── Ranking: the chart's ranking must cover exactly the active songs ──────
  if (s.ranking.length !== s.active.length) {
    fail(
      null,
      'RANKING_COMPLETENESS',
      `ranking has ${s.ranking.length} entries, active has ${s.active.length}`,
    );
  }
  if (new Set(s.ranking).size !== s.ranking.length) {
    fail(null, 'RANKING_UNIQUENESS', 'duplicate songId in ranking');
  }
  checks += 2;

  return { checks, failures };
}

// ── CROSS-HOUR INVARIANTS ──────────────────────────────────────────────────

/**
 * Check relationships that only become visible ACROSS committed hours.
 *
 * K is historical and must never fall; a Vaulted song must not decay; and the
 * hour must advance by exactly one. Each is checked between two snapshots the
 * engine produced, never against a value derived here.
 */
export function checkAcrossHours(run: SimulationRun): {
  checks: number;
  failures: InvariantFailure[];
} {
  let checks = 0;
  const failures: InvariantFailure[] = [];
  const bySong = new Map<string, number>();

  for (const s of run.snapshots) {
    const h = s.hour as number;

    for (const song of [...s.active, ...s.vaulted]) {
      // K is historical: it may only rise, and never because of a downvote.
      const previousK = bySong.get(song.songId);
      if (previousK !== undefined && song.k < previousK) {
        failures.push({
          hour: h,
          songId: song.songId,
          invariant: 'K_MONOTONIC',
          detail: `k fell ${previousK} → ${song.k}`,
          classification: 'EXISTING_ENGINE_DEFECT',
        });
      }
      bySong.set(song.songId, song.k);
      checks++;

      // A Vaulted song's balance is frozen: no injection, no decay.
      if (song.lifecycle === 'VAULT' && song.persistentKuraNext !== null) {
        failures.push({
          hour: h,
          songId: song.songId,
          invariant: 'VAULT_NO_CYCLE',
          detail: `vaulted song has persistentKuraNext ${song.persistentKuraNext}`,
          classification: 'EXISTING_ENGINE_DEFECT',
        });
      }
      checks++;
    }
  }

  // The clock advances by exactly one per committed hour, contiguously.
  for (let i = 1; i < run.snapshots.length; i++) {
    const prev = run.snapshots[i - 1].hour as number;
    const cur = run.snapshots[i].hour as number;
    if (cur !== prev + 1) {
      failures.push({
        hour: cur,
        songId: null,
        invariant: 'HOUR_CONTIGUITY',
        detail: `hour jumped ${prev} → ${cur}`,
        classification: 'SIMULATOR_DEFECT',
      });
    }
    if (run.snapshots[i].nextHour !== (cur + 1) as never) {
      failures.push({
        hour: cur,
        songId: null,
        invariant: 'ROLLOVER_ADVANCE',
        detail: `nextHour ${run.snapshots[i].nextHour} != ${cur + 1}`,
        classification: 'SIMULATOR_DEFECT',
      });
    }
    checks += 2;
  }

  // A run with no hours must not claim progress.
  if (run.snapshots.length !== run.metrics.hoursSimulated) {
    failures.push({
      hour: -1,
      songId: null,
      invariant: 'HOUR_COUNT',
      detail: `${run.snapshots.length} snapshots vs ${run.metrics.hoursSimulated} hours simulated`,
      classification: 'SIMULATOR_DEFECT',
    });
  }
  checks++;

  return { checks, failures };
}

/** Run every invariant over a whole run. */
export function checkRun(run: SimulationRun): InvariantReport {
  let checks = 0;
  const failures: InvariantFailure[] = [];

  for (const s of run.snapshots) {
    const result = checkHour(s.hour as number, s);
    checks += result.checks;
    failures.push(...result.failures);
  }

  const across = checkAcrossHours(run);
  checks += across.checks;
  failures.push(...across.failures);

  return { checks, failures };
}