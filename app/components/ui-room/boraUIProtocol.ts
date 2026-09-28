/*
 * BORA UI ROOM — EDITOR <-> PREVIEW PROTOCOL (Phase 1)
 *
 * Strict typed message protocol between the UI Room (parent window)
 * and the BoraUIBridge running inside the public preview (iframe).
 *
 * RULES:
 * 1. No `any`. Discriminated unions only.
 * 2. Every message carries `type` — validation happens in the bridge.
 * 3. The bridge is INERT until it receives `bora-ui:activate`.
 * 4. Nothing in this file imports admin code — the public side
 *    never depends on /admin/ui.
 */

import type { BoraUINavigationConfig } from '../workflow/publicSectionIds';

/** Property control kinds used by the BORA-native control system. */
export type BoraUIPropertyType =
  | 'color'
  | 'text'
  | 'number'
  | 'unit'
  | 'select'
  | 'toggle'
  | 'duration'
  | 'easing'
  | 'gradient';

/** One gradient colour stop. `color` may be a token reference. */
export interface BoraUIGradientStop {
  color: string;
  position: string;
}

/**
 * Gradient descriptor.
 *
 * `source` is the CANONICAL value — the exact gradient the public app
 * ships today, kept verbatim so the UI Room never rewrites token
 * references (e.g. `color-mix(in srgb, var(--bora-background-deep) …)`)
 * into flat colours.
 */
export interface BoraUIGradientSchema {
  source: string;
  stops: readonly BoraUIGradientStop[];
  angle?: number;
  shape?: 'circle' | 'ellipse';
  position?: string;
}

/** Select option for schema-driven controls. */
export interface BoraUIPropertyOption {
  value: string;
  label: string;
}

/**
 * One editable property of a target or a design token.
 * `token` links a property to a real CSS custom property
 * (design tokens). `cssProperty` links it to an inline style
 * applied to the target element in the preview.
 */
export interface BoraUIPropertySchema {
  id: string;
  label: string;
  type: BoraUIPropertyType;
  category: string;
  token?: string;
  cssProperty?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: readonly BoraUIPropertyOption[];
  /**
   * True when this property supports responsive values. Only these
   * properties use the Base / SM / MD / LG model.
   */
  responsive?: boolean;
  /**
   * Canonical per-breakpoint SOURCE values, mirroring what the
   * public component ships today. Computed style only describes the
   * CURRENT viewport, so per-breakpoint source must be declared.
   */
  responsiveSource?: Partial<Record<BoraUIBreakpoint, string>>;
  /** Present only for `type: 'gradient'`. */
  gradient?: BoraUIGradientSchema;
}

/** A real BORA UI target the editor can select. */
export interface BoraUITargetSchema {
  id: string;
  label: string;
  description: string;
  /** Value of the `data-bora-ui` attribute present in the public app. */
  attribute: string;
  properties: readonly BoraUIPropertySchema[];
}

/** Preview viewport presets. Same iframe, only its size changes. */
export type BoraUIViewport =
  | 'mobile'
  | 'sm'
  | 'tablet'
  | 'desktop';

/**
 * RESPONSIVE MODEL (mobile-first)
 *
 * `base` has no media query — it is the value below 640px. `sm`,
 * `md` and `lg` are min-width media queries. An OMITTED breakpoint
 * is not an empty value: it inherits the previous step, which is
 * exactly how the emitted CSS behaves (no rule = no override).
 */
export type BoraUIBreakpoint = 'base' | 'sm' | 'md' | 'lg';

export interface BoraUIBreakpointDefinition {
  id: BoraUIBreakpoint;
  label: string;
  /** Media query min-width, or null for the base step. */
  minWidth: number | null;
}

export const BORA_UI_BREAKPOINTS: readonly BoraUIBreakpointDefinition[] = [
  { id: 'base', label: 'Base', minWidth: null },
  { id: 'sm', label: 'SM', minWidth: 640 },
  { id: 'md', label: 'MD', minWidth: 768 },
  { id: 'lg', label: 'LG', minWidth: 1024 },
];

export function isBoraUIBreakpoint(
  value: string
): value is BoraUIBreakpoint {
  return BORA_UI_BREAKPOINTS.some(
    (breakpoint) => breakpoint.id === value
  );
}

/**
 * Responsive draft: targetId → propertyId → breakpoint → value.
 * A missing breakpoint key means INHERIT, never an empty value.
 */
export type BoraUIResponsiveDraft = Record<
  string,
  Record<string, Partial<Record<BoraUIBreakpoint, string>>>
>;

/** A target instance discovered inside the preview document. */
export interface BoraUIPreviewTarget {
  id: string;
  label: string;
  description: string;
  /** How many elements in the preview carry this target. */
  instances: number;
  /** Computed values the inspector uses as the SOURCE baseline. */
  computed: Record<string, string>;
}

