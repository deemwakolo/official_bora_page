import 'server-only';

export interface YouTubeCumulativeViewCount {
  readonly videoId: string;
  readonly provider: 'youtube-data-api-v3';
  readonly metric: 'cumulative_views';
  readonly unit: 'views_total';
  /** Exact non-negative integer returned by the provider, kept as a string. */
  readonly value: string;
  readonly retrievedAt: string;
}

export type YouTubeDataApiResult =
  | {
      readonly status: 'observed';
      readonly measurement: YouTubeCumulativeViewCount;
    }
  | { readonly status: 'missing'; readonly videoId: string }
  | {
      readonly status: 'unavailable';
      readonly reason: 'api-key-not-configured' | 'provider-unreachable';
    }
  | {
      readonly status: 'failed';
      readonly errorCode:
        | 'invalid-video-id'
        | 'provider-api-error'
        | 'malformed-response'
        | 'invalid-measurement';
    };

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const API_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseViewCount(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  return value.replace(/^0+(?=\d)/, '');
}

/**
 * Fetch a video's cumulative view total from the official YouTube Data API v3.
 * This value is deliberately not converted to hourly activity or an Engine
 * platform observation.
 */
export async function fetchYouTubeCumulativeViews(
  videoId: string,
): Promise<YouTubeDataApiResult> {
  if (typeof videoId !== 'string' || !VIDEO_ID_PATTERN.test(videoId)) {
    return { status: 'failed', errorCode: 'invalid-video-id' };
  }

  const apiKey = process.env.BORA_YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: 'unavailable',
      reason: 'api-key-not-configured',
    };
  }

  const url = new URL(API_ENDPOINT);
  url.searchParams.set('part', 'statistics');
  url.searchParams.set('id', videoId);
  url.searchParams.set('key', apiKey);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      redirect: 'error',
    });
  } catch {
    return { status: 'unavailable', reason: 'provider-unreachable' };
  }

  if (response.status >= 500 || response.status === 429) {
    return { status: 'unavailable', reason: 'provider-unreachable' };
  }
  if (!response.ok) {
    return { status: 'failed', errorCode: 'provider-api-error' };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: 'failed', errorCode: 'malformed-response' };
  }

  if (
    !isRecord(payload) ||
    !Array.isArray(payload.items) ||
    payload.items.length > 1
  ) {
    return { status: 'failed', errorCode: 'malformed-response' };
  }
  if (payload.items.length === 0) {
    return { status: 'missing', videoId };
  }

  const item = payload.items[0];
  if (!isRecord(item) || item.id !== videoId) {
    return { status: 'failed', errorCode: 'malformed-response' };
  }
  if (!isRecord(item.statistics)) {
    return { status: 'failed', errorCode: 'invalid-measurement' };
  }

  const value = parseViewCount(item.statistics.viewCount);
  if (value === null) {
    return { status: 'failed', errorCode: 'invalid-measurement' };
  }

  return {
    status: 'observed',
    measurement: {
      videoId,
      provider: 'youtube-data-api-v3',
      metric: 'cumulative_views',
      unit: 'views_total',
      value,
      retrievedAt: new Date().toISOString(),
    },
  };
}
