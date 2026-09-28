import type { BoraUIPropertySchema } from './boraUIProtocol';

import {
  BORA_FONT_OPTIONS,
  BORA_FONT_STACKS,
  BORA_TYPE_SCALE_DEFAULT,
  BORA_TYPE_SCALE_TOKEN,
  BORA_TOKEN_SPEC,
} from '../components-themes/tokens/boraTokenSpec';

/*
 * BORA UI ROOM — DESIGN TOKEN REGISTRY (shared, Phase 2)
 *
 * Values are NOT stored here: the bridge reads the real computed
 * value from the preview document, so the editor always compares
 * against the live source (including the user's theme).
 *
 * Since Phase 2 the token METADATA is derived from the single
 * source of truth (boraTokenSpec), so the UI Room can never drift
 * from the app's real tokens.
 */

export type BoraUITokenCategory =
  | 'colors'
  | 'surfaces'
  | 'borders'
  | 'motion'
  | 'typography'
  | 'spacing'
  | 'effects'
  | 'gradients';

export interface BoraUITokenGroup {
  category: BoraUITokenCategory;
  label: string;
  /** Phase 1: only groups with real tokens are editable. */
  status: 'active' | 'planned';
  note?: string;
}

export const BORA_UI_TOKEN_GROUPS: readonly BoraUITokenGroup[] = [
  {
    category: 'colors',
    label: 'Colors',
    status: 'active',
  },
  {
    category: 'surfaces',
    label: 'Surfaces',
    status: 'active',
  },
  {
    category: 'borders',
    label: 'Borders',
    status: 'active',
  },
  {
    category: 'motion',
    label: 'Motion',
    status: 'active',
  },
  {
    category: 'typography',
    label: 'Typography',
    status: 'active',
  },
  {
    category: 'spacing',
    label: 'Spacing',
    status: 'planned',
    note: 'No spacing scale tokens exist yet.',
  },
  {
    category: 'effects',
    label: 'Effects',
    status: 'planned',
    note: 'Only glow tokens exist today; blur/shadow tokens come later.',
  },
  {
    category: 'motion',
    label: 'Motion',
    status: 'active',
  },
  {
    category: 'gradients',
    label: 'Gradients',
    status: 'active',
  },
];

/**
 * Design System presentation order.
 *
 * Gradients render LAST, after the other groups, because they are
 * definitions rather than raw tokens.
 */
export const BORA_UI_GROUP_ORDER: readonly BoraUITokenCategory[] = [
  'colors',
  'surfaces',
  'borders',
  'typography',
  'spacing',
  'effects',
  'gradients',
  'motion',
];

function token(
  id: string,
  label: string,
  category: BoraUITokenCategory,
  name: string,
  type: BoraUIPropertySchema['type']
): BoraUIPropertySchema {
  return { id, label, category, token: name, type };
}

export const BORA_UI_TOKENS: readonly BoraUIPropertySchema[] = [
  /* COLORS */
  token('gold', 'Gold', 'colors', '--bora-gold', 'color'),
  token('red', 'Red', 'colors', '--bora-red', 'color'),
  token('green', 'Green', 'colors', '--bora-green', 'color'),
  token('text', 'Text', 'colors', '--bora-text', 'color'),
  token(
    'text-muted',
    'Text Muted',
    'colors',
    '--bora-text-muted',
    'color'
  ),
  token(
    'text-subtle',
    'Text Subtle',
    'colors',
    '--bora-text-subtle',
    'color'
  ),
  token(
    'selection-background',
    'Selection BG',
    'colors',
    '--bora-selection-background',
    'color'
  ),
  token(
    'selection-text',
    'Selection Text',
    'colors',
    '--bora-selection-text',
    'color'
  ),

  /* SURFACES */
  token(
    'background',
    'Background',
    'surfaces',
    '--bora-background',
    'color'
  ),
  token(
    'background-deep',
    'Background Deep',
    'surfaces',
    '--bora-background-deep',
    'color'
  ),
  token(
    'surface',
    'Surface',
    'surfaces',
    '--bora-surface',
    'color'
  ),
  token(
    'surface-elevated',
    'Surface Elevated',
    'surfaces',
    '--bora-surface-elevated',
    'color'
  ),

  /* BORDERS */
  token('border', 'Border', 'borders', '--bora-border', 'color'),
  token(
    'border-strong',
    'Border Strong',
    'borders',
    '--bora-border-strong',
    'color'
  ),

  /* MOTION */
  token(
    'motion-fast',
    'Fast',
    'motion',
    '--bora-motion-fast',
    'duration'
  ),
  token(
    'motion-ui',
    'UI',
    'motion',
    '--bora-motion-ui',
    'duration'
  ),
  token(
    'motion-section',
    'Section',
    'motion',
    '--bora-motion-section',
    'duration'
  ),
  {
    id: 'motion-ease',
    label: 'Easing',
    category: 'motion',
    token: '--bora-motion-ease',
    type: 'easing',
    options: [
      {
        value: 'cubic-bezier(0.22, 1, 0.36, 1)',
        label: 'BORA',
      },
      { value: 'ease', label: 'Ease' },
      { value: 'linear', label: 'Linear' },
      { value: 'ease-in-out', label: 'In Out' },
    ],
  },
];

/* ── TYPOGRAPHY (Phase 2) ───────────────────────────────────
 *
 * Global font roles + the type-scale multiplier. These are BORA
 * design-system controls, NOT user preferences.
 *
 * The font options are exactly the families the app can render
 * today (see BORA_FONT_OPTIONS in boraTokenSpec) — the unused
 * static TTFs in app/fonts are not loadable and are not offered.
 */

export const BORA_UI_TYPOGRAPHY_TOKENS: readonly BoraUIPropertySchema[] =
  [
    {
      id: 'font-display',
      label: 'Display Font',
      category: 'typography',
      token: '--bora-font-display',
      type: 'select',
      options: BORA_FONT_OPTIONS.map((option) => ({
        value: BORA_FONT_STACKS[option.id],
        label: option.label,
      })),
    },
    {
      id: 'font-body',
      label: 'Body Font',
      category: 'typography',
      token: '--bora-font-body',
      type: 'select',
      options: BORA_FONT_OPTIONS.map((option) => ({
        value: BORA_FONT_STACKS[option.id],
        label: option.label,
      })),
    },
    {
      id: 'font-mono',
      label: 'Mono Font',
      category: 'typography',
      token: '--bora-font-mono',
      type: 'select',
      options: BORA_FONT_OPTIONS.map((option) => ({
        value: BORA_FONT_STACKS[option.id],
        label: option.label,
      })),
    },
    {
      id: 'type-scale',
      label: 'Type Scale',
      category: 'typography',
      token: BORA_TYPE_SCALE_TOKEN,
      type: 'number',
      min: 0.8,
      max: 1.6,
      step: 0.05,
    },
  ];

/** Value the type scale starts at — identical rendering to Phase 1. */
export const BORA_UI_TYPE_SCALE_DEFAULT = BORA_TYPE_SCALE_DEFAULT;

/** Every token the bridge must report a source value for. */
export const BORA_UI_TOKEN_NAMES: readonly string[] = [
  ...BORA_TOKEN_SPEC.map((token) => token.name),
  ...BORA_UI_TYPOGRAPHY_TOKENS.map(
    (token) => token.token ?? ''
  ),
].filter((name) => name.length > 0);
