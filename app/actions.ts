'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { loadCanonicalSecureVoteEvent } from '@/lib/supabase/secure-vote-source';
import type { CanonicalAcceptedVoteEvent } from '@/lib/supabase/vote-event';
import { createBoraEnginePersistence } from '@/lib/bora-engine/persistence';
import type { VoteEventIngestionOutcome } from '@/lib/bora-engine/vote-event-ingestion';

type PulseType = 'up' | 'down';

interface PulseResult {
  success: boolean;
  error?: string;
}

/**
 * handleVoteAction
 * BORA PULSE ENGINE (Server Action Layer)
 * Handles voting events + triggers cache invalidation.
 */
export async function handleVoteAction(
  songId: string,
  type: PulseType
): Promise<PulseResult> {
  const timestamp = new Date().toISOString();

  try {
    // 🧠 STRUCTURED EVENT LOG (future analytics-ready)
    console.log(
      JSON.stringify({
        event: 'BORA_PULSE',
        songId,
        type,
        timestamp,
      })
    );

    // 🚧 PLACEHOLDER: RATE LIMIT CHECK (future upgrade)
    // Example: prevent spam voting per IP / user session
    // if (await isRateLimited(songId)) {
    //   return { success: false, error: 'Rate limit exceeded' };
    // }

    // 🗄️ DATABASE LAYER HOOK (future Supabase / Prisma / etc.)
    // Keep isolated so you don't mix logic with framework code
    // Example:
    // await db.registry.update({
    //   where: { id: songId },
    //   data: {
    //     votes: { increment: type === 'up' ? 1 : -1 }
    //   }
    // });

    // 🔄 CACHE INVALIDATION (live chart refresh)
    revalidatePath('/');

    return { success: true };
  } catch (error: unknown) {
    console.error('BORA_PULSE_ERROR:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown failure',
    };
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * ingestAcceptedVoteEvent — thin server receiver for an ACCEPTED secure
 * vote (Phase 3).
 *
 * The browser supplies ONLY the canonical event ID returned by
 * `public.cast_vote_secure`. Every vote detail is re-read server-side from
 * the committed `public.vote_events` row, and ownership is enforced by
 * comparing the row's `voter_ref` against the caller's verified
 * `auth.uid()` — client-supplied vote data is never trusted.
 *
 * ONE application-level result contract: `VoteEventIngestionOutcome`. The
 * raw RPC vocabulary (`accepted` / `duplicate`) is translated exclusively
 * inside `lib/bora-engine/vote-event-ingestion.ts`
 * (classifyVoteEventIngestionRpcResult), invoked only by the persistence
 * adapter — no status-compatibility logic lives in this action or in the
 * component.
 *
 * Boundaries honored:
 *  - No privileged client is constructed here;
 *    `createBoraEnginePersistence()` owns the service-role client and the
 *    single atomic `bora_engine_ingest_vote_event` transaction, which
 *    remains the sole authority for identity claim, exactly-once bucket
 *    counting, and coverage invalidation. No standalone bucket increment is
 *    ever issued from the application.
 *  - NO fallback to `handle_song_vote` on Engine failure; vote acceptance is
 *    unaffected by this handoff (ChartWrapper treats delivery failures as
 *    log-only).
 *  - Gate failures (auth / missing source row / ownership) happen BEFORE any
 *    RPC: a known non-commit, returned as `invalid-input` (event defects) or
 *    `persistence-failure` with an explicit infrastructure error code.
 *  - Anything after the RPC boundary whose commit cannot be established
 *    returns `commit-unknown`; it is replayed ONLY by the durable
 *    reconciliation path (`runSecureVoteReconciliation`), never by an
 *    in-action loop.
 */
export async function ingestAcceptedVoteEvent(
  eventId: string,
): Promise<VoteEventIngestionOutcome> {
  if (typeof eventId !== 'string' || !UUID_PATTERN.test(eventId)) {
    return { status: 'invalid-input', reasons: ['invalid-source-event-id'] };
  }

  let user: { readonly id: string } | null = null;
  try {
    const userClient = await createClient();
    const {
      data: { user: verifiedUser },
      error: authError,
    } = await userClient.auth.getUser();
    if (!authError) user = verifiedUser;
  } catch {
    user = null;
  }
  if (!user) {
    console.error('BORA_ENGINE_DELIVERY_BLOCKED', eventId, 'auth-required');
    return { status: 'invalid-input', reasons: ['invalid-request'] };
  }

  let event: CanonicalAcceptedVoteEvent | null = null;
  try {
    event = await loadCanonicalSecureVoteEvent(eventId);
  } catch (error) {
    const code =
      error instanceof Error &&
      error.message === 'BORA_ENGINE_PERSISTENCE_NOT_CONFIGURED'
        ? 'source-read-unconfigured'
        : 'source-read-failed';
    console.error('BORA_ENGINE_DELIVERY_PENDING', eventId, code);
    return { status: 'persistence-failure', errorCode: code };
  }
  if (!event) {
    console.error(
      'BORA_ENGINE_DELIVERY_BLOCKED',
      eventId,
      'source-event-not-found',
    );
    return { status: 'invalid-input', reasons: ['invalid-request'] };
  }
  if (event.voterRef !== user.id) {
    console.error(
      'BORA_ENGINE_DELIVERY_BLOCKED',
      eventId,
      'event-owner-mismatch',
    );
    return { status: 'invalid-input', reasons: ['invalid-voter-reference'] };
  }

  const setup = createBoraEnginePersistence();
  if (setup.status === 'configuration-unavailable') {
    console.error(
      'BORA_ENGINE_DELIVERY_PENDING',
      eventId,
      'configuration-unavailable',
    );
    return { status: 'persistence-failure', errorCode: setup.missing };
  }

  // RPC-boundary zone: an unexpected exception here leaves the commit
  // outcome unestablished, so it must never be reported as a rollback.
  try {
    return await setup.persistence.ingestVoteEvent(event);
  } catch {
    console.error(
      'BORA_ENGINE_DELIVERY_PENDING',
      eventId,
      'receiver-exception',
    );
    return {
      status: 'commit-unknown',
      sourceSystem: 'secure_vote_events',
      sourceEventId: eventId,
    };
  }
}
