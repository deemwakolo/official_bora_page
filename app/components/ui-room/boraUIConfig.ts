import { BORA_UI_ALL_TARGETS } from './boraUITarget';

import {
  BORA_UI_BREAKPOINTS,
  type BoraUIBreakpoint,
} from './boraUIProtocol';

import {
  BORA_ALL_TOKENS,
  type BoraPaletteId,
} from '../components-themes/tokens/boraTokenSpec';

import { boraGradientsForTarget } from './boraUIGradient';

import {
  isNavigationConfigEmpty,
  normalizePublicNavigationConfig,
  type BoraUINavigationConfig,
} from '../workflow/publicSectionIds';

/*
 * BORA UI ROOM — PERSISTED CONFIG (Phase 2F, model (c))
 *
 * Storage model (c): a checked-in FILE is the baseline; a Supabase
 * row is the runtime OVERRIDE. If the override is missing, invalid
 * or unreachable, the public site renders the file baseline.
 *
 * SAFETY RULES encoded here:
 *  1. Only properties that EXIST in the registry can be persisted.
 *     An obsolete/unknown entry is dropped, not applied.
 *  2. Every value must be a non-empty string.
 *  3. Emitted CSS is scoped and `!important`, so committed config
 *     wins over component styles deterministically.
 *  4. Nothing is emitted when the config is empty — an empty config
 *     is completely inert.
 *
 * PURE module: no fs, no Supabase, no React.
 */

/**
 * Schema v2 adds the optional `navigation` block (structural
 * navigation: order / hidden / labels).
 *
 * v2 is additive and BACKWARD COMPATIBLE: `navigation` is optional,
 * so a v1 config normalizes to exactly the same tokens / targets /
 * responsive output it always did. A v1 payload is still valid
 * input, not merely legacy.
 *
 * No database migration is required: `ui_room_config.config` is
 * `jsonb` and the save RPC takes the version as a parameter.
 */
export const BORA_UI_CONFIG_SCHEMA_VERSION = 2;

/** The single persisted shape. Mirrors the draft, plus metadata. */
export interface BoraUIConfig {
  schemaVersion: number;
  /** null = use the default palette. */
  paletteId: BoraPaletteId | null;
  tokens: Record<string, string>;
  targets: Record<string, Record<string, string>>;
  responsive: Record<
    string,
    Record<string, Partial<Record<BoraUIBreakpoint, string>>>
  >;
  /**
   * Structural navigation overrides (schema v2+).
   *
   * OPTIONAL and delta-only: absent means "canonical", which is what
   * every v1 config means. This block emits NO CSS — it is consumed
   * as DATA by the public navigation resolver.
   */
  navigation?: BoraUINavigationConfig;
  updatedAt?: string;
  updatedBy?: string;
}

export const EMPTY_BORA_UI_CONFIG: BoraUIConfig = {
  schemaVersion: BORA_UI_CONFIG_SCHEMA_VERSION,
  paletteId: null,
  tokens: {},
  targets: {},
  responsive: {},
};

