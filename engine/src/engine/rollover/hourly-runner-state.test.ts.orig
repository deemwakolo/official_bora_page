import { describe, expect, it, vi } from 'vitest';
import { HOUR_MS, TRANSITION_MS } from '../constants';
import { runHourlyRollover } from '../../../../lib/bora-engine/hourly-runner';
import type {
  HourlyInputCoverage,
  HourlyRolloverLoadResult,
  HourlyRolloverPersistence,
} from '../../../../lib/bora-engine/hourly-runner';
import type { EngineState, RolloverSong } from './rollover';
import type { HourIndex } from '../types';

const H = 5000 as HourIndex;

function makeSongId(label: string): string {
  const hex = Array.from(label)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
  return `00000000-0000-4000-8000-${hex.padStart(12, '0')}`;
}

function makeCoverage(
  songId: string,
  hourIndex: number,
  inputType: 'VOTES' | 'SEED' = 'VOTES',
): HourlyInputCoverage {
  const evidenceKind = inputType === 'VOTES' ? 'vote-history' : 'seed-history';
  const sourceIdentity = inputType === 'VOTES' ? 'secure_vote_events' : 'bora_engine_seed_hours';
  const evidenceId =
    inputType === 'VOTES'
      ? `secure-vote-ledger:${songId}-${hourIndex}`
      : `engine-seed-hour:${songId}-${hourIndex}`;

  return {
    songId,
    inputType,
    hourIndex,
    status: 'COMPLETE',
    evidence: {
      kind: evidenceKind,
      songId,
      period: { kind: 'hour', hourIndex },
      expectedSourceIdentity: sourceIdentity,
      sourceIdentity,
      evidenceId,
      revision: 1,
      assessedAt: '2026-11-06T06:00:00.000Z',
      outcome: 'complete',
      currentness: 'current',
      reason: null,
    },
    authority: {
      sourceIdentity,
      revision: 1,
      evidenceId,
    },
  };
}

function makeSong(songId: string, persistentKura = 0): RolloverSong {
  return {
    songId: songId.length === 36 ? songId : makeSongId(songId),
    lifecycle: 'ACTIVE',
    k: 0,
    persistentKura,
    buckets: [],
    seedHours: [],
    platform: {
      youtube: [],
      spotify: [],
      boomplay: [],
    },
  };
}

function makeState(referenceHour: number, songs: readonly RolloverSong[]): EngineState {
  return { referenceHour: referenceHour as HourIndex, songs: [...songs] };
}

