import {
  BORA_ALL_TOKENS,
  boraTokenValue,
  type BoraPaletteId,
} from './boraTokenSpec';

import { BORA_DEFAULT_PALETTE } from './boraPalettes';

/*
 * BORA TOKEN APPLIER (Phase 2)
 *
 * Pure data in, CSS out. Deliberately free of React so the same
 * function serves the server layout (first paint) and the client
 * (user theme preference). No circular dependencies: this module
 * depends only on the spec + palettes.
 */

export type BoraTokenMap = Record<string, string>;

/** Complete token map for a palette. */
export function boraTokensForPalette(
  palette: BoraPaletteId
): BoraTokenMap {
  const tokens: BoraTokenMap = {};

  for (const token of BORA_ALL_TOKENS) {
    tokens[token.name] = boraTokenValue(token, palette);
  }

  return tokens;
}

/** The default token map — BORA Default, as it was before. */
export function boraDefaultTokens(): BoraTokenMap {
  return boraTokensForPalette(BORA_DEFAULT_PALETTE);
}

/**
 * Serialises a token map into a `:root { … }` rule.
 * Used server-side so the first paint needs no JavaScript.
 */
export function boraTokensToCssText(tokens: BoraTokenMap): string {
  const body = Object.entries(tokens)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');

  return `:root {\n${body}\n}`;
}

/** Writes tokens as inline custom properties on an element. */
export function applyBoraTokensToElement(
  element: HTMLElement,
  tokens: BoraTokenMap
): void {
  for (const [name, value] of Object.entries(tokens)) {
    element.style.setProperty(name, value);
  }
}
