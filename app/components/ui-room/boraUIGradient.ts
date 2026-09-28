/*
 * BORA UI ROOM — GRADIENT MODEL (Phase 2B, navbar surface only)
 *
 * A deliberately SMALL, structured model: type, angle, radial
 * shape/position, and ordered stops. It parses the exact CSS the app
 * ships (so token references like color-mix()/var() survive a round
 * trip) and serialises back to a CSS `background-image` value.
 *
 * No generic opacity control, no enable/disable: this is a gradient,
 * not a paint system.
 */

import type { BoraUIPropertySchema } from './boraUIProtocol';

export const BORA_NAVBAR_SURFACE_GRADIENT =
  'linear-gradient(to bottom, color-mix(in srgb, var(--bora-background-deep) 30%, transparent) 0%, color-mix(in srgb, var(--bora-background-deep) 65%, transparent) 55%, color-mix(in srgb, var(--bora-background-deep) 92%, transparent) 100%)';

  /* ── GRADIENT DEFINITIONS (Design System -> Gradients) ────
   *
   * A gradient definition belongs to the DESIGN SYSTEM, not to a
   * target. `targetId` records where the definition is applied
   * TODAY; the target inspector does not edit it.
   *
   * There is ONE authoritative definition per gradient, and ONE
   * draft entry (targetId + propertyId). Nothing is duplicated.
   */

export interface BoraUIGradientDefinition {
  id: string;
  label: string;
  description: string;
  /** Where this gradient is applied today. */
  targetId: string;
  property: BoraUIPropertySchema;
}

export const BORA_UI_GRADIENT_DEFINITIONS: readonly BoraUIGradientDefinition[] =
  [
    {
      id: 'nav-surface',
      label: 'Navbar Surface',
      description: 'Glass pill behind the navbar items.',
      targetId: 'public-navbar-surface',
      property: {
        id: 'nav-surface-gradient',
        label: 'Gradient',
        category: 'surface',
        type: 'gradient',
        // background-image, NOT the `background` shorthand: a longhand
        // override wins over the shorthand the component ships with,
        // and survives without touching the Navbar component.
        cssProperty: 'background-image',
        gradient: {
          // CANONICAL SOURCE — byte-identical to the gradient the
          // public app ships today, token references included.
          source: BORA_NAVBAR_SURFACE_GRADIENT,
          angle: 180,
          shape: 'ellipse',
          position: 'center',
          stops: [
            {
              color:
                'color-mix(in srgb, var(--bora-background-deep) 30%, transparent)',
              position: '0%',
            },
            {
              color:
                'color-mix(in srgb, var(--bora-background-deep) 65%, transparent)',
              position: '55%',
            },
            {
              color:
                'color-mix(in srgb, var(--bora-background-deep) 92%, transparent)',
              position: '100%',
            },
          ],
        },
      },
    },
  ];

/** Definitions applied to a given target, for draft resolution. */
export function boraGradientsForTarget(
  targetId: string
): readonly BoraUIPropertySchema[] {
  return BORA_UI_GRADIENT_DEFINITIONS.filter(
    (definition) => definition.targetId === targetId
  ).map((definition) => definition.property);
}

export type BoraGradientKind = 'linear' | 'radial';

export interface BoraGradientStop {
  color: string;
  position: string;
}

export interface BoraGradient {
  kind: BoraGradientKind;
  /** Degrees, 0 = to top, 90 = to right, 180 = to bottom. */
  angle: number;
  shape: 'circle' | 'ellipse';
  position: string;
  stops: BoraGradientStop[];
}

const DIRECTION_BY_ANGLE: Record<string, number> = {
  'to top': 0,
  'to top right': 45,
  'to right top': 45,
  'to right': 90,
  'to bottom right': 135,
  'to right bottom': 135,
  'to bottom': 180,
  'to bottom left': 225,
  'to left bottom': 225,
  'to left': 270,
  'to top left': 315,
  'to left top': 315,
};

/** Splits on commas that are NOT inside parentheses. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of input) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;

    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim().length > 0) parts.push(current.trim());

  return parts;
}

function parseStop(segment: string): BoraGradientStop | null {
  const match = segment
    .trim()
    .match(/^([\s\S]*?)(?:\s+(-?[\d.]+(?:px|%|em|rem)))?$/);

  if (!match?.[1]) return null;

  const color = match[1].trim();
  const position = match[2] ?? '';

  if (color.length === 0) return null;

  return { color, position };
}

/** Parses a CSS gradient. Returns null when it cannot be modelled. */
export function parseBoraGradient(
  css: string
): BoraGradient | null {
  const trimmed = css.trim();

  const linear = trimmed.match(/^linear-gradient\(([\s\S]*)\)$/i);
  const radial = trimmed.match(/^radial-gradient\(([\s\S]*)\)$/i);

  if (!linear && !radial) return null;

  const segments = splitTopLevel(
    (linear?.[1] ?? radial?.[1] ?? '') as string
  );

  if (segments.length === 0) return null;

  let angle = 180;
  let shape: 'circle' | 'ellipse' = 'ellipse';
  let position = 'center';
  const stops: BoraGradientStop[] = [];

  for (const segment of segments) {
    const lower = segment.toLowerCase();

    if (!linear) {
      const shapeMatch = lower.match(/^(circle|ellipse)\b/);

      if (shapeMatch?.[1]) {
        shape = shapeMatch[1] as 'circle' | 'ellipse';
        continue;
      }

      if (lower.startsWith('at ')) {
        position = segment.slice(3).trim();
        continue;
      }
    } else {
      const direction = DIRECTION_BY_ANGLE[lower];

      if (direction !== undefined) {
        angle = direction;
        continue;
      }

      if (/^-?[\d.]+deg$/.test(lower)) {
        angle = Number(lower.replace('deg', ''));
        continue;
      }
    }

    const stop = parseStop(segment);

    if (stop) stops.push(stop);
  }

  if (stops.length === 0) return null;

  return {
    kind: linear ? 'linear' : 'radial',
    angle,
    shape,
    position,
    stops,
  };
}

/** Serialises back to a CSS `background-image` value. */
export function serializeBoraGradient(
  gradient: BoraGradient
): string {
  const stops = gradient.stops
    .map((stop) =>
      stop.position.length > 0
        ? `${stop.color} ${stop.position}`
        : stop.color
    )
    .join(', ');

  if (gradient.kind === 'radial') {
    return `radial-gradient(${gradient.shape} at ${gradient.position}, ${stops})`;
  }

  return `linear-gradient(${gradient.angle}deg, ${stops})`;
}
