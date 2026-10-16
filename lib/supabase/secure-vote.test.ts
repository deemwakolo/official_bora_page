import { describe, expect, it, vi } from 'vitest';
import { castSecureVote } from './secure-vote';

function makeClient(options: {
  session?: boolean;
  signInError?: { message: string } | null;
  rpcData?: unknown;
  rpcError?: { code?: string; message?: string } | null;
} = {}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: options.session === false ? null : { user: { id: 'test-user' } },
        },
      }),
      signInAnonymously: vi.fn().mockResolvedValue({
        data: {},
        error: options.signInError ?? null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({
      data: options.rpcData ?? {
        status: 'accepted',
        event_id: 'test-event',
        identity_method: 'guest',
      },
      error: options.rpcError ?? null,
    }),
  } as unknown as NonNullable<Parameters<typeof castSecureVote>[0]['client']>;
}

const base = {
  songId: '00000000-0000-4000-8000-000000000001',
  voteType: 'up' as const,
  idempotencyKey: '00000000-0000-4000-8000-000000000002',
};

describe('castSecureVote', () => {
  it('accepts a successful vote', async () => {
    const client = makeClient();
    const result = await castSecureVote({ ...base, client });

    expect(result).toMatchObject({ ok: true, kind: 'accepted' });
    expect(client.rpc).toHaveBeenCalledWith('cast_vote_secure', {
      p_song_id: base.songId,
      p_vote_type: 'up',
      p_idempotency_key: base.idempotencyKey,
    });
  });

  it('treats an idempotent duplicate as success', async () => {
    const client = makeClient({
      rpcData: { status: 'duplicate', event_id: 'existing-event' },
    });
    const result = await castSecureVote({ ...base, client });

    expect(result).toMatchObject({ ok: true, kind: 'duplicate' });
  });

  it('maps a rate-limit error to rate_limited', async () => {
    const client = makeClient({
      rpcError: { code: 'P0001', message: 'Rate limit reached' },
    });
    const result = await castSecureVote({ ...base, client });

    expect(result).toMatchObject({
      ok: false,
      kind: 'rejected',
      reason: 'rate_limited',
      code: 'P0001',
    });
  });

  it('rejects a missing idempotency key without calling the RPC', async () => {
    const client = makeClient();
    const result = await castSecureVote({
      ...base,
      idempotencyKey: '',
      client,
    });

    expect(result).toMatchObject({
      ok: false,
      kind: 'rejected',
      reason: 'invalid_input',
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('rejects when anonymous sign-in fails', async () => {
    const client = makeClient({
      session: false,
      signInError: { message: 'Anonymous sign-in disabled' },
    });
    const result = await castSecureVote({ ...base, client });

    expect(result).toMatchObject({
      ok: false,
      kind: 'rejected',
      reason: 'auth_required',
    });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it('rejects an unexpected RPC response', async () => {
    const client = makeClient({ rpcData: { status: 'something-new' } });
    const result = await castSecureVote({ ...base, client });

    expect(result).toMatchObject({
      ok: false,
      kind: 'rejected',
      reason: 'unexpected_shape',
    });
  });
});

  it.each([
    ['P0002', 'song_not_found'],
    ['23505', 'idempotency_conflict'],
    ['28000', 'auth_required'],
    ['22023', 'invalid_input'],
    ['XX999', 'rejected'],
  ])('maps RPC error %s to %s', async (code, reason) => {
    const client = makeClient({
      rpcError: { code, message: 'Simulated RPC error' },
    });

    const result = await castSecureVote({ ...base, client });

    expect(result).toMatchObject({
      ok: false,
      kind: 'rejected',
      reason,
      code,
      message: 'Simulated RPC error',
    });
  });
