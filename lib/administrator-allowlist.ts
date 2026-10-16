/*
 * BORA ADMINISTRATOR AUTHORIZATION — PURE DECISION CORE
 * ============================================================
 *
 * This module contains the SERVER-SIDE authorization decision for
 * privileged BORA administrator writes. It is deliberately free of
 * any framework, Supabase, or `next/*` import so the decision logic
 * can be unit-tested in isolation (see
 * `scripts/verify-bora-administrator-authorization.mjs`).
 *
 * TRUST MODEL
 * -----------
 *   - Identity is a Supabase user id (`uuid`) obtained ONLY from a
 *     verified server session (`supabase.auth.getUser()` in
 *     `administrator-authorization.ts`). It is NEVER a caller-supplied
 *     value.
 *   - The administrator set is a SERVER-ONLY allowlist read from the
 *     `BORA_ADMIN_USER_IDS` environment variable (comma-separated
 *     UUIDs). This variable has NO `NEXT_PUBLIC_` prefix, so it is
 *     never inlined into a browser bundle.
 *   - The decision FAILS CLOSED: a missing/malformed allowlist, an
 *     absent session, or a non-listed identity is never authorized.
 *
 * SCOPE
 * -----
 *   This is the SITE ADMINISTRATOR policy. It is intentionally a
 *   DIFFERENT source from `BORA_ENGINE_OPERATOR_USER_IDS`
 *   (`lib/bora-engine/operator-authorization.ts`). Engine operator
 *   access and site administrator access are separate scopes and are
 *   NOT automatically equated.
 *
 * The database boundary uses a parallel, trusted signal: the
 * non-caller-editable `app_metadata.role = 'bora_administrator'` JWT
 * claim (see migration 0018). Both sources must be provisioned for
 * the same administrator identities by the deployment.
 */

/**
 * The `app_metadata.role` claim value that marks a Supabase user as a
 * BORA site administrator. `app_metadata` is server-controlled and is
 * NOT editable by the authenticated user through the client, unlike
 * `user_metadata`. This constant documents the value the database
 * boundary (migration 0018) expects; keep it in sync with the SQL.
 */
export const ADMINISTRATOR_ROLE_CLAIM = 'bora_administrator';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdministratorAuthorization =
  | { readonly status: 'authorized' }
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'forbidden' }
  | {
      readonly status: 'authorization-unavailable';
      readonly detail: string;
    };

/**
 * Parse the `BORA_ADMIN_USER_IDS` environment value into a normalized
 * set of lower-cased UUIDs.
 *
 * Returns `null` (=> fail closed) when the value is missing, empty, or
 * contains any entry that is not a valid UUID. Comparison is
 * case-insensitive because UUIDs are canonically lower-case but may be
 * configured in either case.
 */
export function parseAdministratorUserIds(
  configured: string | undefined,
): ReadonlySet<string> | null {
  if (!configured) return null;

  const entries = configured
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    return null;
  }

  if (entries.some((entry) => !UUID_PATTERN.test(entry))) {
    return null;
  }

  return new Set(entries.map((entry) => entry.toLowerCase()));
}

/**
 * The pure authorization decision for a verified user id.
 *
 * This function performs NO I/O and trusts nothing about the caller
 * beyond the two arguments:
 *   - `userId`     a verified Supabase user id (or null when there is
 *                  no authenticated session).
 *   - `configured` the raw `BORA_ADMIN_USER_IDS` environment value.
 *
 * Outcomes:
 *   - `unauthenticated`            no verified session.
 *   - `authorization-unavailable`  the verified identity is not a UUID,
 *                                  or the allowlist is missing/malformed
 *                                  (fail closed).
 *   - `forbidden`                  a valid session whose id is not an
 *                                  administrator.
 *   - `authorized`                 a valid session whose id is listed.
 */
export function authorizeAdministratorUserId(
  userId: string | null | undefined,
  configured: string | undefined,
): AdministratorAuthorization {
  if (!userId) {
    return { status: 'unauthenticated' };
  }

  if (!UUID_PATTERN.test(userId)) {
    return {
      status: 'authorization-unavailable',
      detail:
        'The authentication service returned an invalid user identity.',
    };
  }

  const administratorUserIds = parseAdministratorUserIds(configured);
  if (!administratorUserIds) {
    return {
      status: 'authorization-unavailable',
      detail:
        'A valid BORA_ADMIN_USER_IDS configuration is required.',
    };
  }

  return administratorUserIds.has(userId.toLowerCase())
    ? { status: 'authorized' }
    : { status: 'forbidden' };
}
