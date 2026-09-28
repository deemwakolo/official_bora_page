import type {
  BoraUIBreakpoint,
  BoraUIPropertySchema,
  BoraUITargetSchema,
} from './boraUIProtocol';

/*
 * BORA UI ROOM — TARGET REGISTRY (shared, Phase 1)
 *
 * Every target here points at a REAL element in the public app that
 * carries `data-bora-ui="<id>"` (instrumentation only — the attribute
 * is inert outside editor mode).
 *
 * Property schemas live here (not in admin code) because the bridge
 * needs them to read the SOURCE baseline from computed style, and the
 * UI Room needs them to render controls. One registry, no drift.
 */

export const BORA_UI_ATTRIBUTE = 'data-bora-ui';

/* ── PROPERTY FACTORIES (schema-driven, no per-field UI) ──── */

function color(
  id: string,
  label: string,
  category: string,
  cssProperty: string
): BoraUIPropertySchema {
  return { id, label, category, type: 'color', cssProperty };
}

function length(
  id: string,
  label: string,
  category: string,
  cssProperty: string,
  min: number,
  max: number,
  step: number,
  unit = 'px'
): BoraUIPropertySchema {
  return {
    id,
    label,
    category,
    type: 'unit',
    cssProperty,
    min,
    max,
    step,
    unit,
  };
}

/* ── TARGETS ──────────────────────────────────────────────── */

export const BORA_UI_TARGETS: readonly BoraUITargetSchema[] = [
  {
    id: 'public-page-shell',
    label: 'Page Shell',
    description: 'Wrapper of every public section.',
    attribute: 'public-page-shell',
    properties: [
      color('shell-bg', 'Background', 'surface', 'background-color'),
      color('shell-text', 'Text', 'typography', 'color'),
      length(
        'shell-pad-bottom',
        'Bottom Pad',
        'spacing',
        'padding-bottom',
        0,
        320,
        2
      ),
      length(
        'shell-min-height',
        'Min Height',
        'layout',
        'min-height',
        0,
        2400,
        20
      ),
    ],
  },
  {
    id: 'public-header',
    label: 'Masthead',
    description: 'Fixed public header surface.',
    attribute: 'public-header',
    properties: [
      color('header-bg', 'Surface', 'surface', 'background-color'),
      color('header-text', 'Text', 'typography', 'color'),
      length(
        'header-height',
        'Height',
        'layout',
        'min-height',
        20,
        320,
        2
      ),
    ],
  },
  {
    id: 'public-navbar',
    label: 'Navbar',
    description: 'Floating bottom navigation container.',
    attribute: 'public-navbar',
    properties: [
      length(
        'nav-pad-bottom',
        'Bottom Pad',
        'spacing',
        'padding-bottom',
        0,
        200,
        2
      ),
      // Bar height ships as `h-[56px] md:h-[60px]`, so it is declared
      // per-breakpoint. SM is deliberately absent: it inherits Base.
      responsiveText(
        'nav-bar-height',
        'Bar Height',
        'layout',
        'height',
        { base: '56px', md: '60px' }
      ),
    ],
  },
  {
    id: 'public-navbar-surface',
    label: 'Navbar Surface',
    description: 'Glass pill behind navbar items.',
    attribute: 'public-navbar-surface',
    properties: [
      color('nav-surface-bg', 'Surface', 'surface', 'background-color'),
      // REMOVED (Phase 2G audit): `nav-border` -> `border-top-color`.
      // The surface ships no border, so the control had nothing to
      // paint. Re-adding it means adding a real border first.
      length(
        'nav-surface-max-width',
        'Max Width',
        'layout',
        'max-width',
        240,
        1200,
        2
      ),
      length(
        'nav-radius',
        'Radius',
        'borders',
        'border-radius',
        0,
        60,
        1
      ),
      {
        id: 'nav-blur',
        label: 'Blur',
        category: 'effects',
        type: 'text',
        cssProperty: 'backdrop-filter',
      },
      // MOTION — hover/active feedback (`transition-all duration-300`).
      motionDuration('nav-item-duration', 'Duration'),
      motionEasing('nav-item-easing', 'Easing'),
    ],
  },
  {
    id: 'public-navbar-item',
    label: 'Navbar Item',
    description: 'One navbar destination.',
    attribute: 'public-navbar-item',
    properties: [
      color('nav-item-color', 'Color', 'typography', 'color'),
      length(
        'nav-item-radius',
        'Radius',
        'borders',
        'border-radius',
        0,
        40,
        1
      ),
      // Live: the button is `flex flex-col`, so row-gap separates the
      // icon box from the label.
      length('nav-item-gap', 'Gap', 'spacing', 'row-gap', 0, 40, 1),
      // MOVED (Phase 2G audit): `font-size` and `letter-spacing` were
      // declared here, but the button sets neither — the label span
      // does. Both controls were dead; they now live on
      // `public-navbar-label` as `nav-label-font` / `nav-label-tracking`.
    ],
  },
  {
    id: 'public-vote-hero',
    label: 'Vote Hero',
    description: 'Vote / top 10 chart section.',
    attribute: 'public-vote-hero',
    properties: [
      color('vote-bg', 'Background', 'surface', 'background-color'),
      color('vote-text', 'Text', 'typography', 'color'),
      length(
        'vote-pad-x',
        'Pad X',
        'spacing',
        'padding-left',
        0,
        200,
        2
      ),
    ],
  },
  {
    id: 'public-trending',
    label: 'Trending',
    description: 'Trending carousel section.',
    attribute: 'public-trending',
    properties: [
      color('trending-bg', 'Background', 'surface', 'background-color'),
      color('trending-text', 'Text', 'typography', 'color'),
      length(
        'trending-pad-x',
        'Pad X',
        'spacing',
        'padding-left',
        0,
        200,
        2
      ),
    ],
  },
  {
    id: 'public-charts',
    label: 'Charts',
    description: 'Moment charts section.',
    attribute: 'public-charts',
    properties: [
      color('charts-bg', 'Background', 'surface', 'background-color'),
      color('charts-text', 'Text', 'typography', 'color'),
      length(
        'charts-pad-x',
        'Pad X',
        'spacing',
        'padding-left',
        0,
        200,
        2
      ),
    ],
  },
  {
    id: 'public-updates',
    label: 'Updates',
    description: 'News / updates section.',
    attribute: 'public-updates',
    properties: [
      color('updates-bg', 'Background', 'surface', 'background-color'),
      color('updates-text', 'Text', 'typography', 'color'),
      length(
        'updates-pad-x',
        'Pad X',
        'spacing',
        'padding-left',
        0,
        200,
        2
      ),
    ],
  },
  {
    id: 'public-profile',
    label: 'Profile',
    description: 'Profile section.',
    attribute: 'public-profile',
    properties: [
      color('profile-bg', 'Background', 'surface', 'background-color'),
      color('profile-text', 'Text', 'typography', 'color'),
      length(
        'profile-pad-x',
        'Pad X',
        'spacing',
        'padding-left',
        0,
        200,
        2
      ),
    ],
  },
];

