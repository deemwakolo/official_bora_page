import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type {
  CanonicalAcceptedVoteEvent,
  VoteIdentityMethod,
  VoteType,
} from './vote-event';

/**
 * STEP 2 — canonical secure-vote source reader (server-only).
 *
 * Loads the COMMITTED `public.vote_events` record written by
 * `public.cast_vote_secure` (migrations 0010 / 0011; no columns were added
 * by 0011). The browser supplies only the event ID — every vote detail
 * (song, direction, committed timestamp, identity provenance, idempotency
 * key) is read from this authoritative row using the Engine's service-role
 * key, so client-supplied vote data is never trusted.
 *
 * This module is READ-ONLY by design: it never writes votes, never updates
 * counters, and therefore never becomes a second vote authority. The
 * service-role key stays server-side (`import 'server-only'`) and must
 * never reach client code.
 *
 * Failure contract:
 *  - missing configuration  -> throws `BORA_ENGINE_PERSISTENCE_NOT_CONFIGURED`
 *  - query failure          -> throws `SECURE_VOTE_SOURCE_READ_FAILED`
 *  - unknown event ID       -> returns `null` (not an error)
 */

/** Verified against migration 0010: public.vote_events column set. */
export const SECURE_VOTE_SOURCE_COLUMNS =
  'id, song_id, vote_type, voter_ref, identity_method, identity_version, idempotency_key, created_at';

/** One `public.vote_events` row as serialized by PostgREST. */
export interface SecureVoteSourceRow {
  readonly id: string;
  readonly song_id: string;
  readonly vote_type: VoteType;
  readonly voter_ref: string;
  readonly identity_method: VoteIdentityMethod;
  readonly identity_version: number;
  readonly idempotency_key: string;
  readonly created_at: string;
}

/**
 * Map one committed source row to the canonical ingestion event. Shared by
 * the single-event loader and the durable-reconciliation scanner so both
 * paths deliver an identical, unmodified payload (the original committed
 * timestamp and provenance are never regenerated).
 */
export function toCanonicalSecureVoteEvent(
  row: SecureVoteSourceRow,
): CanonicalAcceptedVoteEvent {
  return {
    sourceSystem: 'secure_vote_events',
    sourceEventId: row.id,
    songId: row.song_id,
    voteType: row.vote_type,
    occurredAt: row.created_at,
    voterRef: row.voter_ref,
    identityMethod: row.identity_method,
    identityVersion: row.identity_version,
    idempotencyKey: row.idempotency_key,
  };
}

export async function loadCanonicalSecureVoteEvent(
  eventId: string,
): Promise<CanonicalAcceptedVoteEvent | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('BORA_ENGINE_PERSISTENCE_NOT_CONFIGURED');
  }

  const db = createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await db
    .from('vote_events')
    .select(SECURE_VOTE_SOURCE_COLUMNS)
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw new Error('SECURE_VOTE_SOURCE_READ_FAILED');
  }

  if (!data) return null;

  return toCanonicalSecureVoteEvent(data as unknown as SecureVoteSourceRow);
}