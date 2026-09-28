/*
 * BORA TOKEN SPECIFICATION — SINGLE SOURCE OF TRUTH (Phase 2)
 *
 * Before this file, the BORA palette lived in THREE places:
 * globals.css :root, themes/black.ts and themes/white.ts, with
 * MasterGUI writing whichever theme object won at runtime.
 *
 * Now the values live HERE and nowhere else.
 *
 * PRESERVATION RULE: every value below is copied VERBATIM from the
 * previous sources. This is a token-authority refactor, not a visual
 * redesign. BORA Default and BORA Light must render identically.
 *
 * Groups:
 *   palette     — differs per curated palette (colour tokens)
 *   motion      — identical in every palette
 *   typography  — font roles + type scale, identical in every palette
 */

export type BoraPaletteId = 'bora-default' | 'bora-light';

export type BoraTokenGroup = 'palette' | 'motion' | 'typography';

export type BoraTokenKind =
  | 'color'
  | 'duration'
  | 'easing'
  | 'fontFamily'
  | 'scale';

export interface BoraTokenDefinition {
  /** CSS custom property name, including the leading `--`. */
  name: string;
  label: string;
  group: BoraTokenGroup;
  kind: BoraTokenKind;
  /** Palette-dependent tokens: one entry per palette id. */
  perPalette?: Partial<Record<BoraPaletteId, string>>;
  /** Palette-independent tokens. */
  shared?: string;
}

/* ── PALETTE TOKENS (from themes/black.ts + themes/white.ts) ── */

export const BORA_TOKEN_SPEC: readonly BoraTokenDefinition[] = [
  {
    name: '--bora-background',
    label: 'Background',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': '#050505',
      'bora-light': '#ffffff',
    },
  },
  {
    name: '--bora-background-deep',
    label: 'Background Deep',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': '#040404',
      'bora-light': '#f5f5f5',
    },
  },
  {
    name: '--bora-surface',
    label: 'Surface',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': '#090909',
      'bora-light': '#fafafa',
    },
  },
  {
    name: '--bora-surface-elevated',
    label: 'Surface Elevated',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': '#0c0c0c',
      'bora-light': '#f0f0f0',
    },
  },
  {
    name: '--bora-text',
    label: 'Text',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': '#ffffff',
      'bora-light': '#050505',
    },
  },
  {
    name: '--bora-text-muted',
    label: 'Text Muted',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': 'rgba(255,255,255,0.70)',
      'bora-light': 'rgba(5,5,5,0.70)',
    },
  },
  {
    name: '--bora-text-subtle',
    label: 'Text Subtle',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': 'rgba(255,255,255,0.30)',
      'bora-light': 'rgba(5,5,5,0.40)',
    },
  },
  {
    name: '--bora-border',
    label: 'Border',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': 'rgba(255,255,255,0.06)',
      'bora-light': 'rgba(5,5,5,0.08)',
    },
  },
  {
    name: '--bora-border-strong',
    label: 'Border Strong',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': 'rgba(255,255,255,0.14)',
      'bora-light': 'rgba(5,5,5,0.16)',
    },
  },
  {
    name: '--bora-gold',
    label: 'Gold',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': '#D4AF37',
      'bora-light': '#B8860B',
    },
  },
  {
    name: '--bora-red',
    label: 'Red',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': '#b91c1c',
      'bora-light': '#b91c1c',
    },
  },
  {
    name: '--bora-green',
    label: 'Green',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': '#22c55e',
      'bora-light': '#15803d',
    },
  },
  {
    name: '--bora-selection-background',
    label: 'Selection Background',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': '#D4AF37',
      'bora-light': '#B8860B',
    },
  },
  {
    name: '--bora-selection-text',
    label: 'Selection Text',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': '#050505',
      'bora-light': '#ffffff',
    },
  },
  {
    name: '--bora-gold-glow',
    label: 'Gold Glow',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': 'rgba(212,175,55,0.05)',
      'bora-light': 'rgba(184,134,11,0.08)',
    },
  },
  {
    name: '--bora-red-glow',
    label: 'Red Glow',
    group: 'palette',
    kind: 'color',
    perPalette: {
      'bora-default': 'rgba(185,28,28,0.05)',
      'bora-light': 'rgba(185,28,28,0.05)',
    },
  },

  /* ── MOTION (identical in every palette) ── */

  {
    name: '--bora-motion-fast',
    label: 'Motion Fast',
    group: 'motion',
    kind: 'duration',
    shared: '180ms',
  },
  {
    name: '--bora-motion-ui',
    label: 'Motion UI',
    group: 'motion',
    kind: 'duration',
    shared: '250ms',
  },
  {
    name: '--bora-motion-section',
    label: 'Motion Section',
    group: 'motion',
    kind: 'duration',
    shared: '350ms',
  },
  {
    name: '--bora-motion-ease',
    label: 'Motion Easing',
    group: 'motion',
    kind: 'easing',
    shared: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
];

