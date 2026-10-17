import { createBoraEnginePersistence, type BoraEnginePersistence } from './persistence';

export interface SecureVoteReconciliationOptions {
  readonly cutoverIso: string;
  readonly batchSize?: number;
  readonly maxBatches?: number;
}

export interface SecureVoteReconciliationCounts {
  readonly ingested: number;
  readonly alreadyIngested: number;
  readonly invalidInput: number;
  readonly conflictingIdentity: number;
  readonly persistenceFailure: number;
  readonly commitUnknown: number;
}

export type SecureVoteReconciliationReport =
  | { readonly status: 'completed' | 'aborted'; readonly cutoverIso: string; readonly stopReason: 'source-exhausted' | 'batch-limit' | 'rpc-unavailable' | 'source-scan-failed'; readonly batches: number; readonly sourceRowsScanned: number; readonly pendingEvents: number; readonly counts: SecureVoteReconciliationCounts; readonly lastCommitUnknownEventId?: string; readonly lastPersistenceErrorCode?: string; }
  | { readonly status: 'configuration-unavailable'; readonly missing: string }
  | { readonly status: 'invalid-input'; readonly reasons: readonly string[] };

export async function reconcileSecureVoteDelivery(options: SecureVoteReconciliationOptions): Promise<SecureVoteReconciliationReport> {
  const cutoverMs = typeof options.cutoverIso === 'string' ? Date.parse(options.cutoverIso) : Number.NaN;
  if (!Number.isFinite(cutoverMs)) {
    return { status: 'invalid-input', reasons: ['invalid-committed-timestamp'] };
  }
  const cutoverIso = options.cutoverIso;
  const batchSize = clampReconciliationPageSize(options.batchSize ?? 25);
  const maxBatches = clampReconciliationBatchSize(options.maxBatches ?? 4);

  const setup = createBoraEnginePersistence();
  if (setup.status === 'configuration-unavailable') {
    return { status: 'configuration-unavailable', missing: setup.missing };
  }
  const persistence = setup.persistence;

  const counts = { ingested: 0, alreadyIngested: 0, invalidInput: 0, conflictingIdentity: 0, persistenceFailure: 0, commitUnknown: 0 };
  let batches = 0;
  let sourceRowsScanned = 0;
  let pendingEvents = 0;
  let stopReason: 'source-exhausted' | 'batch-limit' | 'rpc-unavailable' | 'source-scan-failed' = 'batch-limit';
  let lastCommitUnknownEventId: string | undefined;
  let lastPersistenceErrorCode: string | undefined;
  let offset = 0;

  for (; batches < maxBatches; batches += 1) {
    let scanned = 0;
    let hasMore = false;
    try {
      const page = await persistence.findPendingSecureVoteEvents({ cutoverIso, offset, limit: batchSize });
      scanned = page.scanned;
      hasMore = page.hasMore;

      for (const event of page.events) {
        pendingEvents += 1;
        let outcome;
        try {
          outcome = await persistence.ingestVoteEvent(event);
        } catch {
          outcome = { status: 'commit-unknown' as const, sourceSystem: 'secure_vote_events' as const, sourceEventId: event.sourceEventId };
        }

        switch (outcome.status) {
          case 'ingested': counts.ingested += 1; break;
          case 'already-ingested': counts.alreadyIngested += 1; break;
          case 'invalid-input': counts.invalidInput += 1; break;
          case 'conflicting-identity': counts.conflictingIdentity += 1; break;
          case 'persistence-failure': counts.persistenceFailure += 1; lastPersistenceErrorCode = outcome.errorCode; break;
          case 'commit-unknown': counts.commitUnknown += 1; lastCommitUnknownEventId = event.sourceEventId; break;
        }

        if (outcome.status === 'persistence-failure' && isSystemicIngestionErrorCode(outcome.errorCode)) {
          console.error('BORA_ENGINE_RECONCILE_ABORT', event.sourceEventId, outcome.errorCode);
          stopReason = 'rpc-unavailable';
          batches += 1;
          return { status: 'aborted', cutoverIso, stopReason, batches, sourceRowsScanned: sourceRowsScanned + scanned, pendingEvents, counts };
        }

        if (outcome.status === 'commit-unknown') {
          console.error('BORA_ENGINE_RECONCILE_UNKNOWN', event.sourceEventId);
        } else if (outcome.status !== 'ingested' && outcome.status !== 'already-ingested') {
          console.error('BORA_ENGINE_RECONCILE_REJECTED', event.sourceEventId, outcome.status);
        } else {
          console.info('BORA_ENGINE_RECONCILE_OK', event.sourceEventId, outcome.status);
        }
      }
    } catch {
      stopReason = 'source-scan-failed';
      return { status: 'aborted', cutoverIso, stopReason, batches: batches + 1, sourceRowsScanned, pendingEvents, counts };
    }

    sourceRowsScanned += scanned;
    offset += scanned;
    if (!hasMore) { stopReason = 'source-exhausted'; break; }
  }

  return { status: 'completed', cutoverIso, stopReason, batches, sourceRowsScanned, pendingEvents, counts };
}

const SYSTEMIC_INGESTION_ERROR_CODES = ['42883', 'PGRST202', 'BORA_ENGINE_WORKER_REQUIRED'];

function isSystemicIngestionErrorCode(errorCode: string): boolean {
  return SYSTEMIC_INGESTION_ERROR_CODES.some((code) => errorCode.includes(code));
}

function clampReconciliationPageSize(limit: number): number {
  if (!Number.isFinite(limit)) return 25;
  return Math.min(100, Math.max(1, Math.trunc(limit)));
}

function clampReconciliationBatchSize(limit: number): number {
  if (!Number.isFinite(limit)) return 4;
  return Math.min(20, Math.max(1, Math.trunc(limit)));
}

