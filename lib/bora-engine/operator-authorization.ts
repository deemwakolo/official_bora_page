import 'server-only';

import { createClient } from '../supabase/server';

export type BoraEngineOperatorAuthorization =
  | { readonly status: 'authorized' }
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'forbidden' }
  | {
      readonly status: 'authorization-unavailable';
      readonly detail: string;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readOperatorUserIds(): ReadonlySet<string> | null {
  const configured = process.env.BORA_ENGINE_OPERATOR_USER_IDS;
  if (!configured) return null;

  const entries = configured
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length === 0 || entries.some((entry) => !UUID_PATTERN.test(entry))) {
    return null;
  }
  return new Set(entries.map((entry) => entry.toLowerCase()));
}

export async function authorizeBoraEngineOperator(): Promise<BoraEngineOperatorAuthorization> {
  let userId: string | null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return {
        status: 'authorization-unavailable',
        detail: 'The authentication service could not verify the session.',
      };
    }
    userId = data.user?.id ?? null;
  } catch {
    return {
      status: 'authorization-unavailable',
      detail: 'The authentication service could not verify the session.',
    };
  }

  if (!userId) return { status: 'unauthenticated' };
  if (!UUID_PATTERN.test(userId)) {
    return {
      status: 'authorization-unavailable',
      detail: 'The authentication service returned an invalid user identity.',
    };
  }

  const operatorUserIds = readOperatorUserIds();
  if (!operatorUserIds) {
    return {
      status: 'authorization-unavailable',
      detail: 'A valid BORA_ENGINE_OPERATOR_USER_IDS configuration is required.',
    };
  }

  return operatorUserIds.has(userId.toLowerCase())
    ? { status: 'authorized' }
    : { status: 'forbidden' };
}