type Phase2AChild = {
  id: string;
  label: string;
  description: string;
  attribute: string;
  properties: readonly BoraUIPropertySchema[];
};

function child(
  id: string,
  label: string,
  description: string,
  properties: readonly BoraUIPropertySchema[] = []
): Phase2AChild {
  return { id, label, description, attribute: id, properties };
}

/**
 * Phase 2C PILOT — one responsive target.
 *
 * `public-chart-list` ships `px-1 sm:px-2`, so its canonical
 * per-breakpoint source is base 4px / SM 8px, with MD and LG
 * inherited. Those declared sources ARE the existing public
 * behaviour; nothing in the component changes.
 */
function responsiveLength(
  id: string,
  label: string,
  cssProperty: string,
  source: { base: string; sm: string }
): BoraUIPropertySchema {
  return {
    id,
    label,
    category: 'spacing',
    type: 'unit',
    cssProperty,
    responsive: true,
    responsiveSource: {
      base: source.base,
      sm: source.sm,
    },
    min: 0,
    max: 120,
    step: 2,
    unit: 'px',
  };
}

/**
 * Free-form responsive text property (track lists, CSS values).
 * Used when the public value is a literal string rather than a
 * number, and where a text field is the honest control.
 */
function responsiveText(
  id: string,
  label: string,
  category: string,
  cssProperty: string,
  source: Partial<Record<BoraUIBreakpoint, string>>
): BoraUIPropertySchema {
  return {
    id,
    label,
    category,
    type: 'text',
    cssProperty,
    responsive: true,
    // Omitted breakpoints are deliberately absent: they inherit.
    responsiveSource: source,
  };
}

