import { parseAsStringLiteral } from 'nuqs';

/*
 * BORA URL STATE BOUNDARY
 * ======================
 *
 * nuqs provides ONE capability: a typed, shareable, bookmarkable
 * <-> URL binding. That is all it is allowed to do here.
 *
 * OWNERSHIP:
 *   nuqs -> serialize / parse the query string, keep it in sync
 *   BORA -> which keys exist, what the values MEAN, and what happens
 *           as a result
 *
 * URL STATE ONLY. This is explicitly NOT general application state.
 * These keys must never hold:
 *   • UI Room draft / committed / history state  (uiDraftStore owns it)
 *   • selection, drafts, or anything with Save/Discard semantics
 *   • anything mirrored from Supabase
 *   • anything a Zustand store owns
 *
 * If a value is not "shareable, linkable, and meaningless without the
 * page", it does not belong in the query string.
 */

/*
 * `?error=oauth`
 *
 * Produced by /auth/callback/route.ts when GitHub's code exchange
 * fails, and read by AdminLoginOP to show BORA's own failure copy.
 *
 * `parseAsStringLiteral(['oauth'])` is what makes this TYPED: only the
 * literal 'oauth' survives. Any other value parses to null, which is
 * exactly the previous behaviour of
 *   searchParams.get('error') === 'oauth'
 * so mounting this changes no user-visible outcome.
 *
 * BORA owns the error MESSAGE. nuqs only owns the key and the parse.
 */
export const BORA_LOGIN_ERROR_VALUES = ['oauth'] as const;

export const loginErrorParam = parseAsStringLiteral(
  BORA_LOGIN_ERROR_VALUES
);

/**
 * The only URL value BORA recognises here.
 *
 * Declared from the literal list rather than from
 * `typeof loginErrorParam.parse`, which is the parser FUNCTION type,
 * not the value type.
 */
export type BoraLoginError = (typeof BORA_LOGIN_ERROR_VALUES)[number];

/** BORA's own copy for a failed OAuth hand-off. */
export function loginErrorMessage(
  error: BoraLoginError | null
): string | null {
  switch (error) {
    case 'oauth':
      return 'GitHub authentication failed. Try again.';
    default:
      return null;
  }
}
