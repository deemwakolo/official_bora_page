import type { BoraTypeScaleStep } from '../components-themes/tokens/boraTokenSpec';

const t = (step: BoraTypeScaleStep) => `var(${step})`;

const newsTheme = {
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

  // NEWS SEMANTIC ROLES
  signal: 'var(--bora-text-subtle)',
  title: 'var(--bora-text)',
  metadata: 'var(--bora-text-subtle)',
  live: 'var(--bora-red)',
  footer: 'var(--bora-text-subtle)',

  // SECTION LAYOUT
  layout: {
    paddingX: '1rem',
    paddingY: '2rem',
    paddingXDesktop: '2rem',
    paddingYDesktop: '3rem',

    headerMarginBottom: '2rem',
    headerPaddingBottom: '1.25rem',

    contentGap: '1.5rem',
  },

  // HEADER
  header: {
    labelSize: t('--bora-text-label'),
    labelWeight: '900',
    labelTracking: '0.3em',

    titleSize: t('--bora-text-title'),
    titleSizeDesktop: t('--bora-text-title-lg'),
    titleWeight: '900',

    identifierSize: t('--bora-text-label'),
    identifierTracking: '0.18em',

    liveSize: t('--bora-text-meta'),
    liveTracking: '0.1em',
  },

  // FEATURED NEWS
  featured: {
    contentPadding: '1.25rem',
    contentPaddingDesktop: '1.75rem',

    metaMarginBottom: '1rem',
    excerptMarginTop: '1rem',
    actionMarginTop: '1.5rem',

    categorySize: t('--bora-text-label'),
    categoryWeight: '900',
    categoryTracking: '0.2em',

    timestampSize: t('--bora-text-meta'),
    timestampTracking: '0.1em',

    headlineSize: t('--bora-text-headline'),
    headlineSizeDesktop: t('--bora-text-title-lg'),
    headlineWeight: '900',
    headlineLineHeight: '1.05',

    excerptSize: t('--bora-text-body'),
    excerptLineHeight: '1.625',

    actionSize: '8px',
    actionWeight: '900',
    actionTracking: '0.2em',
  },

  // NEWS FEED
  feed: {
    headerMarginBottom: '1rem',
    headerPaddingBottom: '0.75rem',

    headerLabelSize: t('--bora-text-label'),
    headerLabelWeight: '900',
    headerLabelTracking: '0.25em',

    headerIdSize: t('--bora-text-meta'),
    headerIdTracking: '0.1em',

    rowGap: '1rem',
    rowPaddingY: '1.25rem',

    numberWidth: '1.25rem',
    numberSize: t('--bora-text-label'),

    imageWidth: '6rem',
    imageWidthDesktop: '8rem',
    imageHeight: '5rem',
    imageHeightDesktop: '6rem',

    metaMarginBottom: '0.5rem',

    categorySize: t('--bora-text-meta'),
    categoryWeight: '900',
    categoryTracking: '0.15em',

    hotSize: t('--bora-text-eyebrow'),
    hotWeight: '900',
    hotTracking: '0.1em',

    titleSize: t('--bora-text-body'),
    titleWeight: '900',
    titleTracking: '0.04em',
    titleLineHeight: '1.25',

    timestampMarginTop: '0.5rem',
    timestampSize: t('--bora-text-meta'),
    timestampTracking: '0.1em',

    transition: '300ms',
  },

  // CARDS
  card: {
    background: 'var(--bora-surface)',
    border: 'var(--bora-border)',
    borderStrong: 'var(--bora-border-strong)',
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

export default newsTheme;