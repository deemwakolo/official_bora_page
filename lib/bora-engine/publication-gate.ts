import type {
  ChartEvaluationResult,
  EvaluatedSong,
} from '../../engine/src/engine/evaluation/chart';
import { PLATFORM_WINDOW_HOURS } from '../../engine/src/engine/constants';
import type { EngineError } from '../../engine/src/engine/types';
import {
  assessChartEvaluationEligibility,
  type ChartEvaluationEligibility,
  type EngineStateEligibility,
  type EvaluationEligibilityRequirement,
  type PlatformHourCoverage,
  type PlatformSourceAssessment,
  type RequiredHourlyCoverageAuthority,
  type RequiredHourlyInputCoverage,
  type RequiredPlatformCoverageAuthority,
} from './source-readiness';
import type {
  BuildEngineInputResult,
  EngineDataGap,
  EngineSongLike,
} from './adapter';

export type PublicationGateReason =
  | {
      readonly code: 'invalid-gate-input';
    }
  | {
      readonly code: 'engine-input-not-ready';
      readonly gaps: readonly EngineDataGap[];
    }
  | {
      readonly code: 'engine-input-population-invalid';
    }
  | {
      readonly code: 'source-eligibility-not-ready';
      readonly requirements: readonly EvaluationEligibilityRequirement[];
    }
  | {
      readonly code: 'platform-observation-missing';
      readonly songId: string;
      readonly platform: PlatformHourCoverage['platform'];
      readonly hourIndex: number;
    }
  | {
      readonly code:
        | 'platform-observation-invalid'
        | 'platform-observation-conflict'
        | 'platform-observation-coverage-mismatch';
      readonly songId: string;
      readonly platform: PlatformHourCoverage['platform'];
      readonly hourIndex: number;
    }
  | {
      readonly code: 'evaluation-threw';
      readonly message?: string;
    }
  | {
      readonly code: 'evaluation-rejected';
      readonly errorCode?: string;
    }
  | {
      readonly code:
        | 'invalid-evaluation-result'
        | 'evaluation-population-mismatch';
    };

export type PublicationGateResult =
  | {
      readonly status: 'ready';
      readonly referenceHour: number;
      readonly eligibility: Extract<
        ChartEvaluationEligibility,
        { readonly status: 'eligible' }
      >;
      readonly evaluation: ChartEvaluationResult;
    }
  | {
      readonly status: 'not-ready' | 'failed';
      readonly reasons: readonly PublicationGateReason[];
    };

export type PublicationEvaluationOutcome =
  | { readonly status: 'returned'; readonly result: unknown }
  | { readonly status: 'threw'; readonly message?: string };

