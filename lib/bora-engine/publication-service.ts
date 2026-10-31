import 'server-only';

import type { EngineEvaluator } from './bridge';
import { toEngineInput } from './bridge';
import {
  assessPublicationGate,
  type PublicationGateInput,
} from './publication-gate';
import {
  createBoraEnginePersistenceFromEnv,
} from './persistence';
import {
  validatePublicationRequest,
  type ExpectedCurrentPublication,
  type PublicationCandidateEntry,
  type PublicationTransactionOutcome,
  type PublicationTransactionRequest,
} from './publication-transaction';

export type EvaluateAndPublishResult =
  | {
      readonly status: 'gate-rejected';
      readonly gate: ReturnType<typeof assessPublicationGate>;
    }
  | {
      readonly status: 'invalid-publication';
      readonly reasons: readonly string[];
    }
  | {
      readonly status: 'persistence-unavailable';
    }
  | {
      readonly status: 'transaction';
      readonly outcome: PublicationTransactionOutcome;
      readonly publicationRequest: PublicationTransactionRequest;
    };

export interface EvaluateAndPublishInput
  extends Omit<PublicationGateInput, 'evaluation'> {
  readonly evaluator: EngineEvaluator;
  readonly requestId: string;
  readonly resultIdentity: string;
  readonly expectedStateRevision: number;
  /**
   * Capture this revision in the same database snapshot as the evidence passed
   * to the gate. The RPC rejects it if any scoring input changes before commit.
   */
  readonly sourceRevision: number;
  readonly expectedCurrentPublication: ExpectedCurrentPublication;
}

function buildPublicationRequest(
  input: EvaluateAndPublishInput,
  gate: Extract<ReturnType<typeof assessPublicationGate>, { status: 'ready' }>,
): PublicationTransactionRequest | null {
  const activeEntries: PublicationCandidateEntry[] = [];
  for (const [index, song] of gate.evaluation.ranked.entries()) {
    if (song.rank === null || song.persistentKuraNext === null) return null;
    activeEntries.push({
      position: index,
      songId: song.songId,
      lifecycle: 'ACTIVE',
      rank: song.rank,
      activeC: song.activeC,
      xp: song.xp,
      kuraFresh: song.kuraFresh,
      persistentKuraBefore: song.persistentKuraBefore,
      persistentKuraNext: song.persistentKuraNext,
      platformPerformance: {
        youtube: song.platformPerformance.youtube,
        spotify: song.platformPerformance.spotify,
        boomplay: song.platformPerformance.boomplay,
      },
      boraScore: song.boraScore,
    });
  }
  const vaultedSongIds = [...gate.evaluation.excludedVaulted].sort();
  const vaultEntries: PublicationCandidateEntry[] = vaultedSongIds.map(
    (songId, index) => ({
      position: activeEntries.length + index,
      songId,
      lifecycle: 'VAULT',
      rank: null,
      activeC: null,
      xp: null,
      kuraFresh: null,
      persistentKuraBefore: null,
      persistentKuraNext: null,
      platformPerformance: {
        youtube: null,
        spotify: null,
        boomplay: null,
      },
      boraScore: null,
    }),
  );

  return {
    requestId: input.requestId,
    evaluationReferenceHour: gate.referenceHour,
    expectedState: {
      revision: input.expectedStateRevision,
      referenceHour: gate.referenceHour,
    },
    expectedCurrentPublication: input.expectedCurrentPublication,
    sourceSnapshot: {
      kind: 'revision',
      revision: input.sourceRevision,
    },
    evaluation: {
      resultIdentity: input.resultIdentity,
      validationStatus: 'validated',
      referenceHour: gate.referenceHour,
      activeSongIds: gate.evaluation.active.map((song) => song.songId),
      excludedVaultedSongIds: vaultedSongIds,
      totalActiveC: gate.evaluation.totalActiveC,
      platformTotals: gate.evaluation.platformTotals,
    },
    entries: [...activeEntries, ...vaultEntries],
  };
}

export async function evaluateAndPublishBoraEngineChart(
  input: EvaluateAndPublishInput,
): Promise<EvaluateAndPublishResult> {
  const preflight = assessPublicationGate({
    ...input,
    evaluation: { status: 'returned', result: null },
  });
  if (
    preflight.status === 'not-ready' ||
    (preflight.status === 'failed' &&
      preflight.reasons.some(
        (reason) => reason.code !== 'invalid-evaluation-result',
      ))
  ) {
    return { status: 'gate-rejected', gate: preflight };
  }

  const evaluation =
    input.input.status === 'ready'
      ? (() => {
          try {
            return {
              status: 'returned' as const,
              result: input.evaluator(toEngineInput(input.input.value)),
            };
          } catch (error) {
            return {
              status: 'threw' as const,
              ...(error instanceof Error ? { message: error.message } : {}),
            };
          }
        })()
      : { status: 'threw' as const };
  const gate = assessPublicationGate({ ...input, evaluation });
  if (gate.status !== 'ready') {
    return { status: 'gate-rejected', gate };
  }

  const request = buildPublicationRequest(input, gate);
  if (!request) {
    return {
      status: 'invalid-publication',
      reasons: ['missing-or-invalid-entry-values'],
    };
  }
  const validated = validatePublicationRequest(request);
  if (validated.status !== 'valid') {
    return {
      status: 'invalid-publication',
      reasons: validated.reasons,
    };
  }

  const setup = createBoraEnginePersistenceFromEnv();
  if (setup.status !== 'available') {
    return { status: 'persistence-unavailable' };
  }

  const outcome = await setup.persistence.publishChart(validated.request);
  return {
    status: 'transaction',
    outcome,
    publicationRequest: validated.request,
  };
}
