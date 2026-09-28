/*
 * BORA PUBLIC NAVIGATION — CANONICAL STRUCTURAL FACTS (server-safe)
 *
 * This module is the SINGLE SOURCE OF TRUTH for the STRUCTURE of
 * public navigation: which section ids exist, and what each one's
 * canonical visible label is.
 *
 * SERVER-SAFE BY CONTRACT. It contains no React, no lucide icons and
 * no client-only import, so it may be pulled into server modules
 * (lib/ui-config.ts, boraUIConfig.ts) and shared with the client
 * module (publicSections.ts) without dragging the icon bundle along.
 *
 * Icons and the `prominent` flag are PRESENTATION, and stay in
 * publicSections.ts. This module deliberately does not know them.
 *
 * SCOPE — structure, not visual configuration. Order, membership and
 * labels are deliberately NOT editable as CSS targets. The UI Room
 * owns navigation structure through the persisted `navigation`
 * config block; it owns the PRESENTATION of the items through the
 * `public-navbar*` targets in the shared registry.
 */

/** Every public section id, in CANONICAL order. */
export const PUBLIC_SECTION_IDS = [
  'charts',
  'trending',
  'vote',
  'updates',
  'profile',
] as const;

export type Section = (typeof PUBLIC_SECTION_IDS)[number];

/** Canonical visible label per section. Never empty. */
export const PUBLIC_SECTION_LABELS: Record<Section, string> = {
  charts: 'Charts',
  trending: 'Trending',
  vote: 'Vote',
  updates: 'Updates',
  profile: 'Profile',
};

/**
 * Longest accepted visible label.
 *
 * The active nav label renders with `whitespace-nowrap` inside a
 * `flex-1` item, so a long label overflows its item and disturbs its
 * siblings. The value is generous for real navigation words and tight
 * enough that "Top 40 Charts This Week" cannot be committed.
 */
export const MAX_PUBLIC_SECTION_LABEL_LENGTH = 24;

const KNOWN_SECTION_IDS: ReadonlySet<string> = new Set(
  PUBLIC_SECTION_IDS
);

