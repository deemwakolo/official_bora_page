export type VoteType = 'up' | 'down';
export type VoteIdentityMethod = 'guest' | 'account';

/**
 * An accepted event backed by a committed public.vote_events row.
 * (sourceSystem, sourceEventId) is the stable ingestion identity.
 */
export interface CanonicalAcceptedVoteEvent {
  readonly sourceSystem: 'secure_vote_events';
  readonly sourceEventId: string;
  readonly songId: string;
  readonly voteType: VoteType;
  readonly occurredAt: string;
  readonly voterRef: string;
  readonly identityMethod: VoteIdentityMethod;
  readonly identityVersion: number;
  readonly idempotencyKey: string;
}