export interface PublicationGateInput {
  /** The adapter's validated input build; the gate does not build Engine input. */
  readonly input: BuildEngineInputResult;
  readonly nowMs: number;
  readonly engineState: EngineStateEligibility;
  readonly sourceAssessments: readonly PlatformSourceAssessment[];
  readonly platformCoverage: readonly PlatformHourCoverage[];
  readonly requiredCoverage: readonly RequiredHourlyInputCoverage[];
  readonly requiredCoverageAuthority?: readonly RequiredHourlyCoverageAuthority[];
  readonly platformCoverageAuthority?: readonly RequiredPlatformCoverageAuthority[];
  /** Capture the evaluator's returned value or thrown outcome explicitly. */
  readonly evaluation: PublicationEvaluationOutcome;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isEvaluatedSong(value: unknown): value is EvaluatedSong {
  if (!isRecord(value)) return false;
  const performance = value.platformPerformance;
  if (!isRecord(performance)) return false;
  return (
    typeof value.songId === 'string' &&
    value.songId.length > 0 &&
    isFiniteNonNegative(value.activeC) &&
    isFiniteNonNegative(value.xp) &&
    isFiniteNonNegative(value.kuraFresh) &&
    isFiniteNonNegative(value.persistentKuraBefore) &&
    (value.persistentKuraNext === null ||
      isFiniteNonNegative(value.persistentKuraNext)) &&
    isFiniteNonNegative(performance.youtube) &&
    isFiniteNonNegative(performance.spotify) &&
    isFiniteNonNegative(performance.boomplay) &&
    isFiniteNonNegative(value.boraScore) &&
    (value.rank === null ||
      (typeof value.rank === 'number' &&
        Number.isInteger(value.rank) &&
        value.rank > 0))
  );
}

function isUsableEvaluation(
  value: unknown,
  referenceHour: number,
): value is ChartEvaluationResult {
  if (!isRecord(value) || value.referenceHour !== referenceHour) return false;
  if (
    !isFiniteNonNegative(value.totalActiveC) ||
    !Array.isArray(value.ranked) ||
    !Array.isArray(value.active) ||
    !Array.isArray(value.excludedVaulted) ||
    !isRecord(value.platformTotals)
  ) {
    return false;
  }

  const totals = value.platformTotals;
  if (
    !isFiniteNonNegative(totals.youtube) ||
    !isFiniteNonNegative(totals.spotify) ||
    !isFiniteNonNegative(totals.boomplay)
  ) {
    return false;
  }

  const active = value.active;
  const ranked = value.ranked;
  if (!active.every(isEvaluatedSong) || !ranked.every(isEvaluatedSong)) {
    return false;
  }
  if (
    !value.excludedVaulted.every(
      (songId) => typeof songId === 'string' && songId.length > 0,
    )
  ) {
    return false;
  }

  const activeIds = new Set(active.map((song) => song.songId));
  const rankedIds = new Set<string>();
  if (
    activeIds.size !== active.length ||
    ranked.length !== active.length ||
    active.some((song) => song.rank !== null)
  ) {
    return false;
  }

  for (let index = 0; index < ranked.length; index += 1) {
    const song = ranked[index];
    if (
      !activeIds.has(song.songId) ||
      rankedIds.has(song.songId) ||
      song.rank !== index + 1
    ) {
      return false;
    }
    rankedIds.add(song.songId);
  }

  return (
    rankedIds.size === activeIds.size &&
    new Set(value.excludedVaulted).size === value.excludedVaulted.length &&
    value.excludedVaulted.every((songId) => !activeIds.has(songId))
  );
}

function hasExpectedPopulation(
  value: ChartEvaluationResult,
  activeSongIds: readonly string[],
  vaultedSongIds: readonly string[],
): boolean {
  const activeIds = new Set(value.active.map((song) => song.songId));
  const vaultedIds = new Set(value.excludedVaulted);
  return (
    activeIds.size === activeSongIds.length &&
    activeSongIds.every((songId) => activeIds.has(songId)) &&
    vaultedIds.size === vaultedSongIds.length &&
    vaultedSongIds.every((songId) => vaultedIds.has(songId))
  );
}

function populationIsValid(
  activeSongIds: readonly string[],
  vaultedSongIds: readonly string[],
): boolean {
  const allIds = [...activeSongIds, ...vaultedSongIds];
  return (
    allIds.every(
      (songId) =>
        typeof songId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          songId,
        ),
    ) &&
    new Set(activeSongIds).size === activeSongIds.length &&
    new Set(vaultedSongIds).size === vaultedSongIds.length &&
    !activeSongIds.some((songId) => vaultedSongIds.includes(songId))
  );
}

function isEngineError(value: unknown): value is EngineError {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  );
}

/**
 * Pure publication eligibility boundary. It validates evidence and evaluation
 * output only; it neither evaluates, persists, nor publishes a chart.
 */