import {
  motionDuration,
  motionEasing,
} from './boraUIMotion';

export const BORA_UI_CHILD_TARGETS: readonly Phase2AChild[] = [
  /* MASTHEAD */
  child('public-header-brand', 'Brand', 'BORA home brand link'),
  child('public-header-brand-text', 'Brand Text', 'BORA wordmark'),
  child('public-header-tagline', 'Tagline', 'Brand tagline'),
  child('public-header-visual', 'Header Visual', 'Mast visual layer'),
  child('public-header-live', 'Live Indicator', 'Live flicker signal'),

  /* NAVBAR */
  child(
    'public-navbar-icon',
    'Nav Icon',
    'Navbar destination icon',
    [
      // The box is `h-[25px] w-[25px]` and the glyph inside is
      // `h-full w-full`, so the box size IS the rendered icon size.
      length('nav-icon-width', 'Width', 'layout', 'width', 12, 48, 1),
      length('nav-icon-height', 'Height', 'layout', 'height', 12, 48, 1),
      motionDuration('nav-icon-duration', 'Duration'),
    ]
  ),
  child(
    'public-navbar-label',
    'Nav Label',
    'Navbar destination label',
    [
      // MOVED HERE (Phase 2G audit) from `public-navbar-item`, which
      // set neither property. The label span is what actually carries
      // `text-[9px]` / `text-[10px]` and `tracking-[0.02em]`, so both
      // controls are live here. Source reads 9px (the first label
      // instance); the vote label is 10px.
      length('nav-label-font', 'Font Size', 'typography', 'font-size', 6, 32, 1),
      length(
        'nav-label-tracking',
        'Tracking',
        'typography',
        'letter-spacing',
        -0.05,
        0.4,
        0.005,
        'em'
      ),
      motionDuration('nav-label-duration', 'Duration'),
    ]
  ),
  child(
    'public-navbar-vote',
    'Vote Button',
    'Vote/crown bubble',
    [
      // KNOWN LIMITATION: the component sizes this bubble per state
      // (42px idle, 46px active + `scale-105`). The UI Room pipeline
      // emits ONE selector per target, so these set the base diameter
      // for both states; the active state stays distinguishable via
      // its scale, glow and colour. Exposing the active/inactive PAIR
      // needs a state-scoped selector, which is schema-v2 work.
      length('nav-vote-width', 'Width', 'layout', 'width', 24, 96, 1),
      length('nav-vote-height', 'Height', 'layout', 'height', 24, 96, 1),
      motionDuration('nav-vote-duration', 'Duration'),
    ]
  ),

  /* VOTE HERO */
  child('public-vote-hero-content', 'Hero Content', 'Hero content wrapper'),
  child('public-vote-hero-list', 'Hero List', 'Song list wrapper'),
  child('public-vote-hero-row', 'Song Row', 'One song card', [
    motionDuration('hero-row-duration', 'Duration'),
  ]),
  child(
    'public-vote-hero-artwork',
    'Artwork',
    'Album artwork frame',
    [
      // Source uses `ease-out`, so easing is genuinely editable here.
      motionDuration('hero-artwork-duration', 'Duration'),
      motionEasing('hero-artwork-easing', 'Easing'),
    ]
  ),
  child('public-vote-hero-rank', 'Rank', 'Rank number on artwork', [
    motionDuration('hero-rank-duration', 'Duration'),
  ]),
  child('public-vote-hero-identity', 'Identity', 'Title + artist block'),
  child('public-vote-hero-title', 'Song Title', 'Song title', [
    motionDuration('hero-title-duration', 'Duration'),
  ]),
  child('public-vote-hero-artist', 'Artist', 'Artist name'),
  child('public-vote-hero-score', 'Power Score', 'Momentum score'),
  child(
    'public-vote-hero-score-compact',
    'Power Score Compact',
    'Momentum score (compact layout)'
  ),

  /* CHARTS */
  child('public-chart-header', 'Chart Header', 'Chart header block'),
  child('public-chart-title', 'Chart Title', 'Chart title'),
  child('public-chart-period', 'Chart Period', 'Period label'),
  child('public-chart-date', 'Chart Date', 'Chart date'),
  child('public-chart-body', 'Chart Body', 'Chart body wrapper'),
  child(
    'public-chart-list',
    'Chart List',
    'Ranked song list',
    [
      responsiveLength(
        'chart-list-pad-left',
        'Pad Left',
        'padding-left',
        { base: '4px', sm: '8px' }
      ),
      responsiveLength(
        'chart-list-pad-right',
        'Pad Right',
        'padding-right',
        { base: '4px', sm: '8px' }
      ),
    ]
  ),
  child('public-chart-list-label', 'List Label', 'List caption'),
  child('public-chart-row', 'Chart Row', 'One chart row', [
    motionDuration('chart-row-duration', 'Duration'),
  ]),
  child('public-chart-rank', 'Chart Rank', 'Rank number'),
  child('public-chart-artwork', 'Chart Artwork', 'Artwork frame'),
  child('public-chart-identity', 'Chart Identity', 'Title + artist block'),
  child('public-chart-song-title', 'Chart Song', 'Chart song title'),
  child('public-chart-song-artist', 'Chart Artist', 'Chart artist name'),
  child('public-chart-movement', 'Chart Movement', 'Rank movement'),

  /* CHARTS — Top performers (Phase 2C final pass) */
  child(
    'public-charts-performers',
    'Performers Section',
    'Top performers wrapper',
    [
      responsiveText(
        'performers-pad-left',
        'Pad Left',
        'spacing',
        'padding-left',
        { base: '12px', sm: '16px' }
      ),
      responsiveText(
        'performers-pad-right',
        'Pad Right',
        'spacing',
        'padding-right',
        { base: '12px', sm: '16px' }
      ),
    ]
  ),
  child(
    'public-charts-performers-grid',
    'Performers Grid',
    'Performer column layout',
    [
      responsiveText(
        'performers-grid-columns',
        'Columns',
        'layout',
        'grid-template-columns',
        {
          base: 'repeat(1, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
        }
      ),
    ]
  ),

  /* TRENDING */
  child('public-trending-carousel', 'Carousel', 'Trending carousel'),
  child('public-trending-slide', 'Slide', 'One platform slide'),
  child('public-trending-title', 'Slide Title', 'Slide title', [
    responsiveText(
      'trending-title-size',
      'Font Size',
      'typography',
      'font-size',
      { base: '1.5rem', md: '1.875rem' }
    ),
  ]),
  child('public-trending-signal', 'Slide Signal', 'Platform signal label'),
  child('public-trending-nav', 'Trending Nav', 'Slide navigation'),
  child('public-trending-nav-item', 'Trending Nav Item', 'Slide tab', [
    motionDuration('trending-nav-duration', 'Duration'),
  ]),
  child('public-trend-row', 'Trend Row', 'One trending row'),
  child('public-trend-rank', 'Trend Rank', 'Trending rank number'),
  child('public-trend-identity', 'Trend Identity', 'Title + artist block'),
  child('public-trend-title', 'Trend Title', 'Trending item title'),
  child('public-trend-artist', 'Trend Artist', 'Trending artist/source'),
  child('public-trend-movement', 'Trend Movement', 'Movement value'),

  /* UPDATES */
  child('public-updates-header', 'Updates Header', 'Section header'),
  child('public-updates-title', 'Updates Title', 'Section title'),
  child(
    'public-updates-grid',
    'Updates Grid',
    'Featured + feed layout',
    [
      {
        id: 'updates-grid-columns',
        label: 'Columns',
        category: 'layout',
        // CSS track list — free-form, hence the text control.
        type: 'text',
        cssProperty: 'grid-template-columns',
        responsive: true,
        // CANONICAL SOURCE = what the component ships today
        // (`grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]`).
        // SM and MD are deliberately absent: they inherit Base.
        responsiveSource: {
          base: 'repeat(1, minmax(0, 1fr))',
          lg: '1.4fr 1fr',
        },
      },
    ]
  ),
  child('public-update-featured', 'Featured Update', 'Featured story card'),
  child('public-update-featured-image', 'Featured Image', 'Featured artwork'),
  child('public-update-featured-hot', 'Featured Hot', 'Featured hot badge'),
  child('public-update-featured-index', 'Featured Index', 'Featured index'),
  child('public-update-featured-meta', 'Featured Meta', 'Category + time'),
  child('public-update-featured-category', 'Featured Category', 'Category'),
  child('public-update-featured-headline', 'Featured Headline', 'Headline'),
  child('public-update-featured-excerpt', 'Featured Excerpt', 'Excerpt'),
  child('public-update-featured-action', 'Featured Action', 'Read action', [
    motionDuration('update-featured-action-duration', 'Duration'),
  ]),
  child('public-update-feed-header', 'Feed Header', 'Feed header bar'),
  child('public-update-feed', 'Feed', 'Feed list'),
  child('public-update-row', 'Update Row', 'One feed row'),
  child('public-update-row-number', 'Row Number', 'Row index'),
  child('public-update-row-image', 'Row Image', 'Row artwork'),
  child('public-update-row-meta', 'Row Meta', 'Category + hot row'),
  child('public-update-row-category', 'Row Category', 'Row category'),
  child('public-update-row-hot', 'Row Hot', 'Row hot flag'),
  child('public-update-row-title', 'Row Title', 'Row headline', [
    motionDuration('update-row-title-duration', 'Duration'),
  ]),

  /* PROFILE */
  child('public-profile-header', 'Profile Header', 'Profile header block'),
  child(
    'public-profile-section',
    'Profile Section',
    'Profile padding wrapper',
    [
      responsiveText(
        'profile-section-pad-left',
        'Pad Left',
        'spacing',
        'padding-left',
        { base: '16px', md: '24px' }
      ),
      responsiveText(
        'profile-section-pad-right',
        'Pad Right',
        'spacing',
        'padding-right',
        { base: '16px', md: '24px' }
      ),
      responsiveText(
        'profile-section-pad-top',
        'Pad Top',
        'spacing',
        'padding-top',
        { base: '24px', md: '32px' }
      ),
    ]
  ),
  child('public-profile-avatar', 'Avatar', 'Profile avatar'),
  child('public-profile-name', 'Display Name', 'Profile name'),
  child('public-profile-handle', 'Handle', '@username'),
  child('public-profile-favorites', 'Favorites', 'Favorite artists block'),
  child('public-profile-favorite', 'Favorite', 'One favorite artist'),
  child('public-profile-metrics', 'Metrics', 'Fan metrics block'),
  child('public-profile-metric', 'Metric', 'One fan metric'),
  child('public-profile-tabs', 'Tabs', 'Profile tabs'),
  child('public-profile-tab', 'Tab', 'One profile tab', [
    motionDuration('profile-tab-duration', 'Duration'),
  ]),
  child('public-profile-songs', 'Songs', 'Songs list'),
  child('public-profile-song-row', 'Song Row', 'One song row'),
  child('public-profile-song-artwork', 'Song Artwork', 'Song artwork'),
  child('public-profile-song-identity', 'Song Identity', 'Title + artist'),
  child('public-profile-song-title', 'Song Title', 'Song title'),
  child('public-profile-song-artist', 'Song Artist', 'Song artist'),
  child('public-profile-artists', 'Artists', 'Artists grid'),
  child('public-profile-artist-card', 'Artist Card', 'One artist card'),
  child(
    'public-profile-artist-artwork',
    'Artist Artwork',
    'Artist photo'
  ),
];

