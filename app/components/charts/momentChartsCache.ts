'use client';

import { useSyncExternalStore } from 'react';

import { getLatestMomentCharts } from '@/lib/moment-charts-actions';
import type { MomentChartData } from './MomentChart';

// ============================================================
// MOMENT CHARTS — CLIENT PRELOAD + CACHE (PUBLIC CHARTS ONLY)
//
// One small store shared by the PublicShell (preloads on entry)
// and MomentGUI (renders the chart). Weekly + monthly travel
// together so a partial chart is never shown on its own.
//
// Contract:
//   • Dedupes concurrent callers (a single in-flight request).
//   • Keeps data across section navigation (module-level state).
//   • sessionStorage cache with a 60s freshness window.
//   • Stale/missing data refreshes in the background; the last
//     good data is always kept if a refresh fails.
//   • Never throws on storage or JSON problems.
//   • No credentials or user-specific data — public chart only.
// ============================================================

export type MomentChartsStatus = 'loading' | 'ready' | 'error';

export interface MomentChartsSnapshot {
  weekly: MomentChartData | null;
  monthly: MomentChartData | null;
  status: MomentChartsStatus;
}

const CACHE_KEY = 'bora.moment-charts.v1';
const FRESH_MS = 60_000; // 60 seconds

const EMPTY_SNAPSHOT: MomentChartsSnapshot = {
  weekly: null,
  monthly: null,
  status: 'loading',
};

let snapshot: MomentChartsSnapshot = EMPTY_SNAPSHOT;
let loadedAt = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

// Server + hydration render the loading state; the client switches to
// getSnapshot right after hydration so cached data shows immediately.
function getServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

function isChartLike(value: unknown): boolean {
  if (value === null) return true;
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { title?: unknown }).title === 'string' &&
    Array.isArray((value as { songs?: unknown }).songs)
  );
}

interface CachedPayload {
  v: number;
  fetchedAt: number;
  weekly: MomentChartData | null;
  monthly: MomentChartData | null;
}

function isValidPayload(value: unknown): value is CachedPayload {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    p.v === 1 &&
    typeof p.fetchedAt === 'number' &&
    Number.isFinite(p.fetchedAt) &&
    isChartLike(p.weekly) &&
    isChartLike(p.monthly)
  );
}

function readCache(): CachedPayload | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(data: {
  weekly: MomentChartData | null;
  monthly: MomentChartData | null;
}) {
  try {
    if (typeof window === 'undefined') return;
    const payload: CachedPayload = {
      v: 1,
      fetchedAt: loadedAt,
      weekly: data.weekly,
      monthly: data.monthly,
    };
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage unavailable or quota exceeded — ignore, never break the page.
  }
}

// Hydrate from a valid cached value on first client load (shown even if
// stale; preload() decides whether to refresh). Client-only.
(function init() {
  const cached = readCache();
  if (cached) {
    snapshot = {
      weekly: cached.weekly,
      monthly: cached.monthly,
      status: 'ready',
    };
    loadedAt = cached.fetchedAt;
  }
})();

function runFetch(): Promise<void> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const result = await getLatestMomentCharts();
      loadedAt = Date.now();
      snapshot = {
        weekly: result.weekly,
        monthly: result.monthly,
        status: 'ready',
      };
      emit();
      writeCache(result);
    } catch (err) {
      console.error('Moment Chart Fetch Error:', err);
      // Keep the last good data; only surface an error if we never had any.
      if (snapshot.status !== 'ready') {
        snapshot = { ...snapshot, status: 'error' };
        emit();
      }
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Preload on entry / section mount. Skips while data is still fresh. */
export function preloadMomentCharts(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  const fresh =
    snapshot.status === 'ready' && Date.now() - loadedAt < FRESH_MS;
  if (fresh) return Promise.resolve();
  return runFetch();
}

/** Force a refresh regardless of freshness (e.g. the error-state retry). */
export function refreshMomentCharts(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return runFetch();
}

/** Subscribe to the shared weekly + monthly chart snapshot. */
export function useMomentCharts(): MomentChartsSnapshot {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
}
