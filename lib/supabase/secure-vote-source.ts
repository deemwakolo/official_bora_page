import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { CanonicalAcceptedVoteEvent } from './vote-event';

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

  // Verified against migration 0010: public.vote_events(
  //   id, idempotency_key, song_id, vote_type, voter_ref,
  //   identity_method, identity_version, created_at)
  const { data, error } = await db
    .from('vote_events')
    .select(`
      id,
      song_id,
      vote_type,
      voter_ref,
      identity_method,
      identity_version,
      idempotency_key,
      created_at
    `)
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    throw new Error('SECURE_VOTE_SOURCE_READ_FAILED');
  }

  if (!data) return null;

  return {
    sourceSystem: 'secure_vote_events',
    sourceEventId: data.id,
    songId: data.song_id,
    voteType: data.vote_type,
    occurredAt: data.created_at,
    voterRef: data.voter_ref,
    identityMethod: data.identity_method,
    identityVersion: data.identity_version,
    idempotencyKey: data.idempotency_key,
  };
}