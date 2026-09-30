import { z } from 'zod';

/*
 * BORA VALIDATION — NEWS HUB INPUT CONTRACT
 * ==========================================
 *
 * Schema lives next to the boundary it validates, per BORA rule:
 * "prefer schemas close to the boundary they validate".
 *
 * SCOPE — SHAPE ONLY, DELIBERATELY:
 *   this schema proves the payload is the right SHAPE (an object, with
 *   string fields where strings are expected). It does NOT decide which
 *   fields are required, and it does NOT decide what a valid news item
 *   is.
 *
 * WHAT IT DELIBERATELY DOES NOT ENFORCE:
 *   • "Title / Category / Excerpt / Image are required"  -> stays in
 *     saveNewsHubItem, because that is a BORA business rule and the
 *     action already owns it with BORA-authored copy.
 *   • id must be a UUID or empty (create vs update)        -> stays in
 *     the action; that is a persistence decision, not a type.
 *   • publishedAt defaulting to "now"                     -> stays in
 *     the action; that is a BORA write rule.
 *   • authorization / RLS                                  -> untouched.
 *
 * WHY A SHAPE SCHEMA AT ALL:
 *   saveNewsHubItem is a Server Action, so its argument crosses a
 *   network boundary and can be anything. Without a shape guard, a
 *   malformed payload produces `payload.title?.trim()` on a non-string
 *   and reaches the RPC with undefined values. This schema turns that
 *   into a clean rejection BEFORE any write is attempted.
 */

const optionalString = z.string().optional();

/**
 * Shape of the incoming news item, permissive about presence.
 *
 * `.passthrough()`-free on purpose: unknown keys are stripped rather
 * than forwarded, so nothing outside this contract can reach the RPC.
 */
export const newsHubRecordShape = z.object({
  id: optionalString,
  title: optionalString,
  category: optionalString,
  excerpt: optionalString,
  content: optionalString,
  source: optionalString,
  image: optionalString,
  isHot: z.boolean().optional(),
  publishedAt: optionalString,
});

/**
 * Parsed payload narrowed to what the action needs.
 *
 * `NewsHubRecord` stays the public contract type for callers; this is
 * the validated view of it.
 */
export type ValidatedNewsHubRecord = z.infer<
  typeof newsHubRecordShape
>;

/**
 * Shape-derived helper: does the validated payload carry every field the
 * BORA action requires?
 *
 * This is NOT a business rule. The action still decides the outcome and
 * the error copy — this only answers a question about SHAPE. It exists
 * so a future form can preview required fields without duplicating the
 * rule that ultimately lives in saveNewsHubItem.
 */
export function hasRequiredNewsFields(
  payload: ValidatedNewsHubRecord
): boolean {
  return Boolean(
    payload.title?.trim() &&
      payload.category?.trim() &&
      payload.excerpt?.trim() &&
      payload.image?.trim()
  );
}
