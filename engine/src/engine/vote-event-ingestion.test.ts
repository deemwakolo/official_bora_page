import { describe, expect, it } from 'vitest';
import {
  assessVoteEventIngestionRetry,
  validateVoteEventIngestionRequest,
} from '../../../lib/bora-engine/vote-event-ingestion';

const VALID_EVENT: Record<string, unknown> = {
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

function validatedEvent(
  overrides: Record<string, unknown> = {},
) {
  const result = validateVoteEventIngestionRequest({
    ...VALID_EVENT,
    ...overrides,
  });

  if (result.status !== 'valid') {
    throw new Error(
      `Expected valid event, got: ${result.reasons.join(', ')}`,
    );
  }

  return result.request;
}

const requiredFields = [
  {
    field: 'voterRef',
    reason: 'invalid-voter-reference',
  },
  {
    field: 'identityMethod',
    reason: 'incomplete-identity-provenance',
  },
  {
    field: 'identityVersion',
    reason: 'incomplete-identity-provenance',
  },
  {
    field: 'idempotencyKey',
    reason: 'invalid-idempotency-key',
  },
] as const;

describe('canonical vote-event provenance validation', () => {
  for (const { field, reason } of requiredFields) {
    it(`rejects a missing ${field}`, () => {
      const payload = { ...VALID_EVENT };
      delete payload[field];

      const result = validateVoteEventIngestionRequest(payload);

      expect(result.status).toBe('invalid-input');
      if (result.status === 'invalid-input') {
        expect(result.reasons).toContain(reason);
      }
    });

    it(`rejects null ${field}`, () => {
      const result = validateVoteEventIngestionRequest({
        ...VALID_EVENT,
        [field]: null,
      });

      expect(result.status).toBe('invalid-input');
      if (result.status === 'invalid-input') {
        expect(result.reasons).toContain(reason);
      }
    });
  }
});

describe('canonical vote-event retry assessment', () => {
  it('accepts an exact retry as already ingested', () => {
    const original = validatedEvent();

    expect(
      assessVoteEventIngestionRetry(original, original),
    ).toEqual({ status: 'already-ingested' });
  });

  it.each([
    [
      'voterRef',
      '00000000-0000-4000-8000-000000000005',
    ],
    ['identityMethod', 'account'],
    ['identityVersion', 2],
    [
      'idempotencyKey',
      '00000000-0000-4000-8000-000000000006',
    ],
  ])('rejects a retry with changed %s', (field, value) => {
    const original = validatedEvent();
    const changed = validatedEvent({ [field]: value });

    expect(
      assessVoteEventIngestionRetry(changed, original),
    ).toEqual({
      status: 'conflicting-identity',
      conflict: 'payload-mismatch',
    });
  });
});
