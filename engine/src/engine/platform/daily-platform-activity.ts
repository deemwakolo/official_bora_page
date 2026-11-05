import type { Result, EngineError } from '../types';

export interface RankedPlatformActivity {
  readonly songId: string;
  readonly rank: number;
}

export interface PlatformRankActivity {
  readonly songId: string;
  readonly activity: number;
}

export interface DailyPlatformRankSnapshot {
  readonly effectiveDate: string;
  readonly ranks: readonly RankedPlatformActivity[];
}

function rankError(message: string, context: Record<string, string>) {
  return {
    ok: false as const,
    error: {
      code: 'INVALID_MEASUREMENT' as const,
      message,
      context,
    },
  };
}

function isValidCalendarDate(value: string): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }

  const leapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];

  return day <= daysInMonth;
}

/**
 * Convert a platform chart position to the positive activity used by the
 * existing per-platform normalizer. Lower positions receive greater shares.
 */
export function rankToActivity(
  input: readonly RankedPlatformActivity[],
): Result<readonly PlatformRankActivity[], EngineError> {
  if (!Array.isArray(input)) {
    return rankError('Platform ranks must be supplied as an array.', {});
  }
  const seen = new Set<string>();
  const activity: PlatformRankActivity[] = [];

  for (const entry of input) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.songId !== 'string' ||
      entry.songId.trim().length === 0 ||
      seen.has(entry.songId) ||
      !Number.isSafeInteger(entry.rank) ||
      entry.rank < 1
    ) {
      return rankError(
        'Platform ranks require unique song ids and positive integer positions.',
        {
          songId: String(
            entry && typeof entry === 'object' ? entry.songId : '',
          ),
          rank: String(
            entry && typeof entry === 'object' ? entry.rank : '',
          ),
        },
      );
    }

    seen.add(entry.songId);
    activity.push({
      songId: entry.songId,
      activity: 1 / entry.rank,
    });
  }

  return { ok: true, value: activity };
}

/**
 * Sum inverse-rank activity across the latest seven EAT calendar-day
 * snapshots. Each selected snapshot must contain exactly the active song set.
 */
export function sumLatestRankActivity(
  snapshots: readonly DailyPlatformRankSnapshot[],
  activeSongIds: readonly string[],
): Result<readonly PlatformRankActivity[], EngineError> {
  if (
    !Array.isArray(activeSongIds) ||
    !Array.isArray(snapshots) ||
    activeSongIds.length === 0 ||
    activeSongIds.some(
      (songId) => typeof songId !== 'string' || songId.trim().length === 0,
    ) ||
    new Set(activeSongIds).size !== activeSongIds.length ||
    snapshots.length === 0
  ) {
    return rankError(
      'Rank activity requires at least one snapshot and a unique active-song population.',
      { snapshotCount: String(snapshots.length) },
    );
  }

  const datedSnapshots: DailyPlatformRankSnapshot[] = [];
  const dates = new Set<string>();
  for (const snapshot of snapshots) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return rankError(
        'Rank snapshots must be valid snapshot records.',
        { effectiveDate: 'invalid' },
      );
    }
    const parsedDate =
      typeof snapshot.effectiveDate === 'string' &&
      isValidCalendarDate(snapshot.effectiveDate)
        ? snapshot.effectiveDate
        : null;
    if (
      parsedDate === null ||
      dates.has(snapshot.effectiveDate) ||
      !Array.isArray(snapshot.ranks)
    ) {
      return rankError(
        'Rank snapshots require unique valid EAT calendar dates and rank arrays.',
        { effectiveDate: String(snapshot.effectiveDate) },
      );
    }
    dates.add(snapshot.effectiveDate);
    datedSnapshots.push(snapshot);
  }

  const selected = datedSnapshots
    .sort((left, right) =>
      left.effectiveDate.localeCompare(right.effectiveDate),
    )
    .slice(-7);
  const expectedSongs = new Set(activeSongIds);
  const summed = new Map(activeSongIds.map((songId) => [songId, 0]));

  for (const snapshot of selected) {
    const converted = rankToActivity(snapshot.ranks);
    if (!converted.ok) return converted;
    const snapshotSongs = new Set(snapshot.ranks.map((entry) => entry.songId));
    const snapshotRanks = new Set(snapshot.ranks.map((entry) => entry.rank));
    if (
      snapshotSongs.size < expectedSongs.size ||
      activeSongIds.some((songId) => !snapshotSongs.has(songId)) ||
      snapshotRanks.size !== snapshot.ranks.length
    ) {
      return rankError(
        'Each daily rank snapshot must contain every active song exactly once with unique positions.',
        { effectiveDate: snapshot.effectiveDate },
      );
    }
    for (const entry of converted.value) {
      summed.set(entry.songId, (summed.get(entry.songId) ?? 0) + entry.activity);
    }
  }

  return {
    ok: true,
    value: activeSongIds.map((songId) => ({
      songId,
      activity: summed.get(songId) ?? 0,
    })),
  };
}
