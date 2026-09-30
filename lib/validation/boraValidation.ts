import { z } from 'zod';

/*
 * BORA VALIDATION BOUNDARY
 * =========================
 *
 * Zod validates DATA. It does not decide anything about BORA.
 *
 * OWNERSHIP (non-negotiable):
 *   Zod  -> shape, type, format of an input contract
 *   BORA -> every business rule, ranking rule, authorization check,
 *           RPC/database constraint, and the decision about what
 *           "success" or "failure" means.
 *
 * This module is the ONLY place Server Actions are allowed to turn an
 * untrusted argument into a typed value. It is deliberately a thin
 * wrapper so Zod never becomes a decision layer: `boraParse` reports
 * what the schema says and nothing else.
 *
 * USAGE ORDER AT A BOUNDARY — never reorder this:
 *
 *   untrusted input (Server Action argument / URL / form payload)
 *     -> boraParse(schema, input)      // Zod: shape + type + format
 *     -> BORA authorization            // supabase.auth.getUser(), RLS
 *     -> BORA business rules           // ranks, ownership, limits
 *     -> Supabase RPC / database       // SECURITY DEFINER + constraints
 *
 * A schema in this folder is therefore allowed to be NARROWER than the
 * business rules (reject malformed input early), but it must never be
 * the thing that enforces a BORA rule.
 */

export type BoraParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; issues: readonly z.ZodIssue[] };

/**
 * Validates `input` against `schema` and returns a BORA-owned result.
 *
 * On failure the returned `error` is a human-readable summary suitable
 * for a Server Action's existing `error` string. Callers still decide
 * what to do with it — this function never throws and never writes.
 */
export function boraParse<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown
): BoraParseResult<z.infer<S>> {
  const result = schema.safeParse(input);

  if (result.success) {
    return { ok: true, data: result.data as z.infer<S> };
  }

  return {
    ok: false,
    error: formatIssues(result.error.issues),
    issues: result.error.issues,
  };
}

/**
 * Flattens Zod issues into one BORA-style sentence.
 *
 * Reports the FIRST issue only. A Server Action returns a single
 * `error` string, and inventing an aggregation policy here would make
 * Zod decide how much detail BORA is allowed to surface.
 */
function formatIssues(issues: readonly z.ZodIssue[]): string {
  const first = issues[0];

  if (!first) return 'Invalid input.';

  const path = first.path.join('.');

  return path
    ? `${path}: ${first.message}`
    : first.message;
}