export const BORA_UI_TARGET_IDS: readonly string[] = [
  ...BORA_UI_TARGETS.map((target) => target.id),
  ...BORA_UI_CHILD_TARGETS.map((target) => target.id),
];

/**
 * EVERY target the editor can discover — section-level and child.
 * The bridge uses this list to report instances, so Phase 2A child
 * targets are picked up without any bridge change.
 */
export const BORA_UI_ALL_TARGETS: readonly BoraUITargetSchema[] = [
  ...BORA_UI_TARGETS,
  ...BORA_UI_CHILD_TARGETS,
];

/** Lookup across section-level AND child targets. */
export function findBoraUITarget(
  id: string
): BoraUITargetSchema | undefined {
  return BORA_UI_ALL_TARGETS.find((target) => target.id === id);
}

/* ── VISIBILITY MODEL (architecture only, Phase 1) ───────── */

export type BoraUIVisibility = 'visible' | 'hidden' | 'conditional';

export interface BoraUIVisibilityEntry {
  targetId: string;
  label: string;
  /** Phase 1: every target stays visible. The model exists so a later
   *  phase can add real conditions without reshaping the registry. */
  visibility: BoraUIVisibility;
  note: string;
}

export const BORA_UI_VISIBILITY: readonly BoraUIVisibilityEntry[] =
  BORA_UI_TARGETS.map((target) => ({
    targetId: target.id,
    label: target.label,
    visibility: 'visible',
    note: 'Always rendered by the public app.',
  }));
