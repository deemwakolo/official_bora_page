'use client';

/**
 * BORA SECURITY — Hardened guest-voting helper.
 *
 * This module is the integration path for `public.cast_vote_secure`
 * (migrations 0010 / 0011). It is imported by
 * app/components/ChartWrapper.tsx and used ONLY when the
 * `NEXT_PUBLIC_BORA_SECURE_VOTING` flag is exactly 'true'. The flag is OFF by
 * default, so the live public chart still calls `handle_song_vote` until the
 * cutover is explicitly enabled.
 *
 * ACTIVATION (separate, approved step): set `NEXT_PUBLIC_BORA_SECURE_VOTING=true`
 * in the deployment environment. No code change is required to flip the path —
 * ChartWrapper already routes through `castSecureVote(...)` when the flag is on,
 * treats `result.ok === true` as success, and NEVER silently falls back to the
 * legacy RPC. Optimistic momentum, re-rank, and per-row rank sync are unchanged.
 *
 * RPC behavior, feature-flag semantics, and idempotency are unchanged. VoteType
 * is re-exported from the shared accepted-vote event contract.
 */

import { createClient } from '@/lib/supabase/client';
import type { VoteType } from '@/lib/supabase/vote-event';

type BoraClient = ReturnType<typeof createClient>;

export type { VoteType } from '@/lib/supabase/vote-event';

/**
 * Normalized outcome so the UI does not need to know RPC internals.
 *  - ok:true  => accepted  (counted now)      => UI success
 *  - ok:true  => duplicate (already counted)  => UI success, no double-count
 *  - ok:false => rejected (auth/validation/
 *                rate-limit/conflict)         => existing error path, no popup
 */
export type SecureVoteResult =
  | { ok: true; kind: 'accepted' | 'duplicate'; eventId: string | null; identityMethod: string | null }
  | { ok: false; kind: 'rejected'; reason: string; code: string | null; message: string };

/**
 * Generate a fresh idempotency key for ONE user vote action.
 *
 * A new click/vote action MUST use a new key. To retry the SAME action
 * (e.g. a flaky network), REUSE the original key — the database then returns
 * `duplicate` instead of double-counting. Uniqueness is enforced server-side by
 * UNIQUE(voter_ref, idempotency_key); security is enforced by the verified JWT
 * (auth.uid()), not by the key being secret.
 */
export function newIdempotencyKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  // RFC4122 v4-shaped fallback (uniqueness only; not security-sensitive).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Ensure the caller holds an authenticated session.
 *
 * Guests are created via Supabase anonymous sign-in, which yields a genuine
 * `authenticated` role JWT with is_anonymous=true. This is REQUIRED because
 * cast_vote_secure derives voter identity from auth.uid() (it is not anon-role
 * callable). No registration/email/phone is involved.
 */
export async function ensureGuestSession(client?: BoraClient): Promise<BoraClient> {
  const supabase = client ?? createClient();
  const { data } = await supabase.auth.getSession();
  if (data?.session) return supabase;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(`ANON_SIGNIN_FAILED: ${error.message}`);
  }
  return supabase;
}

/** Map a PostgreSQL error code from the RPC to a stable reason string. */
function classifyErrorCode(code?: string): string {
  switch (code) {
    case 'P0001':
      return 'rate_limited';
    case 'P0002':
      return 'song_not_found';
    case '23505':
      return 'idempotency_conflict';
    case '28000':
      return 'auth_required';
    case '22023':
      return 'invalid_input';
    default:
      return 'rejected';
  }
}

/**
 * Call the hardened vote RPC.
 *
 * IMPORTANT: there is NO fallback to handle_song_vote here. On any failure the
 * result is `ok:false` and the caller must surface it through its existing
 * error handling (which, in the live chart, means no success popup).
 *
 * Counter synchronization is unaffected: cast_vote_secure updates
 * upvotes/downvotes/momentum_score with the SAME semantics as the current
 * handle_song_vote, so the client's optimistic momentum + rank sync stay valid.
 */
export async function castSecureVote(params: {
  songId: string;
  voteType: VoteType;
  idempotencyKey: string;
  client?: BoraClient;
}): Promise<SecureVoteResult> {
  const { songId, voteType, idempotencyKey } = params;

  if (!idempotencyKey) {
    return {
      ok: false,
      kind: 'rejected',
      reason: 'invalid_input',
      code: 'CLIENT',
      message: 'missing idempotency key',
    };
  }

  let supabase: BoraClient;
  try {
    supabase = await ensureGuestSession(params.client);
  } catch (err) {
    return {
      ok: false,
      kind: 'rejected',
      reason: 'auth_required',
      code: 'CLIENT',
      message: err instanceof Error ? err.message : String(err),
    };
  }

  const { data, error } = await supabase.rpc('cast_vote_secure', {
    p_song_id: songId,
    p_vote_type: voteType,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const e = error as { code?: string; message?: string };
    return {
      ok: false,
      kind: 'rejected',
      reason: classifyErrorCode(e.code),
      code: e.code ?? null,
      message: e.message ?? 'rpc error',
    };
  }

  const d = data as { status?: string; event_id?: string; identity_method?: string } | null;

  if (d?.status === 'accepted') {
    return { ok: true, kind: 'accepted', eventId: d.event_id ?? null, identityMethod: d.identity_method ?? null };
  }
  if (d?.status === 'duplicate') {
    return { ok: true, kind: 'duplicate', eventId: d.event_id ?? null, identityMethod: d.identity_method ?? null };
  }

  return {
    ok: false,
    kind: 'rejected',
    reason: 'unexpected_shape',
    code: null,
    message: JSON.stringify(data ?? null),
  };
}
