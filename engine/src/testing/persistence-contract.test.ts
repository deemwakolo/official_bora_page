import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CanonicalAcceptedVoteEvent } from '../../../lib/supabase/vote-event';

vi.mock('server-only', () => ({}));

import { createBoraEnginePersistence } from '../../../lib/bora-engine/persistence';

const EVENT: CanonicalAcceptedVoteEvent = {
  sourceSystem: 'secure_vote_events',
  sourceEventId: '00000000-0000-4000-8000-000000000001',
  songId: '00000000-0000-4000-8000-000000000002',
  voteType: 'up',
  occurredAt: '2026-10-17T20:00:00.000Z',
  voterRef: '00000000-0000-4000-8000-000000000003',
  identityMethod: 'guest',
  identityVersion: 1,
  idempotencyKey: '00000000-0000-4000-8000-000000000004',
};

const readyCoverage = (overrides: Record<string, unknown> = {}) => ({
  status: 'ready',
  expected: 72,
  complete: 72,
  missing: 0,
  unavailable: 0,
  failed: 0,
  records: 72,
  ...overrides,
});

function readinessResponse(input: {
  readonly status?: 'ready' | 'not-ready';
  readonly voteHistory?: Record<string, unknown>;
  readonly seedHours?: Record<string, unknown>;
}) {
  return {
    status: input.status ?? 'ready',
    closedHour: 200,
    checks: {
      initialState: {
        status: 'ready',
        songCount: 1,
        referenceHour: 200,
      },
      voteHistory: input.voteHistory ?? readyCoverage({ duplicates: 0 }),
      seedHours: input.seedHours ?? readyCoverage({ zeroRecords: 2 }),
      youtube: readyCoverage({ expected: 168, complete: 168 }),
      spotify: readyCoverage({ expected: 168, complete: 168 }),
      boomplay: readyCoverage({ expected: 168, complete: 168 }),
    },
  };
}

function makePersistence() {
  const rpc = vi.fn<
    (
      functionName: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { code?: string; message?: string } | null }>
  >();
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const client = {
    rpc,
    from: vi.fn(() => query),
  } as unknown as SupabaseClient;

  return {
    persistence: createBoraEnginePersistence(client),
    rpc,
  };
}

describe('Supabase persistence contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends one JSONB event envelope with all canonical provenance fields', async () => {
    const { persistence, rpc } = makePersistence();
    rpc.mockResolvedValue({ data: { status: 'accepted' }, error: null });

    await expect(persistence.ingestVoteEvent(EVENT)).resolves.toMatchObject({
      status: 'ingested',
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('bora_engine_ingest_vote_event', {
      p_event: {
        sourceSystem: EVENT.sourceSystem,
        sourceEventId: EVENT.sourceEventId,
        songId: EVENT.songId,
        voteType: EVENT.voteType,
        occurredAt: EVENT.occurredAt,
        voterRef: EVENT.voterRef,
        identityMethod: EVENT.identityMethod,
        identityVersion: EVENT.identityVersion,
        idempotencyKey: EVENT.idempotencyKey,
      },
    });
    const [, args] = rpc.mock.calls[0];
    expect(Object.keys(args)).toEqual(['p_event']);
    expect(Object.keys(args.p_event as Record<string, unknown>)).toHaveLength(9);
  });

  it.each([
    ['accepted', 'ingested'],
    ['duplicate', 'already-ingested'],
  ] as const)('maps RPC status %s to %s', async (rpcStatus, expectedStatus) => {
    const { persistence, rpc } = makePersistence();
    rpc.mockResolvedValue({ data: { status: rpcStatus }, error: null });

    await expect(persistence.ingestVoteEvent(EVENT)).resolves.toMatchObject({
      status: expectedStatus,
      sourceSystem: EVENT.sourceSystem,
      sourceEventId: EVENT.sourceEventId,
    });
  });

  it('does not report conflicting identity as successful ingestion', async () => {
    const { persistence, rpc } = makePersistence();
    rpc.mockResolvedValue({
      data: null,
      error: {
        code: 'P0001',
        message: 'BORA_ENGINE_EVENT_IDENTITY_CONFLICT',
      },
    });

    await expect(persistence.ingestVoteEvent(EVENT)).resolves.toMatchObject({
      status: 'conflicting-identity',
    });
  });

  it('retains commit-unknown for an unclassified transport failure without retrying', async () => {
    const { persistence, rpc } = makePersistence();
    rpc.mockRejectedValue(new Error('connection lost'));

    await expect(persistence.ingestVoteEvent(EVENT)).resolves.toMatchObject({
      status: 'commit-unknown',
      sourceEventId: EVENT.sourceEventId,
    });
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it('retains the bounded whole-transaction retry for retryable database errors', async () => {
    const { persistence, rpc } = makePersistence();
    rpc
      .mockResolvedValueOnce({
        data: null,
        error: { code: '40001', message: 'serialization failure' },
      })
      .mockResolvedValueOnce({ data: { status: 'accepted' }, error: null });

    await expect(persistence.ingestVoteEvent(EVENT)).resolves.toMatchObject({
      status: 'ingested',
    });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('preserves ready vote and seed checks and surfaces duplicate diagnostics', async () => {
    const { persistence, rpc } = makePersistence();
    rpc.mockResolvedValue({
      data: readinessResponse({
        voteHistory: readyCoverage({ duplicates: 3 }),
      }),
      error: null,
    });

    const result = await persistence.readiness(200);
    expect(result.status).toBe('ready');
    expect(result.checks.voteHistory.status).toBe('ready');
    expect(result.checks.voteHistory.duplicates).toBe(3);
    expect(result.checks.seedHours.status).toBe('ready');
    expect(result.checks.seedHours.zeroRecords).toBe(2);
    expect(result.checks.youtube.status).toBe('ready');
    expect(result.checks.spotify.status).toBe('ready');
    expect(result.checks.boomplay.status).toBe('ready');
  });

  it('preserves incomplete vote or seed checks and the database top-level status', async () => {
    const { persistence, rpc } = makePersistence();
    rpc.mockResolvedValue({
      data: readinessResponse({
        status: 'not-ready',
        voteHistory: readyCoverage({
          status: 'incomplete',
          complete: 71,
          missing: 1,
          duplicates: 2,
        }),
        seedHours: readyCoverage({
          status: 'incomplete',
          complete: 70,
          missing: 2,
        }),
      }),
      error: null,
    });

    const result = await persistence.readiness(200);
    expect(result.status).toBe('not-ready');
    expect(result.checks.voteHistory).toMatchObject({
      status: 'incomplete',
      duplicates: 2,
    });
    expect(result.checks.seedHours).toMatchObject({
      status: 'incomplete',
      complete: 70,
    });
  });
});