export function assessPublicationGate(
  input: PublicationGateInput,
): PublicationGateResult {
  if (
    !input ||
    typeof input !== 'object' ||
    !input.input ||
    typeof input.input !== 'object' ||
    !Array.isArray(input.sourceAssessments) ||
    !Array.isArray(input.platformCoverage) ||
    !Array.isArray(input.requiredCoverage) ||
    !input.engineState ||
    typeof input.engineState !== 'object' ||
    !input.evaluation ||
    typeof input.evaluation !== 'object'
  ) {
    return { status: 'not-ready', reasons: [{ code: 'invalid-gate-input' }] };
  }

  if (input.input.status === 'not-ready') {
    if (!Array.isArray(input.input.gaps)) {
      return { status: 'not-ready', reasons: [{ code: 'invalid-gate-input' }] };
    }
    return {
      status: 'not-ready',
      reasons: [{
        code: 'engine-input-not-ready',
        gaps: input.input.gaps,
      }],
    };
  }
  if (input.input.status !== 'ready') {
    return { status: 'not-ready', reasons: [{ code: 'invalid-gate-input' }] };
  }

  if (
    !isRecord(input.input.value) ||
    !Array.isArray(input.input.value.songs)
  ) {
    return { status: 'not-ready', reasons: [{ code: 'invalid-gate-input' }] };
  }
  const referenceHour = input.input.value.referenceHour;
  const activeSongIds: string[] = [];
  const vaultedSongIds: string[] = [];
  for (const song of input.input.value.songs) {
    if (!song || typeof song !== 'object' || typeof song.songId !== 'string') {
      return {
        status: 'not-ready',
        reasons: [{ code: 'engine-input-population-invalid' }],
      };
    }
    if (song.lifecycle === 'ACTIVE') activeSongIds.push(song.songId);
    else if (song.lifecycle === 'VAULT') vaultedSongIds.push(song.songId);
    else {
      return {
        status: 'not-ready',
        reasons: [{ code: 'engine-input-population-invalid' }],
      };
    }
  }
  if (
    !Number.isSafeInteger(referenceHour) ||
    referenceHour < 0 ||
    !populationIsValid(activeSongIds, vaultedSongIds)
  ) {
    return {
      status: 'not-ready',
      reasons: [{ code: 'engine-input-population-invalid' }],
    };
  }

  const eligibility = assessChartEvaluationEligibility({
    songIds: activeSongIds,
    evaluationHour: referenceHour,
    nowMs: input.nowMs,
    engineState: input.engineState,
    sourceAssessments: input.sourceAssessments,
    platformCoverage: input.platformCoverage,
    requiredCoverage: input.requiredCoverage,
    requiredCoverageAuthority: input.requiredCoverageAuthority,
    platformCoverageAuthority: input.platformCoverageAuthority,
  });
  if (eligibility.status !== 'eligible') {
    return {
      status: 'not-ready',
      reasons: [{
        code: 'source-eligibility-not-ready',
        requirements: eligibility.requirements,
      }],
    };
  }

  const observationRequirements = validateObservedCoverage(
    input.input.value.songs,
    activeSongIds,
    input.platformCoverage,
    referenceHour,
  );
  if (observationRequirements.length > 0) {
    return { status: 'not-ready', reasons: observationRequirements };
  }

  if (input.evaluation.status === 'threw') {
    return {
      status: 'failed',
      reasons: [{
        code: 'evaluation-threw',
        ...(input.evaluation.message
          ? { message: input.evaluation.message }
          : {}),
      }],
    };
  }

  function validateObservedCoverage(
    songs: readonly EngineSongLike[],
    activeSongIds: readonly string[],
    coverage: readonly PlatformHourCoverage[],
    referenceHour: number,
  ): PublicationGateReason[] {
    const firstHour = referenceHour - (PLATFORM_WINDOW_HOURS - 1);
    const activeSongs = new Map(
      songs
        .filter((song) => song.lifecycle === 'ACTIVE')
        .map((song) => [song.songId, song] as const),
    );
    const coverageBySlot = new Map<string, PlatformHourCoverage>();
    for (const item of coverage) {
      if (
        item &&
        typeof item === 'object' &&
        activeSongs.has(item.songId) &&
        item.hourIndex >= firstHour &&
        item.hourIndex <= referenceHour
      ) {
        coverageBySlot.set(
          `${item.songId}:${item.platform}:${item.hourIndex}`,
          item,
        );
      }
    }

    const observationsBySlot = new Map<
      string,
      { readonly value: number; readonly lifecycle: 'ACTIVE' | 'ARCHIVED' }
    >();
    const reasons: PublicationGateReason[] = [];
    const platforms = ['youtube', 'spotify', 'boomplay'] as const;

    for (const songId of activeSongIds) {
      const song = activeSongs.get(songId);
      if (!song) continue;
      for (const platform of platforms) {
        const platformObservations = song.platform?.[platform];
        if (!Array.isArray(platformObservations)) {
          reasons.push({
            code: 'platform-observation-invalid',
            songId,
            platform,
            hourIndex: referenceHour,
          });
          continue;
        }
        for (const observation of platformObservations) {
          if (
            !observation ||
            !Number.isSafeInteger(observation.hourIndex) ||
            typeof observation.value !== 'number' ||
            !Number.isFinite(observation.value) ||
            observation.value < 0 ||
            observation.platform !== platform ||
            (observation.source !== 'IN_CHART' &&
              observation.source !== 'EXTERNAL') ||
            (observation.lifecycle !== 'ACTIVE' &&
              observation.lifecycle !== 'ARCHIVED') ||
            !Number.isSafeInteger(observation.version) ||
            observation.version < 0
          ) {
            reasons.push({
              code: 'platform-observation-invalid',
              songId,
              platform,
              hourIndex: observation?.hourIndex ?? referenceHour,
            });
            continue;
          }
          if (
            observation.hourIndex < firstHour ||
            observation.hourIndex > referenceHour
          ) {
            continue;
          }

          const key = `${songId}:${platform}:${observation.hourIndex}`;
          if (observationsBySlot.has(key)) {
            reasons.push({
              code: 'platform-observation-conflict',
              songId,
              platform,
              hourIndex: observation.hourIndex,
            });
            continue;
          }
          observationsBySlot.set(key, {
            value: observation.value,
            lifecycle: observation.lifecycle,
          });
        }
      }
    }

    if (reasons.length > 0) return reasons;

    for (const songId of activeSongIds) {
      for (const platform of platforms) {
        for (let hourIndex = firstHour; hourIndex <= referenceHour; hourIndex += 1) {
          const key = `${songId}:${platform}:${hourIndex}`;
          const slotCoverage = coverageBySlot.get(key);
          const observation = observationsBySlot.get(key);
          if (!slotCoverage) {
            reasons.push({
              code: 'platform-observation-coverage-mismatch',
              songId,
              platform,
              hourIndex,
            });
            continue;
          }
          if (slotCoverage.status !== 'complete') {
            reasons.push({
              code: 'platform-observation-coverage-mismatch',
              songId,
              platform,
              hourIndex,
            });
            continue;
          }

          if (slotCoverage.result === 'no-observation') {
            if (observation) {
              reasons.push({
                code: 'platform-observation-coverage-mismatch',
                songId,
                platform,
                hourIndex,
              });
            } else {
              reasons.push({
                code: 'platform-observation-missing',
                songId,
                platform,
                hourIndex,
              });
            }
            continue;
          }

          if (
            !observation ||
            observation.lifecycle !== 'ACTIVE' ||
            observation.value !== slotCoverage.value
          ) {
            reasons.push({
              code: 'platform-observation-coverage-mismatch',
              songId,
              platform,
              hourIndex,
            });
          }
        }
      }
    }
    return reasons;
  }
  if (input.evaluation.status !== 'returned') {
    return { status: 'failed', reasons: [{ code: 'invalid-evaluation-result' }] };
  }

  const result = input.evaluation.result;
  if (!isRecord(result)) {
    return { status: 'failed', reasons: [{ code: 'invalid-evaluation-result' }] };
  }
  if (result.ok === false) {
    return {
      status: 'failed',
      reasons: [{
        code: 'evaluation-rejected',
        ...(isEngineError(result.error) ? { errorCode: result.error.code } : {}),
      }],
    };
  }
  if (result.ok !== true || !isUsableEvaluation(result.value, referenceHour)) {
    return { status: 'failed', reasons: [{ code: 'invalid-evaluation-result' }] };
  }
  if (!hasExpectedPopulation(result.value, activeSongIds, vaultedSongIds)) {
    return {
      status: 'failed',
      reasons: [{ code: 'evaluation-population-mismatch' }],
    };
  }

  return {
    status: 'ready',
    referenceHour,
    eligibility,
    evaluation: result.value,
  };
}
