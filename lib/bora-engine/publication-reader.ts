import 'server-only';

import { createBoraEnginePersistenceFromEnv } from './persistence';
import type { BoraEnginePublishedChart } from './publication-transaction';

export type CurrentBoraEnginePublication =
  | { readonly status: 'published'; readonly publication: BoraEnginePublishedChart }
  | { readonly status: 'not-published' }
  | {
      readonly status: 'unavailable';
      readonly reason: 'configuration-unavailable' | 'read-failed';
    };

export async function getCurrentBoraEnginePublication(): Promise<CurrentBoraEnginePublication> {
  const setup = createBoraEnginePersistenceFromEnv();
  if (setup.status !== 'available') {
    return {
      status: 'unavailable',
      reason: 'configuration-unavailable',
    };
  }

  try {
    const publication = await setup.persistence.readCurrentPublication();
    return publication
      ? { status: 'published', publication }
      : { status: 'not-published' };
  } catch (error) {
    console.error(
      '[bora-engine-publication] current publication read failed:',
      error instanceof Error ? error.message : 'unknown error',
    );
    return { status: 'unavailable', reason: 'read-failed' };
  }
}
