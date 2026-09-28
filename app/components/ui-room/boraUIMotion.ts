import type {
  BoraUIPropertyOption,
  BoraUIPropertySchema,
} from './boraUIProtocol';

/*
 * BORA UI ROOM — MOTION MODEL (Phase 2D)
 *
 * Discipline mirrors boraUIGradient.ts: one shared, typed definition
 * used by BOTH the registry and the inspector, so a motion control
 * can never disagree with its canonical source.
 *
 * SCOPE — deliberately narrow, and every item is deterministic:
 *   • transition-duration
 *   • transition-timing-function
 *   plus the global motion tokens (--bora-motion-*), which already
 *   drive `bora-section-transition` and the whole BORA rhythm.
 *
 * NOT MODELLED HERE (see the Phase 2D audit):
 *   • @keyframes definitions (chart rise/fall, tap popup)
 *   • scroll-interpolated motion (masthead --bora-hp)
 *   • carousel / swipe / spring / Framer Motion choreography
 *   • prefers-reduced-motion policy
 * Those need structured or behavioural models, not scalars, and are
 * intentionally left as source-only behaviour.
 */

export type BoraUIMotionKind = 'duration' | 'easing';

/**
 * Canonical easings already present in the BORA public source.
 * `bora` comes from --bora-motion-ease (globals.css).
 * `tailwind` is the default shipped by Tailwind's transition-* utils.
 */
export const BORA_UI_EASINGS: readonly BoraUIPropertyOption[] = [
  {
    value: 'cubic-bezier(0.22, 1, 0.36, 1)',
    label: 'Bora',
  },
  {
    value: 'cubic-bezier(0.4, 0, 0.2, 1)',
    label: 'Standard',
  },
  { value: 'ease', label: 'Ease' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In Out' },
  { value: 'linear', label: 'Linear' },
];

/** The easing Tailwind's `transition-*` utilities apply by default. */
export const TAILWIND_TRANSITION_EASING =
  'cubic-bezier(0.4, 0, 0.2, 1)';

/**
 * transition-duration for a target.
 *
 * NO declared source: unlike gradients (where computed style
 * destroys token references), the browser reports the true
 * effective duration, so the bridge's computed value IS the source
 * the inspector shows until the admin edits it.
 */
export function motionDuration(
  id: string,
  label: string
): BoraUIPropertySchema {
  return {
    id,
    label,
    category: 'motion',
    type: 'duration',
    cssProperty: 'transition-duration',
  };
}

/** transition-timing-function for a target. */
export function motionEasing(
  id: string,
  label: string
): BoraUIPropertySchema {
  return {
    id,
    label,
    category: 'motion',
    type: 'easing',
    cssProperty: 'transition-timing-function',
    options: BORA_UI_EASINGS,
  };
}

/** True when a property is part of the Motion surface. */
export function isMotionProperty(
  property: BoraUIPropertySchema
): boolean {
  return property.category === 'motion';
}
