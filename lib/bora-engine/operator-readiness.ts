import 'server-only';

import { authorizeBoraEngineOperator } from './operator-authorization';
import type { BoraEngineOperatorAuthorization } from './operator-authorization';
import {
  getBoraEngineReadiness,
  type BoraEngineReadiness,
} from './persistence';
import { getCurrentPlatformSourceAssessments } from './source-readiness';

export type { BoraEngineOperatorAuthorization } from './operator-authorization';

export type BoraEngineOperatorReadinessResult =
  | BoraEngineOperatorAuthorization
  | {
      readonly status: 'readiness';
      readonly readiness: BoraEngineReadiness;
      readonly sourceAssessments: ReturnType<
        typeof getCurrentPlatformSourceAssessments
      >;
    };

/**
 * Internal server-only boundary. Do not expose this through a route, action,
 * UI, or client module until the application has operator-specific auth.
 */
export async function getBoraEngineOperatorReadiness(): Promise<BoraEngineOperatorReadinessResult> {
  const authorization = await authorizeBoraEngineOperator();
  if (authorization.status !== 'authorized') return authorization;

  const sourceAssessments = getCurrentPlatformSourceAssessments(
    new Date().toISOString(),
  );
  const readiness = await getBoraEngineReadiness();
  const requiredSourcesAvailable = sourceAssessments.every(
    (assessment) => assessment.status === 'available',
  );

  return {
    status: 'readiness',
    readiness: {
      ...readiness,
      status:
        readiness.status === 'unavailable'
          ? 'unavailable'
          : readiness.status === 'ready' && requiredSourcesAvailable
            ? 'ready'
            : 'not-ready',
    },
    sourceAssessments,
  };
}
