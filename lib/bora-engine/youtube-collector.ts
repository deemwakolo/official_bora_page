import 'server-only';

import {
  preparePlatformCollectionResult,
  type PlatformCollectionResult,
} from './platform-observation';
import {
  fetchYouTubeCumulativeViews,
  type YouTubeDataApiResult,
} from './youtube-data-api';
import {
  createYouTubeCumulativeSnapshot,
  type YouTubeSongVideoMapping,
  type YouTubeSnapshotResult,
} from './youtube-snapshot';

export type YouTubeCollectionBoundaryResult =
  | { readonly status: 'invalid-request' }
  | {
      readonly status: 'missing-song-mapping';
      readonly songId: string;
      readonly hourIndex: number;
    }
  | { readonly status: 'invalid-mapping' }
  | {
      readonly status: 'collection';
      readonly result: PlatformCollectionResult;
    };

export type YouTubeCumulativeCollectionResult =
  | { readonly status: 'invalid-request' }
  | { readonly status: 'missing-song-mapping'; readonly songId: string }
  | { readonly status: 'invalid-mapping' }
  | {
      readonly status: 'provider-result';
      readonly result: YouTubeDataApiResult;
    };

export type YouTubeSnapshotCollectionResult =
  | { readonly status: 'invalid-request' }
  | { readonly status: 'missing-song-mapping'; readonly songId: string }
  | { readonly status: 'invalid-mapping' }
  | { readonly status: 'snapshot'; readonly result: YouTubeSnapshotResult };

const SONG_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const SOURCE_SYSTEM = 'youtube-data-api-v3';

/**
 * Fetch cumulative statistics only. The supplied mapping must come from a
 * trusted server-side registry source; no title search or Engine conversion is
 * performed here. The repository currently has no such server-side mapping
 * loader, so this boundary must not be fed a browser-supplied mapping.
 */
export async function collectYouTubeCumulativeViews(input: {
  readonly songId: string;
  readonly mapping: YouTubeSongVideoMapping | null;
}): Promise<YouTubeCumulativeCollectionResult> {
  if (
    !input ||
    typeof input !== 'object' ||
    typeof input.songId !== 'string' ||
    !SONG_ID_PATTERN.test(input.songId)
  ) {
    return { status: 'invalid-request' };
  }

  const mapping = input.mapping;
  if (!mapping || typeof mapping.videoId !== 'string' || !mapping.videoId.trim()) {
    return { status: 'missing-song-mapping', songId: input.songId };
  }
  const videoId = mapping.videoId.trim();
  if (
    mapping.songId !== input.songId ||
    !YOUTUBE_VIDEO_ID_PATTERN.test(videoId)
  ) {
    return { status: 'invalid-mapping' };
  }

  return {
    status: 'provider-result',
    result: await fetchYouTubeCumulativeViews(videoId),
  };
}

/**
 * Collects one cumulative snapshot from a trusted server-side mapping.
 * Reuse captureId when retrying persistence of this same logical capture;
 * allocate a different ID for each newly retrieved snapshot.
 */
export async function collectYouTubeCumulativeSnapshot(input: {
  readonly songId: string;
  readonly mapping: YouTubeSongVideoMapping | null;
  readonly captureId: string;
  readonly version?: number;
  readonly supersedesSnapshotId?: string | null;
}): Promise<YouTubeSnapshotCollectionResult> {
  if (
    !input ||
    typeof input !== 'object' ||
    typeof input.songId !== 'string' ||
    !SONG_ID_PATTERN.test(input.songId) ||
    typeof input.captureId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.captureId)
  ) {
    return { status: 'invalid-request' };
  }
  const mapping = input.mapping;
  if (!mapping || typeof mapping.videoId !== 'string' || !mapping.videoId.trim()) {
    return { status: 'missing-song-mapping', songId: input.songId };
  }
  const videoId = mapping.videoId.trim();
  if (
    mapping.songId !== input.songId ||
    !YOUTUBE_VIDEO_ID_PATTERN.test(videoId)
  ) {
    return { status: 'invalid-mapping' };
  }

  const providerResult = await fetchYouTubeCumulativeViews(videoId);
  const result = createYouTubeCumulativeSnapshot({
    mapping: { songId: input.songId, videoId },
    captureId: input.captureId,
    providerResult,
    version: input.version,
    supersedesSnapshotId: input.supersedesSnapshotId,
  });
  return { status: 'snapshot', result };
}

/**
 * Safe server-only hourly boundary. The repository has no trusted server-side
 * mapping loader, and the current Operations mapping is read by a client
 * component, so that client-side value must not be used here.
 *
 * This path represents hourly activity only. Cumulative API totals are
 * available through collectYouTubeCumulativeViews but cannot be adapted to it
 * without defensible timestamped snapshots.
 */
export function collectYouTubeObservation(input: {
  readonly songId: string;
  readonly hourIndex: number;
  readonly mapping: YouTubeSongVideoMapping | null;
}): YouTubeCollectionBoundaryResult {
  if (
    !input ||
    typeof input !== 'object' ||
    typeof input.songId !== 'string' ||
    !SONG_ID_PATTERN.test(input.songId) ||
    !Number.isSafeInteger(input.hourIndex)
  ) {
    return { status: 'invalid-request' };
  }

  const mapping = input.mapping;
  if (!mapping || typeof mapping.videoId !== 'string' || !mapping.videoId.trim()) {
    return {
      status: 'missing-song-mapping',
      songId: input.songId,
      hourIndex: input.hourIndex,
    };
  }
  if (
    mapping.songId !== input.songId ||
    !YOUTUBE_VIDEO_ID_PATTERN.test(mapping.videoId.trim())
  ) {
    return { status: 'invalid-mapping' };
  }

  const prepared = preparePlatformCollectionResult({
    songId: input.songId,
    platform: 'youtube',
    hourIndex: input.hourIndex,
    sourceSystem: SOURCE_SYSTEM,
    status: 'unavailable',
    detail:
      'YouTube Data API provides cumulative counts only; no timestamped pair is available to establish hourly activity.',
  });
  if (!prepared.ok) return { status: 'invalid-request' };

  return { status: 'collection', result: prepared.value };
}
