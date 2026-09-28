import {
  BORA_ALL_TOKENS,
  boraTokenValue,
  type BoraPaletteId,
} from './boraTokenSpec';

/*
 * BORA PALETTES — CURATED PRESETS (Phase 2)
 *
 * Exactly two, both reproducing today's appearance:
 *   bora-default = the current black theme values
 *   bora-light   = the current white theme values
 *
 * NO custom palette builder, NO arbitrary combinations.
 * The list is intentionally an array so future curated palettes can
 * be added without touching the data model.
 *
 * IMPORTANT: the user theme (black/white toggle) is a VIEWER
 * PREFERENCE and lives outside the UI Room. It does not own these
 * values — it only selects which palette a viewer sees. The UI Room
 * edits the palette catalogue itself.
 */

export interface BoraPalette {
  id: BoraPaletteId;
  label: string;
  description: string;
  mode: 'dark' | 'light';
}

export const BORA_PALETTES: readonly BoraPalette[] = [
  {
    id: 'bora-default',
    label: 'BORA Default',
    description: 'The BORA black palette.',
    mode: 'dark',
  },
  {
    id: 'bora-light',
    label: 'BORA Light',
    description: 'The BORA white palette.',
    mode: 'light',
  },
];

export const BORA_DEFAULT_PALETTE: BoraPaletteId =
  'bora-default';

export function isBoraPaletteId(
  value: string
): value is BoraPaletteId {
  return BORA_PALETTES.some((palette) => palette.id === value);
}

export function findBoraPalette(
  id: string
): BoraPalette | undefined {
  return BORA_PALETTES.find((palette) => palette.id === id);
}

/**
 * Resolves a palette into a complete token map.
 *
 * This is what makes the UI Room palette control work with the
 * EXISTING protocol: the editor sends the full resolved map, and the
 * bridge already replaces the whole token draft. No protocol change.
 */
export function boraPaletteTokens(
  palette: BoraPaletteId
): Record<string, string> {
  const tokens: Record<string, string> = {};

  for (const token of BORA_ALL_TOKENS) {
    tokens[token.name] = boraTokenValue(token, palette);
  }

  return tokens;
}

/**
 * Infers which palette a set of live token values belongs to.
 *
 * Used by the UI Room to learn the preview's CURRENT source palette
 * (the user's black/white theme is a preference; the editor just
 * needs to know what it is looking at). Deterministic: it compares
 * the tokens that differ most between palettes.
 */
export function detectBoraPalette(
  tokens: Record<string, string>
): BoraPaletteId {
  const probes = [
    '--bora-background',
    '--bora-text',
    '--bora-gold',
    '--bora-surface',
  ] as const;

  for (const palette of BORA_PALETTES) {
    const expected = boraPaletteTokens(palette.id);
    const matches = probes.every(
      (name) =>
        tokens[name] === undefined ||
        tokens[name] === expected[name]
    );

    if (matches) return palette.id;
  }

  return BORA_DEFAULT_PALETTE;
}
