import 'server-only';

import { createClient } from './supabase/server';

import {
  authorizeAdministratorUserId,
  type AdministratorAuthorization,
} from './administrator-allowlist';

export type { AdministratorAuthorization } from './administrator-allowlist';

/**
 * BORA ADMINISTRATOR AUTHORIZATION — SERVER BOUNDARY
 * ============================================================
 *
 * Verifies the current request holds an authenticated Supabase
 * session and that the verified user id is on the server-only
 * `BORA_ADMIN_USER_IDS` allowlist. This is the single authorization
 * gate every privileged BORA write server action must pass BEFORE it
 * touches the database.
 *
 * Why an allowlist and not a database column:
 *   - It reuses the exact, already-trusted pattern of
 *     `lib/bora-engine/operator-authorization.ts` (verified
 *     `auth.getUser()` identity + server-only env allowlist), which
 *     is proven fail-closed in this repository.
 *   - It introduces NO new table, NO role column, and NO reliance on
 *     caller-editable `user_metadata`.
 *   - It is a SEPARATE source from the Engine operator allowlist:
 *     site administrators and Engine operators are distinct scopes.
 *
 * Security properties:
 *   - Identity comes from `auth.getUser()` (server-verified JWT), not
 *     from any request field, so it cannot be forged by a caller.
 *   - The allowlist is server-only (no `NEXT_PUBLIC_` prefix) and is
 *     never shipped to the browser.
 *   - Fails closed on any error, missing session, or missing/malformed
 *     configuration.
 */
export async function authorizeBoraAdministrator(): Promise<AdministratorAuthorization> {
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return {
        status: 'authorization-unavailable',
        detail:
          'The authentication service could not verify the session.',
      };
    }

    userId = data.user?.id ?? null;
  } catch {
    return {
      status: 'authorization-unavailable',
      detail:
        'The authentication service could not verify the session.',
    };
  }

  return authorizeAdministratorUserId(
    userId,
    process.env.BORA_ADMIN_USER_IDS,
  );
}

/**
 * Convenience predicate for call sites that only need a boolean and
 * want to surface a single, consistent denial message.
 */
export async function isBoraAdministrator(): Promise<boolean> {
  const authorization = await authorizeBoraAdministrator();
  return authorization.status === 'authorized';
}
