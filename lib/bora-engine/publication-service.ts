import 'server-only';

import type { ChartEvaluationResult } from '../../engine/src/engine/evaluation/chart';
import type { EngineEvaluator } from './bridge';
import { toEngineInput } from './bridge';
import { buildEngineInputFromBackendRows } from './adapter';
import {
  assessPublicationGate,
  hasExpectedPublicationPopulation,
  isUsablePublicationEvaluation,
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

export interface EvaluateAndPublishDailyRankInput {
  readonly evaluator: EngineEvaluator;
  readonly requestId: string;
}

export type EvaluateAndPublishDailyRankResult =
  | {
      readonly status: 'not-ready';
      readonly reason: string;
      readonly detail?: string;
    }
  | {
      readonly status: 'snapshot-unavailable';
      readonly reason: 'rpc-failed' | 'invalid-response';
      readonly errorCode?: string;
    }
  | { readonly status: 'persistence-unavailable' }
  | {
      readonly status: 'evaluation-failed';
      readonly reason: 'evaluator-threw' | 'engine-rejected';
      readonly errorCode?: string;
      readonly detail?: string;
    }
  | {
      readonly status: 'invalid-publication';
      readonly reasons: readonly string[];
    }
  | {
      readonly status: 'transaction';
      readonly outcome: PublicationTransactionOutcome;
      readonly publicationRequest: PublicationTransactionRequest;
    };

type PublicationRequestContext = Pick<
  EvaluateAndPublishInput,
  | 'requestId'
  | 'resultIdentity'
  | 'expectedStateRevision'
  | 'sourceRevision'
  | 'expectedCurrentPublication'
>;

function buildPublicationRequest(
  input: PublicationRequestContext,
  referenceHour: number,
  evaluation: ChartEvaluationResult,
): PublicationTransactionRequest | null {
  const activeEntries: PublicationCandidateEntry[] = [];
  for (const [index, song] of evaluation.ranked.entries()) {
    if (song.rank === null) return null;
    activeEntries.push({
      position: index,
      songId: song.songId,
      lifecycle: 'ACTIVE',
      rank: song.rank,
      activeC: song.activeC,
      xp: song.xp,
      kuraFresh: song.kuraFresh,
      persistentKuraBefore: song.persistentKuraBefore,
      // Without a closed-hour cycle, the persisted Kura balance is unchanged.
      persistentKuraNext:
        song.persistentKuraNext ?? song.persistentKuraBefore,
      platformPerformance: {
        youtube: song.platformPerformance.youtube,
        spotify: song.platformPerformance.spotify,
        boomplay: song.platformPerformance.boomplay,
      },
      boraScore: song.boraScore,
    });
  }
  const vaultedSongIds = [...evaluation.excludedVaulted].sort();
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
    evaluationReferenceHour: referenceHour,
    expectedState: {
      revision: input.expectedStateRevision,
      referenceHour,
    },
    expectedCurrentPublication: input.expectedCurrentPublication,
    sourceSnapshot: {
      kind: 'revision',
      revision: input.sourceRevision,
    },
    evaluation: {
      resultIdentity: input.resultIdentity,
      validationStatus: 'validated',
      referenceHour,
      activeSongIds: evaluation.active.map((song) => song.songId),
      excludedVaultedSongIds: vaultedSongIds,
      totalActiveC: evaluation.totalActiveC,
      platformTotals: evaluation.platformTotals,
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

  const request = buildPublicationRequest(
    input,
    gate.referenceHour,
    gate.evaluation,
  );
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

export async function evaluateAndPublishDailyRankBoraEngineChart(
  input: EvaluateAndPublishDailyRankInput,
): Promise<EvaluateAndPublishDailyRankResult> {
  const setup = createBoraEnginePersistenceFromEnv();
  if (setup.status !== 'available') {
    return { status: 'persistence-unavailable' };
  }

  const snapshot =
    await setup.persistence.loadPublicationInputSnapshot();
  if (snapshot.status === 'not-ready') {
    return { status: 'not-ready', reason: snapshot.reason };
  }
  if (snapshot.status === 'unavailable') {
    return {
      status: 'snapshot-unavailable',
      reason: snapshot.reason,
      ...(snapshot.errorCode ? { errorCode: snapshot.errorCode } : {}),
    };
  }

  const built = buildEngineInputFromBackendRows(
    snapshot.songs,
    snapshot.referenceHour,
    {
      closedHourC: null,
      dailyPlatformRankSnapshots: snapshot.dailyPlatformRankSnapshots,
    },
  );
  if (built.status !== 'ready') {
    const details = built.gaps.map(
      (gap) => `${gap.field}:${gap.availability}:${gap.reason}`,
    );
    if (built.skipped.length > 0) {
      details.push(`${built.skipped.length} backend rows were skipped`);
    }
    return {
      status: 'not-ready',
      reason: 'engine-input-not-ready',
      ...(details.length > 0 ? { detail: details.join('; ') } : {}),
    };
  }

  let evaluated: ReturnType<EngineEvaluator>;
  try {
    evaluated = input.evaluator(toEngineInput(built.value));
  } catch (error) {
    return {
      status: 'evaluation-failed',
      reason: 'evaluator-threw',
      ...(error instanceof Error ? { detail: error.message } : {}),
    };
  }
  if (!evaluated.ok) {
    return {
      status: 'evaluation-failed',
      reason: 'engine-rejected',
      errorCode: evaluated.error.code,
      detail: evaluated.error.message,
    };
  }
  if (
    !isUsablePublicationEvaluation(
      evaluated.value,
      snapshot.referenceHour,
      built.value.closedHourC,
    )
  ) {
    return {
      status: 'invalid-publication',
      reasons: ['invalid-evaluation-result'],
    };
  }

  const activeSongIds = built.value.songs
    .filter((song) => song.lifecycle === 'ACTIVE')
    .map((song) => song.songId);
  const vaultedSongIds = built.value.songs
    .filter((song) => song.lifecycle === 'VAULT')
    .map((song) => song.songId);
  if (
    !hasExpectedPublicationPopulation(
      evaluated.value,
      activeSongIds,
      vaultedSongIds,
    )
  ) {
    return {
      status: 'invalid-publication',
      reasons: ['evaluation-population-mismatch'],
    };
  }

  const request = buildPublicationRequest(
    {
      requestId: input.requestId,
      resultIdentity: [
        snapshot.isSyntheticDemo ? 'synthetic-demo' : 'daily-rank',
        snapshot.referenceHour,
        snapshot.stateRevision,
        snapshot.sourceRevision,
      ].join(':'),
      expectedStateRevision: snapshot.stateRevision,
      sourceRevision: snapshot.sourceRevision,
      expectedCurrentPublication: snapshot.expectedCurrentPublication,
    },
    snapshot.referenceHour,
    evaluated.value,
  );
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

  const outcome = await setup.persistence.publishChart(validated.request);
  return {
    status: 'transaction',
    outcome,
    publicationRequest: validated.request,
  };
}