export function isBoraUIConfigEmpty(config: BoraUIConfig): boolean {
  return (
    config.paletteId === null &&
    Object.keys(config.tokens).length === 0 &&
    Object.keys(config.targets).length === 0 &&
    Object.keys(config.responsive).length === 0 &&
    isNavigationConfigEmpty(config.navigation)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const KNOWN_TOKENS = new Set(
  BORA_ALL_TOKENS.map((token) => token.name)
);

const KNOWN_BREAKPOINTS = new Set<string>(
  BORA_UI_BREAKPOINTS.map((breakpoint) => breakpoint.id)
);

/** Registered property ids + their CSS property, per target. */
export function knownPropertiesForTarget(
  targetId: string
): Map<string, string> {
  const map = new Map<string, string>();

  const target = BORA_UI_ALL_TARGETS.find(
    (entry) => entry.id === targetId
  );

  if (!target) return map;

  for (const property of target.properties) {
    if (property.cssProperty) {
      map.set(property.id, property.cssProperty);
    }
  }

  for (const property of boraGradientsForTarget(targetId)) {
    if (property.cssProperty) {
      map.set(property.id, property.cssProperty);
    }
  }

  return map;
}

/**
 * Coerces an arbitrary value into a valid config.
 * Unknown targets / properties / tokens / breakpoints are DROPPED.
 */
export function normalizeBoraUIConfig(
  input: unknown,
  warnings: string[] = []
): BoraUIConfig {
  if (!isRecord(input)) {
    if (input !== undefined) {
      warnings.push('config is not an object');
    }

    return { ...EMPTY_BORA_UI_CONFIG };
  }

  const config: BoraUIConfig = {
    schemaVersion: BORA_UI_CONFIG_SCHEMA_VERSION,
    paletteId: null,
    tokens: {},
    targets: {},
    responsive: {},
  };

  if (typeof input.updatedAt === 'string') {
    config.updatedAt = input.updatedAt;
  }

  if (typeof input.updatedBy === 'string') {
    config.updatedBy = input.updatedBy;
  }

  if (
    input.paletteId === 'bora-default' ||
    input.paletteId === 'bora-light'
  ) {
    config.paletteId = input.paletteId;
  } else if (input.paletteId !== null) {
    warnings.push('unknown paletteId dropped');
  }

  if (isRecord(input.tokens)) {
    for (const [name, value] of Object.entries(input.tokens)) {
      if (!KNOWN_TOKENS.has(name)) {
        warnings.push(`unknown token dropped: ${name}`);
        continue;
      }

      if (typeof value !== 'string' || value.length === 0) {
        warnings.push(`bad token value dropped: ${name}`);
        continue;
      }

      config.tokens[name] = value;
    }
  }

  if (isRecord(input.targets)) {
    for (const [targetId, properties] of Object.entries(
      input.targets
    )) {
      if (!isRecord(properties)) continue;

      const known = knownPropertiesForTarget(targetId);

      if (known.size === 0) {
        warnings.push(`unknown target dropped: ${targetId}`);
        continue;
      }

      const accepted: Record<string, string> = {};

      for (const [propertyId, value] of Object.entries(properties)) {
        if (!known.has(propertyId)) {
          warnings.push(
            `unknown property dropped: ${targetId}.${propertyId}`
          );
          continue;
        }

        if (typeof value !== 'string' || value.length === 0) {
          warnings.push(
            `bad property value dropped: ${targetId}.${propertyId}`
          );
          continue;
        }

        accepted[propertyId] = value;
      }

      if (Object.keys(accepted).length > 0) {
        config.targets[targetId] = accepted;
      }
    }
  }

  if (isRecord(input.responsive)) {
    for (const [targetId, properties] of Object.entries(
      input.responsive
    )) {
      if (!isRecord(properties)) continue;

      const known = knownPropertiesForTarget(targetId);

      if (known.size === 0) {
        warnings.push(`unknown target dropped: ${targetId}`);
        continue;
      }

      const accepted: BoraUIConfig['responsive'][string] = {};

      for (const [propertyId, byBreakpoint] of Object.entries(
        properties
      )) {
        if (
          !known.has(propertyId) ||
          !isRecord(byBreakpoint)
        ) {
          warnings.push(
            `unknown responsive property dropped: ${targetId}.${propertyId}`
          );
          continue;
        }

        const steps: Partial<Record<BoraUIBreakpoint, string>> = {};

        for (const [breakpoint, value] of Object.entries(
          byBreakpoint
        )) {
          if (!KNOWN_BREAKPOINTS.has(breakpoint)) {
            warnings.push(`unknown breakpoint dropped: ${breakpoint}`);
            continue;
          }

          // An empty value means INHERIT, represented by absence.
          if (typeof value !== 'string' || value.length === 0) {
            continue;
          }

          steps[breakpoint as BoraUIBreakpoint] = value;
        }

        if (Object.keys(steps).length > 0) {
          accepted[propertyId] = steps;
        }
      }

      if (Object.keys(accepted).length > 0) {
        config.responsive[targetId] = accepted;
      }
    }
  }

  // NAVIGATION (schema v2+, optional).
  //
  // Structural, not visual: `order` / `hidden` / `labels` are data
  // consumed by the public navigation resolver and emit no CSS. An
  // absent or unusable block leaves `config.navigation` undefined,
  // which means "canonical navigation" — identical to v1 behaviour.
  if (input.navigation !== undefined) {
    const navigation = normalizePublicNavigationConfig(
      input.navigation,
      warnings
    );

    if (navigation) config.navigation = navigation;
  }

  return config;
}

/**
 * Renders a config as CSS text for the public runtime.
 * Returns '' for an empty config, so nothing is injected at all.
 *
 * Order is deterministic: palette + tokens first, then target
 * overrides, then base responsive rules, then wider breakpoints
 * (later rules win, which is exactly the sparse-inheritance model).
 */
export function boraUIConfigToCss(config: BoraUIConfig): string {
  if (isBoraUIConfigEmpty(config)) return '';

  const lines: string[] = [];

  // 1. PALETTE (committed palette becomes the base)
  if (config.paletteId) {
    for (const token of BORA_ALL_TOKENS) {
      const value =
        token.perPalette?.[config.paletteId] ?? token.shared;

      if (value) lines.push(`  ${token.name}: ${value};`);
    }
  }

  // 2. TOKEN OVERRIDES
  for (const [name, value] of Object.entries(config.tokens)) {
    lines.push(`  ${name}: ${value};`);
  }

  if (lines.length > 0) {
    lines.unshift(':root {', '}');
    lines.push('');
  }

  // 3. TARGET OVERRIDES
  for (const [targetId, properties] of Object.entries(
    config.targets
  )) {
    const known = knownPropertiesForTarget(targetId);
    const selector = `[data-bora-ui="${targetId}"]`;

    for (const [propertyId, value] of Object.entries(properties)) {
      const cssProperty = known.get(propertyId);

      if (!cssProperty) continue;

      lines.push(
        `${selector} { ${cssProperty}: ${value} !important; }`
      );
    }
  }

  // 4. RESPONSIVE (base first, then each breakpoint in order)
  for (const [targetId, properties] of Object.entries(
    config.responsive
  )) {
    const known = knownPropertiesForTarget(targetId);
    const selector = `[data-bora-ui="${targetId}"]`;

    for (const breakpoint of BORA_UI_BREAKPOINTS) {
      const declarations: string[] = [];

      for (const [propertyId, steps] of Object.entries(properties)) {
        const cssProperty = known.get(propertyId);
        const value = steps[breakpoint.id];

        if (!cssProperty || !value) continue;

        declarations.push(`${cssProperty}: ${value} !important;`);
      }

      if (declarations.length === 0) continue;

      if (breakpoint.minWidth === null) {
        lines.push(`${selector} { ${declarations.join(' ')} }`);
        continue;
      }

      lines.push(
        `@media (min-width: ${breakpoint.minWidth}px) { ${selector} { ${declarations.join(
          ' '
        )} } }`
      );
    }
  }

  return lines.join('\n');
}
