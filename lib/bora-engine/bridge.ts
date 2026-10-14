/**
 * BORA Engine <-> Backend bridge — explicit readiness and guarded persistence.
 *
 * The evaluator is injected so the production module graph does not import
 * Engine runtime code. It is invoked only when the adapter has a complete,
 * validated Engine input.
 */
import type {
  EngineInput,
  ChartEvaluationResult,
  EvaluatedSong,
} from '../../engine/src/engine/evaluation/chart';
import type { HourIndex, EngineError } from '../../engine/src/engine/types';
import { getRegistry } from '../admin-actions';
import {
  buildEngineInputFromBackendRows,
  toReferenceHour,
  type BuildEngineInputOptions,
  type BuiltInputLike,
  type EngineDataGap,
  type SkippedBackendRow,
} from './adapter';

export type EngineEvaluator = (input: EngineInput) => (
  | { readonly ok: true; readonly value: ChartEvaluationResult }
  | { readonly ok: false; readonly error: EngineError }
);

export type BackendChartEvaluationResult =
  | {
      readonly status: 'not-ready';
      readonly gaps: EngineDataGap[];
      readonly skipped: SkippedBackendRow[];
    }
  | {
      readonly status: 'evaluation-failed';
      readonly error: EngineError;
      readonly gaps: EngineDataGap[];
      readonly skipped: SkippedBackendRow[];
    }
  | {
      readonly status: 'ready';
      readonly value: ChartEvaluationResult;
      readonly gaps: EngineDataGap[];
      readonly skipped: SkippedBackendRow[];
      readonly referenceHour: HourIndex;
    };

/**
 * Narrow the adapter's structural input to the branded Engine contract.
 * Adapter readiness validation has checked every field and nested record.
 */
export function toEngineInput(built: BuiltInputLike): EngineInput {
  return {
    songs: built.songs.map((song) => ({
      songId: song.songId,
      lifecycle: song.lifecycle,
      k: song.k,
      persistentKura: song.persistentKura,
      buckets: song.buckets.map((bucket) => ({
        ...bucket,
        hourIndex: bucket.hourIndex as HourIndex,
      })),
      seedHours: song.seedHours.map((record) => ({
        ...record,
        hourIndex: record.hourIndex as HourIndex,
      })),
      platform: {
        youtube: song.platform.youtube.map((record) => ({
          ...record,
          hourIndex: record.hourIndex as HourIndex,
        })),
        spotify: song.platform.spotify.map((record) => ({
          ...record,
          hourIndex: record.hourIndex as HourIndex,
        })),
        boomplay: song.platform.boomplay.map((record) => ({
          ...record,
          hourIndex: record.hourIndex as HourIndex,
        })),
      },
    })),
    referenceHour: built.referenceHour as HourIndex,
    closedHourC: built.closedHourC,
  };
}

export interface LoadBackendSongsResult {
  readonly rows: unknown[] | null;
  readonly fromExistingIntegration: true;
}