/* ── TYPOGRAPHY: FONT ROLES ────────────────────────────────
 *
 * Only families the app can ACTUALLY render are offered.
 * app/layout.tsx loads exactly two via next/font localFont:
 *   Inter   (variable, opsz+wght 100-900)
 *   Cinzel  (variable, wght 400-900)
 * Everything else resolves through the system fallbacks that already
 * exist in globals.css. The unused static TTFs in app/fonts are NOT
 * loadable and are deliberately not offered.
 */

export const BORA_FONT_STACKS = {
  cinzel: 'var(--font-cinzel), serif',
  inter:
    'var(--font-inter), system-ui, -apple-system, sans-serif',
  systemUi: 'system-ui, -apple-system, sans-serif',
  systemSerif: 'serif',
  systemMono:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
} as const;

export type BoraFontStackId = keyof typeof BORA_FONT_STACKS;

export const BORA_FONT_OPTIONS: readonly {
  id: BoraFontStackId;
  label: string;
}[] = [
  { id: 'cinzel', label: 'Cinzel' },
  { id: 'inter', label: 'Inter' },
  { id: 'systemUi', label: 'System UI' },
  { id: 'systemSerif', label: 'System Serif' },
  { id: 'systemMono', label: 'System Mono' },
];

export const BORA_TYPOGRAPHY_TOKENS: readonly BoraTokenDefinition[] =
  [
    {
      name: '--bora-font-display',
      label: 'Display Font',
      group: 'typography',
      kind: 'fontFamily',
      shared: BORA_FONT_STACKS.cinzel,
    },
    {
      name: '--bora-font-body',
      label: 'Body Font',
      group: 'typography',
      kind: 'fontFamily',
      shared: BORA_FONT_STACKS.inter,
    },
    {
      name: '--bora-font-mono',
      label: 'Mono Font',
      group: 'typography',
      kind: 'fontFamily',
      shared: BORA_FONT_STACKS.systemMono,
    },
  ];

/* ── TYPOGRAPHY: TYPE SCALE ────────────────────────────────
 *
 * A semantic scale, NOT a root-font-size multiplier.
 *
 * Why: the frontend mixes ~400 arbitrary-pixel sizes (6px..110px)
 * with 143 rem-based Tailwind utilities. A root font-size change
 * would scale only the rem ones and break hierarchy. Instead every
 * step derives from ONE multiplier, and only typography that already
 * centralises its sizes (NewsTheme, DiscoverTheme) opts in.
 * The arbitrary-pixel classes stay untouched by design.
 */

export const BORA_TYPE_SCALE_STEPS = {
  '--bora-text-eyebrow': '7px',
  '--bora-text-meta': '8px',
  '--bora-text-label': '9px',
  '--bora-text-ui': '10px',
  '--bora-text-rank': '0.75rem',
  '--bora-text-body': '0.875rem',
  '--bora-text-subtitle': '1.125rem',
  '--bora-text-headline': '1.5rem',
  '--bora-text-title': '1.875rem',
  '--bora-text-title-lg': '2.25rem',
  '--bora-text-display': '3rem',
} as const;

export type BoraTypeScaleStep =
  keyof typeof BORA_TYPE_SCALE_STEPS;

export const BORA_TYPE_SCALE_TOKEN = '--bora-type-scale';
export const BORA_TYPE_SCALE_DEFAULT = '1';

export const BORA_TYPE_SCALE_TOKENS: readonly BoraTokenDefinition[] =
  [
    {
      name: BORA_TYPE_SCALE_TOKEN,
      label: 'Type Scale',
      group: 'typography',
      kind: 'scale',
      shared: BORA_TYPE_SCALE_DEFAULT,
    },
    ...Object.entries(BORA_TYPE_SCALE_STEPS).map(
      ([name, base]) => ({
        name,
        label: name
          .replace('--bora-text-', '')
          .replace(/-/g, ' '),
        group: 'typography' as const,
        kind: 'scale' as const,
        shared: `calc(${base} * var(${BORA_TYPE_SCALE_TOKEN}))`,
      })
    ),
  ];

/** Every BORA token, in one list. */
export const BORA_ALL_TOKENS: readonly BoraTokenDefinition[] = [
  ...BORA_TOKEN_SPEC,
  ...BORA_TYPOGRAPHY_TOKENS,
  ...BORA_TYPE_SCALE_TOKENS,
];

/** Value of one token inside one palette. */
export function boraTokenValue(
  token: BoraTokenDefinition,
  palette: BoraPaletteId
): string {
  if (token.perPalette) {
    return (
      token.perPalette[palette] ??
      token.perPalette['bora-default'] ??
      ''
    );
  }

  return token.shared ?? '';
}
