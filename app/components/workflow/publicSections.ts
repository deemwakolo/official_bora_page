import {
  BarChart3,
  Bell,
  Crown,
  TrendingUp,
  User,
  type LucideIcon,
} from 'lucide-react';

import {
  PUBLIC_SECTION_IDS,
  PUBLIC_SECTION_LABELS,
  type ResolvedPublicNavigationItem,
  type Section,
} from './publicSectionIds';

export type { Section };

/*
 * BORA PUBLIC NAVIGATION — CLIENT NAVIGATION DEFINITION
 *
 * This module adds PRESENTATION to the structural facts owned by
 * publicSectionIds.ts: the lucide icon for each section, and which
 * item is the prominent centre bubble. It deliberately owns NEITHER
 * the id list NOR the canonical labels — those live in
 * publicSectionIds.ts so the server-side config resolver can use
 * them without importing lucide.
 *
 * SCOPE — order, membership and labels come from the resolved
 * navigation config; what the UI Room owns is the PRESENTATION of
 * the items (colour, size, spacing, motion) through the
 * `public-navbar*` targets in the shared registry.
 */

/** Icons and the prominent flag are PRESENTATION, and live only here. */
const SECTION_ICONS: Record<Section, LucideIcon> = {
  charts: BarChart3,
  trending: TrendingUp,
  vote: Crown,
  updates: Bell,
  profile: User,
};

const SECTION_PROMINENT: Record<Section, boolean> = {
  charts: false,
  trending: false,
  vote: true,
  updates: false,
  profile: false,
};

export interface PublicSectionDefinition {
  id: Section;
  /**
   * Visible label. This is ALSO the source of the item's
   * aria-label, which is derived at render time — an accessible name
   * is never an independently editable design token.
   */
  label: string;
  Icon: LucideIcon;
  /**
   * The prominent item is RAISED and painted as a distinct bubble
   * instead of a plain icon + label. Declared here so the Navbar
   * does not re-derive it from the id.
   */
  prominent: boolean;
  /**
   * Hidden sections are resolved on the server but are NOT rendered in
   * the navbar. The content itself still exists — hiding a nav entry
   * never deletes a section implementation.
   */
  hidden: boolean;
}

/**
 * CANONICAL navigation, derived from the shared structural facts.
 *
 * This is the no-configuration result. Once structural config is
 * consumed (a later step), the effective order/labels come from
 * `resolvePublicNavigation` instead — this stays the fallback.
 */
export const PUBLIC_SECTIONS: readonly PublicSectionDefinition[] =
  PUBLIC_SECTION_IDS.map((id) => ({
    id,
    label: PUBLIC_SECTION_LABELS[id],
    Icon: SECTION_ICONS[id],
    prominent: SECTION_PROMINENT[id],
    hidden: false,
  }));

/** The section the public app opens on, when it is VISIBLE. */
export const DEFAULT_PUBLIC_SECTION: Section = 'vote';

/**
 * Combines resolved STRUCTURAL navigation (server-produced: id, label,
 * hidden) with the canonical PRESENTATION metadata held here
 * (icon, prominent).
 *
 * Only the label is taken from config. The icon and the prominent flag
 * are never configurable, so a reordered or renamed section still
 * renders exactly like the canonical one.
 *
 * FAIL-SAFE: an empty or unusable resolved list falls back to the full
 * canonical navigation, so the public bar can never render empty.
 */
export function buildPublicSections(
  resolved: readonly ResolvedPublicNavigationItem[]
): readonly PublicSectionDefinition[] {
  if (resolved.length === 0) return PUBLIC_SECTIONS;

  const built: PublicSectionDefinition[] = [];

  for (const item of resolved) {
    const presentation = PUBLIC_SECTIONS.find(
      (section) => section.id === item.id
    );

    // An id the client module does not know cannot be rendered.
    if (!presentation) continue;

    built.push({
      ...presentation,
      label: item.label,
      hidden: item.hidden,
    });
  }

  return built.length > 0 ? built : PUBLIC_SECTIONS;
}

/** The entries the navbar actually shows. */
export function visiblePublicSections(
  sections: readonly PublicSectionDefinition[]
): readonly PublicSectionDefinition[] {
  const visible = sections.filter((section) => !section.hidden);

  return visible.length > 0 ? visible : PUBLIC_SECTIONS;
}

/**
 * The section a freshly-mounted shell should open on.
 *
 * The preferred default is used ONLY when it is visible; otherwise the
 * first visible section in resolved order takes over. This is what
 * keeps `vote` from stranding the app when an admin hides it.
 */
export function initialPublicSection(
  visible: readonly PublicSectionDefinition[]
): Section {
  if (visible.length === 0) {
    return DEFAULT_PUBLIC_SECTION;
  }

  const preferred = visible.find(
    (section) => section.id === DEFAULT_PUBLIC_SECTION
  );

  return preferred?.id ?? visible[0]!.id;
}

/**
 * Keeps the active section pointing at something the user can SEE.
 *
 * Returns the current section when it is still visible, otherwise the
 * first visible one. There is no admin-selectable default: the rule is
 * always "first visible in configured order".
 */
export function resolveActiveSection(
  active: Section,
  visible: readonly PublicSectionDefinition[]
): Section {
  if (visible.length === 0) return DEFAULT_PUBLIC_SECTION;

  return visible.some((section) => section.id === active)
    ? active
    : visible[0]!.id;
}