export async function loadBackendSongs(): Promise<LoadBackendSongsResult> {
  const rows: unknown = await getRegistry();
  return {
    rows: Array.isArray(rows) ? rows : null,
    fromExistingIntegration: true,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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

  for (let index = 0; index < ranked.length; index++) {
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

function failedEvaluation(
  message: string,
  gaps: EngineDataGap[],
  skipped: SkippedBackendRow[],
  context?: Record<string, string>,
): BackendChartEvaluationResult {
  return {
    status: 'evaluation-failed',
    error: {
      code: 'INVALID_MEASUREMENT',
      message,
      context,
    },
    gaps,
    skipped,
  };
}

export async function loadAndEvaluateBackendChart(
  evaluator: EngineEvaluator,
  args: {
    readonly nowMs?: number;
    readonly referenceHour?: number;
    readonly closedHourC?: number | null;
  } = {},
): Promise<BackendChartEvaluationResult> {
  let rows: unknown[] | null;
  try {
    ({ rows } = await loadBackendSongs());
  } catch (error) {
    return {
      status: 'not-ready',
      gaps: [{
        field: 'songs',
        availability: 'unavailable',
        reason:
          'Registry rows could not be loaded: ' +
          (error instanceof Error ? error.message : String(error)),
        blocking: true,
      }],
      skipped: [],
    };
  }
  if (rows === null) {
    return {
      status: 'not-ready',
      gaps: [{
        field: 'songs',
        availability: 'unavailable',
        reason: 'Registry response is not an array of song rows.',
        blocking: true,
      }],
      skipped: [],
    };
  }
  if (rows.length === 0) {
    return {
      status: 'not-ready',
      gaps: [{
        field: 'songs',
        availability: 'unavailable',
        reason:
          'The registry returned no song rows; an empty result cannot be ' +
          'distinguished from the existing registry fetch-failure fallback.',
        blocking: true,
      }],
      skipped: [],
    };
  }

  let referenceHour = args.referenceHour;
  if (referenceHour === undefined && args.nowMs !== undefined) {
    try {
      referenceHour = toReferenceHour(args.nowMs);
    } catch {
      referenceHour = Number.NaN;
    }
  }

  const options: BuildEngineInputOptions = {};
  if (Object.prototype.hasOwnProperty.call(args, 'closedHourC')) {
    Object.assign(options, { closedHourC: args.closedHourC });
  }

  const built = buildEngineInputFromBackendRows(
    rows,
    referenceHour,
    options,
  );
  if (built.status === 'not-ready') {
    return {
      status: 'not-ready',
      gaps: built.gaps,
      skipped: built.skipped,
    };
  }

  const input = toEngineInput(built.value);
  let output: ReturnType<EngineEvaluator>;
  try {
    output = evaluator(input);
  } catch (error) {
    return failedEvaluation(
      'Engine evaluator threw instead of returning a result.',
      built.gaps,
      built.skipped,
      { thrown: error instanceof Error ? error.message : String(error) },
    );
  }

  if (!output || typeof output !== 'object') {
    return failedEvaluation(
      'Engine evaluator returned an unusable result.',
      built.gaps,
      built.skipped,
    );
  }
  if (output.ok !== true) {
    const error = output.error;
    if (
      !isRecord(error) ||
      typeof error.code !== 'string' ||
      typeof error.message !== 'string'
    ) {
      return failedEvaluation(
        'Engine evaluator rejected the input with an unusable error.',
        built.gaps,
        built.skipped,
      );
    }
    return {
      status: 'evaluation-failed',
      error: error as EngineError,
      gaps: built.gaps,
      skipped: built.skipped,
    };
  }
  if (!isUsableEvaluation(output.value, built.value.referenceHour)) {
    return failedEvaluation(
      'Engine evaluator returned an incomplete or inconsistent chart result.',
      built.gaps,
      built.skipped,
    );
  }

  return {
    status: 'ready',
    value: output.value,
    gaps: built.gaps,
    skipped: built.skipped,
    referenceHour: input.referenceHour,
  };
}

export interface PersistReq {
  readonly result: ChartEvaluationResult;
  readonly idempotencyKey: string;
}
export type PersistRes =
  | {
      readonly ok: false;
      readonly persisted: false;
      readonly blocked: true;
      readonly reason: string;
      readonly duplicate: boolean;
    };

const seen = new Set<string>();
export function __clearPersistedKeysForTests(): void {
  seen.clear();
}
export function buildPersistenceIdempotencyKey(
  input: Pick<EngineInput, 'songs' | 'referenceHour' | 'closedHourC'>,
): string {
  const ids = [...input.songs.map((song) => song.songId)].sort().join(',');
  return (
    'bora-engine-eval|ref:' +
    String(input.referenceHour) +
    '|closed:' +
    (input.closedHourC === null ? 'none' : String(input.closedHourC)) +
    '|songs:' +
    ids
  );
}
export function markPersistenceKeyProcessed(key: string): boolean {
  if (seen.has(key)) return true;
  seen.add(key);
  return false;
}
export function persistEngineEvaluation(req: PersistReq): PersistRes {
  const duplicate = markPersistenceKeyProcessed(req.idempotencyKey);
  if (duplicate) {
    return {
      ok: false,
      persisted: false,
      blocked: true,
      reason:
        `Duplicate persistence key "${req.idempotencyKey}". Refused; ` +
        'repeats must never duplicate hourly processing.',
      duplicate: true,
    };
  }
  return {
    ok: false,
    persisted: false,
    blocked: true,
    reason:
      'Blocked: Engine result persistence is not implemented. No Supabase write performed.',
    duplicate: false,
  };
}