/** Snapshot of the preview document, used as the draft baseline. */
export interface BoraUIPreviewState {
  targets: BoraUIPreviewTarget[];
  /** Current computed value of every registered design token. */
  tokens: Record<string, string>;
  /** Public section currently visible in the preview. */
  section: string | null;
  /** Actual preview width in px (useful for the responsive readout). */
  width: number;
}

/* ── EDITOR → PREVIEW ─────────────────────────────────────── */

export type BoraUIEditorMessage =
  | { type: 'bora-ui:activate' }
  | { type: 'bora-ui:deactivate' }
  | {
      type: 'bora-ui:apply-tokens';
      tokens: Record<string, string>;
    }
  | {
      type: 'bora-ui:apply-styles';
      targetId: string;
      styles: Record<string, string>;
    }
  | {
      type: 'bora-ui:apply-responsive';
      responsive: BoraUIResponsiveDraft;
    }
  | {
      type: 'bora-ui:apply-navigation';
      /**
       * The draft structural navigation. `null` means canonical.
       *
       * Sent whole, like the responsive draft, so clearing the block
       * REMOVES the preview override and the navbar returns to what
       * the public app resolved.
       */
      navigation: BoraUINavigationConfig | null;
    }
  | {
      type: 'bora-ui:select-target';
      targetId: string | null;
    }
  | {
      type: 'bora-ui:set-pick-mode';
      enabled: boolean;
    }
  | {
      type: 'bora-ui:viewport';
      viewport: BoraUIViewport;
    }
  | { type: 'bora-ui:reset-draft' }
  | { type: 'bora-ui:refresh-state' };

/* ── PREVIEW → EDITOR ─────────────────────────────────────── */

export type BoraUIPreviewMessage =
  | { type: 'bora-ui:ready' }
  | { type: 'bora-ui:state'; state: BoraUIPreviewState }
  | { type: 'bora-ui:hovered-target'; targetId: string | null }
  | { type: 'bora-ui:selected-target'; targetId: string | null }
  | { type: 'bora-ui:section-changed'; section: string };

/** Channel name — namespaced so it never collides with app messages. */
export const BORA_UI_CHANNEL = 'bora-ui';

const EDITOR_TYPES: readonly BoraUIEditorMessage['type'][] = [
  'bora-ui:activate',
  'bora-ui:deactivate',
  'bora-ui:apply-tokens',
  'bora-ui:apply-styles',
  'bora-ui:apply-responsive',
  'bora-ui:apply-navigation',
  'bora-ui:select-target',
  'bora-ui:set-pick-mode',
  'bora-ui:viewport',
  'bora-ui:reset-draft',
  'bora-ui:refresh-state',
];

const PREVIEW_TYPES: readonly BoraUIPreviewMessage['type'][] = [
  'bora-ui:ready',
  'bora-ui:state',
  'bora-ui:hovered-target',
  'bora-ui:selected-target',
  'bora-ui:section-changed',
];

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Narrow an unknown postMessage payload to a BORA editor message. */
export function isBoraUIEditorMessage(
  data: unknown
): data is BoraUIEditorMessage {
  if (!isRecord(data)) return false;

  const type = data.type;

  if (typeof type !== 'string') return false;

  if (!EDITOR_TYPES.includes(type as BoraUIEditorMessage['type'])) {
    return false;
  }

  // Payload guards — malformed messages are ignored by the bridge.
  if (type === 'bora-ui:apply-tokens') {
    return isRecord(data.tokens);
  }

  if (type === 'bora-ui:apply-styles') {
    return (
      typeof data.targetId === 'string' && isRecord(data.styles)
    );
  }

  if (type === 'bora-ui:apply-responsive') {
    return isRecord(data.responsive);
  }

  if (type === 'bora-ui:apply-navigation') {
    // null = canonical. Anything else must be an object; the bridge
    // normalizes it against the canonical ids before applying.
    return (
      data.navigation === null || isRecord(data.navigation)
    );
  }

  if (type === 'bora-ui:select-target') {
    return (
      data.targetId === null || typeof data.targetId === 'string'
    );
  }

  if (type === 'bora-ui:set-pick-mode') {
    return typeof data.enabled === 'boolean';
  }

  if (type === 'bora-ui:viewport') {
    return (
      data.viewport === 'mobile' ||
      data.viewport === 'sm' ||
      data.viewport === 'tablet' ||
      data.viewport === 'desktop'
    );
  }

  return true;
}

/** Narrow an unknown postMessage payload to a BORA preview message. */
export function isBoraUIPreviewMessage(
  data: unknown
): data is BoraUIPreviewMessage {
  if (!isRecord(data)) return false;

  const type = data.type;

  if (typeof type !== 'string') return false;

  return PREVIEW_TYPES.includes(type as BoraUIPreviewMessage['type']);
}
