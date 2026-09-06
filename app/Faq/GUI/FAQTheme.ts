const faqTheme = {
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

  selectionBackground: 'var(--bora-selection-background)',
  selectionText: 'var(--bora-selection-text)',

  typography: {
    display: 'var(--font-cinzel), serif',
    body: 'var(--font-inter), system-ui, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
  },

  layout: {
    paddingTop: '4rem',
    paddingBottom: '5rem',
    paddingX: '1.5rem',
    maxWidth: '72rem',
    headerMarginBottom: '4rem',
    contentGap: '4rem',
  },

  header: {
    lineWidth: '3rem',
    labelSize: '10px',
    labelTracking: '0.5em',
    titleSize: '3rem',
    titleSizeDesktop: '6rem',
    titleTracking: '-0.05em',
  },

  faq: {
    rowGap: '0.5rem',
    rowPaddingY: '2rem',
    numberSize: '10px',
    questionSize: '0.875rem',
    questionSizeDesktop: '1.125rem',
    questionTracking: '0.1em',
    answerSize: '0.75rem',
    answerSizeDesktop: '0.875rem',
    answerLineHeight: '1.625',
    answerPaddingLeft: '2.5rem',
    answerPaddingRight: '1.5rem',
    answerBorderWidth: '2px',
    answerMarginLeft: '10px',
    answerMarginBottom: '2rem',
    transition: '500ms',
  },

  credits: {
    padding: '2rem',
    border: 'var(--bora-border-strong)',
    background: 'color-mix(in srgb, var(--bora-surface) 60%, transparent)',
    rowGap: '1.25rem',
    rowPaddingBottom: '0.5rem',
    roleSize: '9px',
    nameSize: '11px',
    titleSize: '10px',
    titleTracking: '0.3em',
  },

  status: {
    labelSize: '10px',
    labelTracking: '0.2em',
    descriptionSize: '10px',
    border: 'var(--bora-border-strong)',
  },

  radius: {
    card: '0',
    pill: '9999px',
  },

  effects: {
    goldGlow: 'var(--bora-gold-glow)',
    redGlow: 'var(--bora-red-glow)',
  },
} as const;

export default faqTheme;