describe('hourly worker coordination', () => {
  it('releases the current worker lease safely when a stale commit is rejected', async () => {
    const token = '11111111-1111-4111-8111-111111111111';
    const songId = makeSongId('song-1');
    const state = makeState(H, [makeSong(songId, 10)]);
    const coverage = [
      makeCoverage(songId, H, 'VOTES'),
      makeCoverage(songId, H, 'SEED'),
    ];
    const release = vi.fn(async () => true);
    const persistence: HourlyRolloverPersistence = {
      readHourlyReferenceHour: async () => H,
      reconcileHourlyCoverage: async () => ({
        status: 'ready',
        processedActiveSongCount: 1,
        reconciledVoteEventCount: 1,
      }),
      claimHour: async () => ({ status: 'claimed', leaseToken: token }),
      loadRolloverInput: async () => ({
        status: 'loaded',
        state,
        coverage,
        stateRevision: 7,
      }),
      releaseNotReady: async () => true,
      recordRetryableFailure: async ({ leaseToken, errorCode }) => {
        expect(leaseToken).toBe(token);
        expect(errorCode).toBe('state-head-revision-changed');
        return release();
      },
      commitHour: async () => ({
        status: 'stale-state',
        reason: 'state-head-revision-changed',
      }),
    };

    const result = await runHourlyRollover({
      closedHour: H,
      claimRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      nowMs: (H + 1) * HOUR_MS + TRANSITION_MS + 1,
      leaseDurationMs: 120_000,
      persistence,
    });

    expect(result.status).toBe('retryable-failure');
    if (result.status !== 'retryable-failure') {
      throw new Error('Expected retryable failure after stale-state commit');
    }
    expect(result.reason).toBe('state-head-changed');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('preserves the exact SQL stale-state reason instead of defaulting to state-head revision churn', async () => {
    const token = '44444444-4444-4444-8444-444444444444';
    const songId = makeSongId('song-4');
    const state = makeState(H, [makeSong(songId, 17)]);
    const coverage = [
      makeCoverage(songId, H, 'VOTES'),
      makeCoverage(songId, H, 'SEED'),
    ];
    const persistence: HourlyRolloverPersistence = {
      readHourlyReferenceHour: async () => H,
      reconcileHourlyCoverage: async () => ({
        status: 'ready',
        processedActiveSongCount: 1,
        reconciledVoteEventCount: 1,
      }),
      claimHour: async () => ({ status: 'claimed', leaseToken: token }),
      loadRolloverInput: async () => ({
        status: 'loaded',
        state,
        coverage,
        stateRevision: 5,
      }),
      releaseNotReady: async () => true,
      recordRetryableFailure: async ({ errorCode }) => {
        expect(errorCode).toBe('state-head-reference-hour-mismatch');
        return true;
      },
      commitHour: async () => ({
        status: 'stale-state',
        reason: 'state-head-reference-hour-mismatch',
      }),
    };

    const result = await runHourlyRollover({
      closedHour: H,
      claimRequestId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      nowMs: (H + 1) * HOUR_MS + TRANSITION_MS + 1,
      leaseDurationMs: 120_000,
      persistence,
    });

    expect(result.status).toBe('retryable-failure');
    if (result.status !== 'retryable-failure') {
      throw new Error('Expected retryable failure after a state-head reference mismatch');
    }
    expect(result.reason).toBe('state-head-reference-hour-mismatch');
  });

  it('allows only one worker to own the same closed hour at a time', async () => {
    const songId = makeSongId('song-1');
    const state = makeState(H, [makeSong(songId, 10)]);
    const coverage = [
      makeCoverage(songId, H, 'VOTES'),
      makeCoverage(songId, H, 'SEED'),
    ];
    let claims = 0;

    const persistence: HourlyRolloverPersistence = {
      readHourlyReferenceHour: async () => H,
      reconcileHourlyCoverage: async () => ({
        status: 'ready',
        processedActiveSongCount: 1,
        reconciledVoteEventCount: 1,
      }),
      claimHour: async () => {
        claims += 1;
        if (claims === 1) {
          return { status: 'claimed', leaseToken: '11111111-1111-4111-8111-111111111111' };
        }
        return { status: 'already-claimed' };
      },
      loadRolloverInput: async ({ leaseToken }) => {
        expect(leaseToken).toBe('11111111-1111-4111-8111-111111111111');
        return {
          status: 'loaded',
          state,
          coverage,
          stateRevision: 7,
        };
      },
      releaseNotReady: async () => true,
      recordRetryableFailure: async () => true,
      commitHour: async () => ({ status: 'completed' }),
    };

    const results = await Promise.all([
      runHourlyRollover({
        closedHour: H,
        claimRequestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        nowMs: (H + 1) * HOUR_MS + TRANSITION_MS + 1,
        leaseDurationMs: 120_000,
        persistence,
      }),
      runHourlyRollover({
        closedHour: H,
        claimRequestId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        nowMs: (H + 1) * HOUR_MS + TRANSITION_MS + 1,
        leaseDurationMs: 120_000,
        persistence,
      }),
    ]);

    expect(results.filter((result) => result.status === 'completed')).toHaveLength(1);
    expect(results.some((result) => result.status === 'already-claimed')).toBe(true);
  });

  it('keeps stale-state diagnostics distinct from generic state changes', async () => {
    const token = '22222222-2222-4222-8222-222222222222';
    const songId = makeSongId('song-2');
    const state = makeState(H, [makeSong(songId, 12)]);
    const coverage = [
      makeCoverage(songId, H, 'VOTES'),
      makeCoverage(songId, H, 'SEED'),
    ];
    const persistence: HourlyRolloverPersistence = {
      readHourlyReferenceHour: async () => H,
      reconcileHourlyCoverage: async () => ({
        status: 'ready',
        processedActiveSongCount: 1,
        reconciledVoteEventCount: 1,
      }),
      claimHour: async () => ({ status: 'claimed', leaseToken: token }),
      loadRolloverInput: async () => ({
        status: 'loaded',
        state,
        coverage,
        stateRevision: 11,
      }),
      releaseNotReady: async () => true,
      recordRetryableFailure: async ({ errorCode }) => {
        expect(errorCode).toBe('coverage-evidence-changed');
        return true;
      },
      commitHour: async () => ({
        status: 'stale-state',
        reason: 'coverage-evidence-changed',
      }),
    };

    const result = await runHourlyRollover({
      closedHour: H,
      claimRequestId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      nowMs: (H + 1) * HOUR_MS + TRANSITION_MS + 1,
      leaseDurationMs: 120_000,
      persistence,
    });

    expect(result.status).toBe('retryable-failure');
    if (result.status !== 'retryable-failure') {
      throw new Error('Expected retryable failure after stale coverage mismatch');
    }
    expect(result.reason).toBe('coverage-evidence-changed');
  });

  it('reuses an already-acquired lease instead of claiming the same hour twice', async () => {
    const token = '33333333-3333-4333-8333-333333333333';
    const songId = makeSongId('song-3');
    const state = makeState(H, [makeSong(songId, 8)]);
    const coverage = [
      makeCoverage(songId, H, 'VOTES'),
      makeCoverage(songId, H, 'SEED'),
    ];
    const claimHour = vi.fn(async () => {
      throw new Error('claimHour should not run when a lease is preassigned');
    });
    const loadRolloverInput = vi.fn(async (): Promise<HourlyRolloverLoadResult> => ({
      status: 'loaded',
      state,
      coverage,
      stateRevision: 9,
    }));

    const persistence: HourlyRolloverPersistence = {
      readHourlyReferenceHour: async () => H,
      reconcileHourlyCoverage: async () => ({
        status: 'ready',
        processedActiveSongCount: 1,
        reconciledVoteEventCount: 1,
      }),
      claimHour,
      loadRolloverInput,
      releaseNotReady: async () => true,
      recordRetryableFailure: async () => true,
      commitHour: async () => ({ status: 'completed' }),
    };

    const result = await runHourlyRollover({
      closedHour: H,
      claimRequestId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      preclaimedLeaseToken: token,
      nowMs: (H + 1) * HOUR_MS + TRANSITION_MS + 1,
      leaseDurationMs: 120_000,
      persistence,
    });

    expect(claimHour).not.toHaveBeenCalled();
    expect(loadRolloverInput).toHaveBeenCalledWith({
      closedHour: H,
      leaseToken: token,
    });
    expect(result.status).toBe('completed');
  });
});

  it('reports state-head-missing when state-head row does not exist', async () => {
    const token = '33333333-3333-4333-8333-333333333333';
    const songId = makeSongId('song-3');
    const state = makeState(H, [makeSong(songId, 8)]);
    const coverage = [
      makeCoverage(songId, H, 'VOTES'),
      makeCoverage(songId, H, 'SEED'),
    ];
    const persistence: HourlyRolloverPersistence = {
      readHourlyReferenceHour: async () => H,
      reconcileHourlyCoverage: async () => ({
        status: 'ready',
        processedActiveSongCount: 1,
        reconciledVoteEventCount: 1,
      }),
      claimHour: async () => ({ status: 'claimed', leaseToken: token }),
      loadRolloverInput: async () => ({
        status: 'loaded',
        state,
        coverage,
        stateRevision: 11,
      }),
      releaseNotReady: async () => true,
      recordRetryableFailure: async ({ errorCode }) => {
        expect(errorCode).toBe('state-head-missing');
        return true;
      },
      commitHour: async () => ({
        status: 'stale-state',
        reason: 'state-head-missing',
      }),
    };

    const result = await runHourlyRollover({
      closedHour: H,
      claimRequestId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      nowMs: (H + 1) * HOUR_MS + TRANSITION_MS + 1,
      leaseDurationMs: 120_000,
      persistence,
    });

    expect(result.status).toBe('retryable-failure');
    if (result.status !== 'retryable-failure') {
      throw new Error('Expected retryable failure after stale-state commit');
    }
    expect(result.reason).toBe('state-head-missing');
  });
