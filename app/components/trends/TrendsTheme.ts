// TRENDS THEME
// Visual design contract for the entire Trends section.
// MasterGUI owns the global palette.
// TrendsGUI owns how those global tokens are used inside Trends.

const trendsTheme = {
  // ─────────────────────────────────────────
  // COLORS
  // ─────────────────────────────────────────

  background: 'var(--bora-background)',
  backgroundDeep: 'var(--bora-background-deep)',

  surface: 'var(--bora-surface)',
  surfaceElevated: 'var(--bora-surface-elevated)',

  text: 'var(--bora-text)',
  textMuted: 'var(--bora-text-muted)',
  textSubtle: 'var(--bora-text-subtle)',

  border: 'var(--bora-border)',
  borderStrong: 'var(--bora-border-strong)',

  gold: 'var(--bora-gold)',
  red: 'var(--bora-red)',
  green: 'var(--bora-green)',

  goldGlow: 'var(--bora-gold-glow)',
  redGlow: 'var(--bora-red-glow)',

  // ─────────────────────────────────────────
  // TRENDS-SPECIFIC OPACITY
  // These preserve the existing Trends visual language.
  // ─────────────────────────────────────────

  signal: 'var(--bora-text-subtle)',
  rank: 'var(--bora-text-muted)',
  artist: 'var(--bora-text-muted)',
  movement: 'var(--bora-text-muted)',
  footer: 'var(--bora-text-subtle)',

  // ─────────────────────────────────────────
  // CARDS
  // ─────────────────────────────────────────

  card: {
    background: 'var(--bora-surface)',
    border: 'var(--bora-border)',
    borderStrong: 'var(--bora-border-strong)',
  },

  // ─────────────────────────────────────────
  // TYPOGRAPHY
  // ─────────────────────────────────────────

  typography: {
    display: 'var(--font-cinzel), serif',
    body: 'var(--font-inter), system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
  },

  // ─────────────────────────────────────────
  // RADIUS
  // ─────────────────────────────────────────

  radius: {
    card: '1rem',
    pill: '9999px',
  },

  // ─────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────

  effects: {
    goldGlow: 'var(--bora-gold-glow)',
    redGlow: 'var(--bora-red-glow)',
  },
} as const;

export default trendsTheme;