export function isPublicSectionId(
  value: unknown
): value is Section {
  return typeof value === 'string' && KNOWN_SECTION_IDS.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/* ── NAVIGATION CONFIG MODEL (structural) ───────────────────── */

/**
 * Persisted structural navigation overrides.
 *
 * DELTA-ONLY BY DESIGN: canonical order and labels live in this
 * module, so a config that is absent, empty or partial needs no
 * baseline replication — and a section added to code later shows up
 * automatically instead of being invisible. This mirrors the
 * existing "empty means inherit" philosophy of the scalar config.
 */
export interface BoraUINavigationConfig {
  /** Section ids in the admin's chosen order. */
  order: Section[];
  /** Section ids hidden from the public navbar. */
  hidden: Section[];
  /** Visible label overrides, keyed by section id. */
  labels: Partial<Record<Section, string>>;
}

/**
 * A section after structural resolution. Icons are NOT here: this
 * type is produced on the server, where lucide does not belong.
 */
export interface ResolvedPublicNavigationItem {
  id: Section;
  label: string;
  hidden: boolean;
}

/** True when a navigation config carries no actual instruction. */
export function isNavigationConfigEmpty(
  config?: BoraUINavigationConfig | null
): boolean {
  if (!config) return true;

  return (
    config.order.length === 0 &&
    config.hidden.length === 0 &&
    Object.keys(config.labels).length === 0
  );
}

/* ── NORMALIZATION ───────────────────────────────────────────── */

/**
 * Coerces arbitrary input into a valid navigation config, or null.
 *
 * Same contract as normalizeBoraUIConfig: invalid entries are
 * DROPPED with a warning, never applied. An input that yields
 * nothing usable resolves to null (meaning "canonical").
 */
export function normalizePublicNavigationConfig(
  input: unknown,
  warnings: string[] = []
): BoraUINavigationConfig | null {
  if (input === undefined || input === null) return null;

  if (!isRecord(input)) {
    warnings.push('navigation config is not an object');
    return null;
  }

  const order: Section[] = [];

  if (Array.isArray(input.order)) {
    for (const value of input.order) {
      if (!isPublicSectionId(value)) {
        warnings.push(
          `unknown navigation id dropped: ${String(value)}`
        );
        continue;
      }

      // First occurrence wins: a duplicate is not a second position.
      if (order.includes(value)) {
        warnings.push(`duplicate navigation id dropped: ${value}`);
        continue;
      }

      order.push(value);
    }
  } else if (input.order !== undefined) {
    warnings.push('navigation.order is not an array');
  }

  const hidden: Section[] = [];

  if (Array.isArray(input.hidden)) {
    for (const value of input.hidden) {
      if (!isPublicSectionId(value)) {
        warnings.push(
          `unknown hidden id dropped: ${String(value)}`
        );
        continue;
      }

      if (hidden.includes(value)) {
        warnings.push(`duplicate hidden id dropped: ${value}`);
        continue;
      }

      hidden.push(value);
    }
  } else if (input.hidden !== undefined) {
    warnings.push('navigation.hidden is not an array');
  }

  const labels: Partial<Record<Section, string>> = {};

  if (isRecord(input.labels)) {
    for (const [key, value] of Object.entries(input.labels)) {
      if (!isPublicSectionId(key)) {
        warnings.push(
          `unknown navigation label key dropped: ${key}`
        );
        continue;
      }

      if (typeof value !== 'string') {
        warnings.push(`bad navigation label dropped: ${key}`);
        continue;
      }

      const trimmed = value.trim();

      // A blank label would strip the accessible name, so it is
      // refused outright rather than rendered.
      if (trimmed.length === 0) {
        warnings.push(`blank navigation label dropped: ${key}`);
        continue;
      }

      const capped =
        trimmed.length > MAX_PUBLIC_SECTION_LABEL_LENGTH
          ? trimmed.slice(0, MAX_PUBLIC_SECTION_LABEL_LENGTH)
          : trimmed;

      if (capped !== trimmed) {
        warnings.push(
          `navigation label truncated to ${MAX_PUBLIC_SECTION_LABEL_LENGTH} chars: ${key}`
        );
      }

      // A no-op override is dropped so it never registers as dirty.
      if (capped === PUBLIC_SECTION_LABELS[key]) {
        continue;
      }

      labels[key] = capped;
    }
  } else if (input.labels !== undefined) {
    warnings.push('navigation.labels is not an object');
  }

  // Hiding EVERY section would leave the public bar empty with no way
  // back. The whole instruction is refused rather than half-applied.
  if (hidden.length === PUBLIC_SECTION_IDS.length) {
    warnings.push(
      'navigation.hidden hides every section and was ignored'
    );

    return null;
  }

  const config: BoraUINavigationConfig = { order, hidden, labels };

  return isNavigationConfigEmpty(config) ? null : config;
}

/* ── RESOLUTION ──────────────────────────────────────────────── */

/**
 * Resolves structural config into the effective section sequence.
 *
 * `order` means ORDERING and `hidden` means VISIBILITY — they are
 * deliberately independent. A hidden item stays in the sequence,
 * marked, so a consumer can decide what to do when the ACTIVE section
 * is hidden (PublicShell falls back to the first visible one).
 *
 * The resolver is DEFENSIVE: it normalizes its own input and is safe
 * to call with anything — a partially written config, a config that
 * predates the `navigation` block, or null.
 */
export function resolvePublicNavigation(
  config?: BoraUINavigationConfig | null
): ResolvedPublicNavigationItem[] {
  const safe = normalizePublicNavigationConfig(config ?? undefined) ?? {
    order: [] as Section[],
    hidden: [] as Section[],
    labels: {},
  };

  // B. Configured order, completed with every canonical id it
  //    omitted, so a partial order REORDERS rather than deletes.
  const order: Section[] = [...safe.order];

  for (const id of PUBLIC_SECTION_IDS) {
    if (!order.includes(id)) order.push(id);
  }

  // C. Hidden MARKS; it never removes an item from the sequence.
  //    The all-hidden case is already refused during normalization;
  //    if a caller bypasses that, visibility wins and the bar
  //    survives — public navigation must never render empty.
  const hidesEverything = order.every((id) =>
    safe.hidden.includes(id)
  );

  const hiddenSet = new Set<Section>(
    hidesEverything ? [] : safe.hidden
  );

  // D. Labels fall back to canonical per id.
  return order.map((id) => ({
    id,
    label: safe.labels[id] ?? PUBLIC_SECTION_LABELS[id],
    hidden: hiddenSet.has(id),
  }));
}
