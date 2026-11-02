'use server';

import { evaluateChart } from '../../engine/src/engine/evaluation/chart';
import { authorizeBoraEngineOperator } from './operator-authorization';
import {
  evaluateAndPublishDailyRankBoraEngineChart,
  type EvaluateAndPublishDailyRankResult,
} from './publication-service';

export type DailyRankPublicationActionResult =
  | EvaluateAndPublishDailyRankResult
  | { readonly status: 'unauthenticated' | 'forbidden' | 'invalid-request' }
  | {
      readonly status: 'authorization-unavailable';
      readonly detail: string;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function publishDailyRankBoraEngineChart(
  requestId: string,
): Promise<DailyRankPublicationActionResult> {
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

  if (typeof requestId !== 'string' || !UUID_PATTERN.test(requestId)) {
    return { status: 'invalid-request' };
  }

  return evaluateAndPublishDailyRankBoraEngineChart({
    requestId,
    evaluator: evaluateChart,
  });
}
