// DISCOVER THEME

// Visual design contract for the entire Discover section.
// MasterGUI owns the global palette.
// DiscoverGUI owns how those global tokens are used inside Discover.

const discoverTheme = {
  // COLORS

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

  // DISCOVER-SPECIFIC SEMANTIC TOKENS

  signal: 'var(--bora-text-subtle)',
  rank: 'var(--bora-text-muted)',
  title: 'var(--bora-text)',
  artist: 'var(--bora-text-muted)',
  metadata: 'var(--bora-text-subtle)',
  footer: 'var(--bora-text-subtle)',

  // CARDS

  card: {
    background: 'var(--bora-surface)',
    border: 'var(--bora-border)',
    borderStrong: 'var(--bora-border-strong)',
  },

  // LISTS

  list: {
    background: 'var(--bora-surface)',
    border: 'var(--bora-border)',

    // ROW BEHAVIOR
    rowBackground: 'transparent',
    rowHoverBackground: 'var(--bora-surface-elevated)',

    // ROW GEOMETRY
    rowPaddingY: '1.25rem',
    rowGap: '1rem',

    // RANK
    rankWidth: '1.25rem',
    rankSize: '9px',
    rankWeight: '500',

    // TITLE
    titleSize: '0.875rem',
    titleWeight: '900',
    titleTracking: '0.05em',
    titleLineHeight: '1.1',

    // ARTIST
    artistSize: '0.75rem',
    artistWeight: '500',
    artistTracking: '0.02em',

    // METADATA
    metadataSize: '8px',
    metadataWeight: '500',
    metadataTracking: '0.08em',

    // MOVEMENT
    movementSize: '8px',
    movementWeight: '700',
    movementTracking: '0.12em',

    // DIVIDER
    divider: 'var(--bora-border)',

    // INTERACTION
    transition: '300ms',
  },

  // TYPOGRAPHY

  typography: {
    display: 'var(--font-cinzel), serif',
    body: 'var(--font-inter), system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
  },

  // RADIUS

  radius: {
    card: '1rem',
    pill: '9999px',
  },

  // EFFECTS

  effects: {
    goldGlow: 'var(--bora-gold-glow)',
    redGlow: 'var(--bora-red-glow)',
  },
} as const;

export default discoverTheme;