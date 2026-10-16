'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { loadCanonicalSecureVoteEvent } from '@/lib/supabase/secure-vote-source';
import { validateVoteEventIngestionRequest } from '@/lib/bora-engine/vote-event-ingestion';

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
 * ingestAcceptedVoteEvent — STEP 2 frontend → server → Engine handoff.
 *
 * The browser supplies ONLY the canonical event ID returned by
 * `public.cast_vote_secure`. Every vote detail is re-read server-side from
 * the committed `public.vote_events` row
 * (`loadCanonicalSecureVoteEvent`, service role, read-only), and ownership
 * is enforced by comparing the row's `voter_ref` against the caller's
 * verified `auth.uid()` — client-supplied vote data is never trusted.
 *
 * DURABILITY BOUNDARY (verified in this repository):
 * `bora_engine_ingest_vote_event` is a proposed Step 3 interface that does
 * NOT exist in any migration — it appears only in design docs
 * (`docs/bora-engine-corrected-transaction-design.md`,
 * `docs/bora-engine-durable-ingestion-design.md`). While it is absent,
 * PostgREST returns a missing-function error and this action resolves
 * `{ ok: false, reason: 'engine-ingestion-failed' }`, which ChartWrapper
 * logs as BORA_ENGINE_DELIVERY_PENDING. The committed vote stays accepted
 * either way. Durable Engine ingestion must NOT be reported as working
 * until the RPC actually ships.
 *
 * Engine validation is REUSED, not duplicated:
 * `validateVoteEventIngestionRequest` performs the canonical-row contract
 * check before anything crosses the RPC boundary.
 * `assessVoteEventIngestionRetry` (needs the persisted claim row) and
 * `mapAcceptedVoteEventToEngineInput` (needs authoritative hour phase +
 * bucket state) both depend on Step 3 ledger state and are intentionally
 * not invoked here.
 */
export async function ingestAcceptedVoteEvent(eventId: string) {
  if (typeof eventId !== 'string' || !UUID_PATTERN.test(eventId)) {
    return { ok: false, reason: 'invalid-event-id' as const };
  }

  try {
    const userClient = await createClient();
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return { ok: false, reason: 'auth-required' as const };
    }

    const event = await loadCanonicalSecureVoteEvent(eventId);

    if (!event) {
      return { ok: false, reason: 'source-event-not-found' as const };
    }

    if (event.voterRef !== user.id) {
      return { ok: false, reason: 'event-owner-mismatch' as const };
    }

    // Reuse the Engine's ingestion validation instead of duplicating it:
    // the committed row must satisfy the same contract the Step 3 ingest
    // RPC will enforce. Invalid rows stop at this isolated boundary and
    // never reach the RPC call.
    const validation = validateVoteEventIngestionRequest(event);
    if (validation.status !== 'valid') {
      console.error(
        'BORA_ENGINE_DELIVERY_PENDING',
        eventId,
        'invalid-ingestion-request',
        validation.reasons.join(','),
      );
      return { ok: false, reason: 'engine-rejected-event' as const };
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.BORA_ENGINE_SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return { ok: false, reason: 'engine-not-configured' as const };
    }

    const { createClient: createSupabaseClient } =
      await import('@supabase/supabase-js');

    const engineDb = createSupabaseClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });

    const { data, error } = await engineDb.rpc(
      'bora_engine_ingest_vote_event',
      { p_event: event },
    );

    if (error || !data || typeof data !== 'object') {
      return { ok: false, reason: 'engine-ingestion-failed' as const };
    }

    const result = data as { status?: string };

    if (
      result.status === 'ingested' ||
      result.status === 'already-ingested'
    ) {
      return { ok: true, status: result.status };
    }

    return { ok: false, reason: 'engine-rejected-event' as const };
  } catch {
    return { ok: false, reason: 'receiver-failed' as const };
  }
}