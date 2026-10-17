import 'use server';

import { authorizeBoraEngineOperator } from './operator-authorization';
import {
  reconcileSecureVoteDelivery,
  type SecureVoteReconciliationReport,
} from './vote-event-reconciliation';

export type RunSecureVoteReconciliationResult =
  | { readonly status: 'authorized'; readonly report: SecureVoteReconciliationReport }
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'forbidden' }
  | { readonly status: 'authorization-unavailable'; readonly detail: string }
  | { readonly status: 'invalid-input'; readonly detail: string };

/**
 * TRUSTED SERVER-SIDE RECONCILIATION ENTRY POINT (Phase 3, §6).
 *
 * Rediscovery is stateless and cursor-free: every invocation re-reads the
 * canonical `public.vote_events` rows at or after an EXPLICIT cutover
 * boundary and replays, through the same atomic
 * `bora_engine_ingest_vote_event` transaction used by normal delivery,
 * any event whose stable identity
 * `(source_system='secure_vote_events', source_event_id)` is absent from
 * the Engine ledger `bora_engine_vote_events`. Events left commit-unknown
 * by a crashed or disconnected request remain in the source set and are
 * replayed here — nothing is skipped silently, and no durable checkpoint
 * ever advances past unprocessed work.
 *
 * Authorization: Engine operators only (`BORA_ENGINE_OPERATOR_USER_IDS`,
 * fail-closed). The response and all logs carry event identities and safe
 * status/edge codes only — never service-role secrets, access tokens, or
 * voter provenance.
 *
 * Scope boundary: the caller MUST state `cutoverIso` (ISO-8601). Backfill
 * scope is an unresolved product decision (D2); this entry refuses to invent
 * one.
 *
 * Scheduling gap — reported, not hidden: no cron/queue/worker infrastructure
 * exists in this repository or its deployment configuration, so this path is
 * invoked deliberately by an operator (or an external scheduler) rather than
 * running unattended. The durable rediscovery machinery itself is
 * implemented above; automatic scheduling is the remaining prerequisite.
 */
export async function runSecureVoteReconciliation(input: {
  readonly cutoverIso?: string | null;
  readonly batchSize?: number | null;
  readonly maxBatches?: number | null;
}): Promise<RunSecureVoteReconciliationResult> {
  const authorization = await authorizeBoraEngineOperator();
  if (authorization.status !== 'authorized') {
    if (authorization.status === 'authorization-unavailable') {
      return {
        status: 'authorization-unavailable',
        detail: authorization.detail,
      };
    }
    return { status: authorization.status };
  }

  if (
    typeof input?.cutoverIso !== 'string' ||
    input.cutoverIso.trim() === '' ||
    !Number.isFinite(Date.parse(input.cutoverIso))
  ) {
    return {
      status: 'invalid-input',
      detail: 'An explicit ISO-8601 cutover boundary (cutoverIso) is required.',
    };
  }

  const report = await reconcileSecureVoteDelivery({
    cutoverIso: input.cutoverIso,
    batchSize:
      typeof input.batchSize === 'number' ? input.batchSize : undefined,
    maxBatches:
      typeof input.maxBatches === 'number' ? input.maxBatches : undefined,
  });
  return { status: 'authorized', report };
}

