import type {
  BoraUIBreakpoint,
  BoraUIPropertySchema,
  BoraUITargetSchema,
  BoraUIViewport,
} from '../../../components/ui-room/boraUIProtocol';

import type { BoraUIVisibility } from '../../../components/ui-room/boraUITarget';

import type { BoraPaletteId } from '../../../components/components-themes/tokens/boraTokenSpec';

import type { BoraUINavigationConfig } from '../../../components/workflow/publicSectionIds';

export type {
  BoraUIBreakpoint,
  BoraUIPropertySchema,
  BoraUITargetSchema,
  BoraUIViewport,
  BoraUIVisibility,
};

/*
 * BORA UI ROOM — EDITOR TYPES (Phase 1)
 *
 * The editor keeps three distinct layers, exactly like the brief:
 *
 *   SOURCE  → read from the live preview (computed values)
 *   DRAFT   → what the admin has changed in this session
 *   LIVE    → what the preview is currently showing (source + draft)
 *
 * Nothing here talks to Supabase. Persistence is an abstraction
 * (UIConfigStore) so a later phase can add a backend without the
 * editor knowing.
 */

/** Top-level areas of the UI Room (brief §7). */
export type UIRoomArea =
  | 'design-system'
  | 'navigation'
  | 'components'
  | 'responsive'
  | 'visibility';

/** Draft map for design tokens: token name → value. */
export type UITokenDraft = Record<string, string>;

/** Draft map for targets: targetId → cssProperty → value. */
export type UITargetDraft = Record<string, Record<string, string>>;

/**
 * Responsive draft: targetId → propertyId → breakpoint → value.
 * A missing breakpoint INHERITS the previous step; it is never an
 * empty CSS value.
 */
export type UIResponsiveDraft = Record<
  string,
  Record<string, Partial<Record<BoraUIBreakpoint, string>>>
>;

/** Everything the editor can change. This is the save payload. */
export interface UIDraftSnapshot {
  /** Curated BORA palette currently applied in the preview. */
  paletteId: BoraPaletteId;
  /** Per-token overrides on top of the palette. */
  tokens: UITokenDraft;
  targets: UITargetDraft;
  /** Base / SM / MD / LG overrides. */
  responsive: UIResponsiveDraft;
  /**
   * STRUCTURAL navigation overrides (schema v2+).
   *
   * Optional, and delta-only: absent or empty means canonical
   * navigation. This is deliberately NOT a `data-bora-ui` target and
   * not a CSS property — it is consumed as data by the public
   * navigation resolver.
   */
  navigation?: BoraUINavigationConfig;
}

/** A single entry in the undo/redo history. */
export interface UIDraftHistoryEntry {
  label: string;
  snapshot: UIDraftSnapshot;
}

export type UISaveStatus =
  | 'clean'
  | 'draft'
  | 'saving'
  | 'saved'
  | 'error';

/** A row rendered by the inspector. */
export interface UIPropertyRow {
  property: BoraUIPropertySchema;
  /** Live value (source or draft). */
  value: string;
  /** True value from the preview, before any draft. */
  source: string;
  dirty: boolean;
}

/**
 * PERSISTENCE ABSTRACTION (brief §17).
 *
 * Phase 1 ships an in-memory implementation only. A later phase can
 * provide a Supabase-backed implementation of the same interface
 * without the editor changing.
 */
export interface UIConfigStore {
  /** Last committed draft, or null if nothing was ever saved. */
  get(): UIDraftSnapshot | null;
  /** Commit a draft. Resolves when the write completes. */
  save(snapshot: UIDraftSnapshot): Promise<void>;
  /** Drop the committed draft. */
  reset(): Promise<void>;
  /** Human-readable name of the backing store. */
  readonly label: string;
}
