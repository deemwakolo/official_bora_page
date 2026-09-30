/*
 * BORA UI — EDITOR ORIGIN ALLOWLIST
 *
 * The bridge is an editing ENDPOINT, and it is reachable by any page
 * that can frame the public app. That makes its origin check a real
 * security boundary, not a formality: without it, ANY third-party page
 * could frame BORA and rewrite its styles.
 *
 * This module is the single place that decides WHO may drive the
 * bridge. It never widens by default — an origin is trusted only if
 * it is listed here, and every entry is an EXACT origin string.
 *
 * ALLOWED, in order:
 *   1. `window.location.origin` — the Admin UI Room, same origin.
 *      Existing behaviour is preserved unchanged.
 *   2. `app://designer` — the packaged BORA Designer (Electron).
 *      A custom app scheme: an arbitrary website cannot claim it.
 *   3. `NEXT_PUBLIC_BORA_UI_EDITOR_ORIGINS` — explicit, comma
 *      separated, exact-match opt-in for any other pairing (the
 *      transport-proof harness, a staging Designer, ...).
 *
 * DELIBERATELY NEVER ALLOWED:
 *   - `file://` and the opaque `null` origin. Chromium gives `file://`
 *     documents no dependable postMessage origin, and a packaged app
 *     must be IDENTIFIABLE, so Designer registers and loads from
 *     `app://` instead.
 *   - wildcards, prefixes or suffixes. `https://bora.example.evil.com`
 *     must never match a `https://bora.example.com` entry, so there is
 *     no substring or endsWith matching anywhere in this file.
 *   - anything not explicitly listed above. Unregistered origins stay
 *     rejected, in every build, including production.
 */

export const BORA_UI_EDITOR_ORIGINS_ENV =
  'NEXT_PUBLIC_BORA_UI_EDITOR_ORIGINS';

/** Custom scheme the packaged Designer registers and loads from. */
export const BORA_UI_DESIGNER_SCHEME = 'app';

export const BORA_UI_DESIGNER_HOST = 'designer';

/** The one stable, allowlistable origin every BORA Designer uses. */
export const BORA_UI_DESIGNER_ORIGIN = `${BORA_UI_DESIGNER_SCHEME}://${BORA_UI_DESIGNER_HOST}`;

/**
 * Rejected regardless of configuration. `null` is what Chromium reports
 * for opaque origins (sandboxed frames, `file://`), and the remaining
 * entries are non-origin or unusable transport targets.
 */
const FORBIDDEN_ORIGINS: readonly string[] = [
  'null',
  'file',
  'about',
  'data',
  'blob',
  'javascript',
];

/** scheme://host[:port] — port is numeric so no wildcard can be typed. */
const ORIGIN_PATTERN =
  /^([a-z][a-z0-9+.-]*):\/\/([a-z0-9._-]+|\[[0-9a-f:]+\])(?::(\d{1,5}))?$/;

/**
 * Canonicalises an origin to `scheme://host[:port]`, or returns null if
 * it is not a usable, trustworthy origin. Rejecting malformed input
 * here is what keeps a typo in configuration from silently becoming a
 * permissive rule.
 */
export function normalizeBoraUIEditorOrigin(
  value: string | null | undefined
): string | null {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const lowered = trimmed.toLowerCase();
  if (FORBIDDEN_ORIGINS.includes(lowered.split('://')[0])) return null;

  const match = ORIGIN_PATTERN.exec(lowered);
  if (!match) return null;

  const [, scheme, host, port] = match;

  return port ? `${scheme}://${host}:${port}` : `${scheme}://${host}`;
}

/** Extra origins declared via the public env var. Exact match only. */
function readConfiguredOrigins(): readonly string[] {
  const raw = process.env.NEXT_PUBLIC_BORA_UI_EDITOR_ORIGINS;
  if (!raw) return [];

  const origins: string[] = [];

  for (const entry of raw.split(',')) {
    const normalized = normalizeBoraUIEditorOrigin(entry);

    if (normalized) {
      origins.push(normalized);
      continue;
    }

    if (process.env.NODE_ENV !== 'production' && entry.trim()) {
      console.warn(
        `[bora-ui] ignoring untrusted ${BORA_UI_EDITOR_ORIGINS_ENV} entry: "${entry.trim()}"`
      );
    }
  }

  return origins;
}

/**
 * Origins the bridge may post to BEFORE any editor has identified
 * itself. Discovery is deliberately restricted to this small,
 * allowlisted set, and is only ever used for the `bora-ui:ready`
 * handshake.
 */
export function boraUIEditorBroadcastOrigins(): readonly string[] {
  const origins = new Set<string>();

  const self = normalizeBoraUIEditorOrigin(
    typeof window === 'undefined' ? null : window.location.origin
  );
  if (self) origins.add(self);

  origins.add(BORA_UI_DESIGNER_ORIGIN);

  for (const origin of readConfiguredOrigins()) {
    origins.add(origin);
  }

  return [...origins];
}

/**
 * The origin gate. Returns true only for a registered editor origin;
 * every other origin — including `null` and `file://` — is rejected.
 */
export function isBoraUIEditorOriginAllowed(
  origin: string | null | undefined
): boolean {
  const normalized = normalizeBoraUIEditorOrigin(origin);
  if (!normalized) return false;

  const self = normalizeBoraUIEditorOrigin(
    typeof window === 'undefined' ? null : window.location.origin
  );
  if (self && normalized === self) return true;

  if (normalized === BORA_UI_DESIGNER_ORIGIN) return true;

  return readConfiguredOrigins().includes(normalized);
}