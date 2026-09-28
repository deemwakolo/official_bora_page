'use client';

import { useEffect } from 'react';

import {
  BORA_UI_BREAKPOINTS,
  isBoraUIEditorMessage,
  type BoraUIResponsiveDraft,
  type BoraUIPreviewState,
  type BoraUIPreviewTarget,
} from './boraUIProtocol';

import {
  BORA_UI_ALL_TARGETS,
  BORA_UI_ATTRIBUTE,
} from './boraUITarget';

import { BORA_UI_TOKEN_NAMES } from './boraUITokens';

/*
 * Section detection uses the SERVER-SAFE id module, not the
 * lucide-bearing publicSections.ts: the bridge needs only the id type
 * guard, and this keeps the client bundle honest about the same
 * server/client boundary the config resolver relies on.
 */
import {
  isPublicSectionId,
  normalizePublicNavigationConfig,
  resolvePublicNavigation,
} from '../workflow/publicSectionIds';

/*
 * BORA UI ROOM BRIDGE (Phase 1)
 *
 * Renders NOTHING. It is mounted once in the root layout and stays
 * completely inert until the UI Room (parent window) sends
 * `bora-ui:activate` over the typed protocol.
 *
 * Outside editor mode it adds no DOM, no styles, no listeners that
 * change behaviour — the public app is untouched.
 *
 * RESPONSIBILITIES (only while active):
 *   1. draft design-token overrides  -> injected :root{...!important}
 *   2. draft target styles           -> inline styles on [data-bora-ui]
 *   3. pick mode                     -> hover highlight + click select
 *   4. state report                  -> targets, computed values, section
 *
 * WHY `!important`: MasterGUI writes the same tokens as INLINE styles
 * from the user theme. An injected author rule cannot beat an inline
 * style, so drafts must be `!important` to be visible. This is also
 * what keeps the user theme a USER preference: it still drives the
 * source values, drafts only sit on top of them in the preview.
 */

const DRAFT_STYLE_ID = 'bora-ui-draft-style';
const RESPONSIVE_STYLE_ID = 'bora-ui-responsive-style';
const OVERLAY_CLASS = 'bora-ui-overlay';

type CssPropertyMap = Record<string, string>;

interface BridgeState {
  active: boolean;
  pickMode: boolean;
  selectedTargetId: string | null;
  hoveredTargetId: string | null;
  tokenDraft: Record<string, string>;
  styleDraft: Record<string, CssPropertyMap>;
  /** Base / SM / MD / LG overrides, applied via a scoped stylesheet. */
  responsiveDraft: BoraUIResponsiveDraft;
  /** targetId -> css properties currently overridden in the preview. */
  appliedProps: Record<string, string[]>;
  /** element -> previous inline values, so drafts can be undone. */
  backups: Map<Element, CssPropertyMap>;
  overlays: HTMLElement[];
  styleEl: HTMLStyleElement | null;
  responsiveStyleEl: HTMLStyleElement | null;
  section: string | null;
}

const bridge: BridgeState = {
  active: false,
  pickMode: false,
  selectedTargetId: null,
  hoveredTargetId: null,
  tokenDraft: {},
  styleDraft: {},
  responsiveDraft: {},
  appliedProps: {},
  backups: new Map(),
  overlays: [],
  styleEl: null,
  responsiveStyleEl: null,
  section: null,
};

/* ── COMMUNICATION ────────────────────────────────────────── */

function post(message: unknown) {
  if (window.parent === window) return;

  window.parent.postMessage(message, window.location.origin);
}

/**
 * Reads the CURRENT preview state from the live document.
 * Callers are responsible for lifting drafts first when they need
 * true source values.
 */
function collectState(): BoraUIPreviewState {
  const targets: BoraUIPreviewTarget[] = [];

  // Section-level AND Phase 2A child targets, so every instrumented
  // element becomes discoverable without a second targeting system.
  for (const target of BORA_UI_ALL_TARGETS) {
    const selector = `[${BORA_UI_ATTRIBUTE}="${target.id}"]`;
    const elements = Array.from(
      document.querySelectorAll(selector)
    );

    if (elements.length === 0) continue;

    const computed: CssPropertyMap = {};

    for (const property of target.properties) {
      if (!property.cssProperty) continue;

      const style = window.getComputedStyle(elements[0]);
      computed[property.id] = style
        .getPropertyValue(property.cssProperty)
        .trim();
    }

    targets.push({
      id: target.id,
      label: target.label,
      description: target.description,
      instances: elements.length,
      computed,
    });
  }

  const tokens: Record<string, string> = {};
  const rootStyle = window.getComputedStyle(
    document.documentElement
  );

  for (const name of BORA_UI_TOKEN_NAMES) {
    tokens[name] = rootStyle.getPropertyValue(name).trim();
  }

  return {
    targets,
    tokens,
    section: bridge.section,
    width: window.innerWidth,
  };
}

/* ── TOKEN DRAFT (CSS VARIABLE OVERRIDES) ─────────────────── */

function ensureStyleElement() {
  if (bridge.styleEl?.isConnected) return bridge.styleEl;

  const existing = document.getElementById(
    DRAFT_STYLE_ID
  ) as HTMLStyleElement | null;

  if (existing) {
    bridge.styleEl = existing;
    return existing;
  }

  const styleEl = document.createElement('style');
  styleEl.id = DRAFT_STYLE_ID;

  document.head.appendChild(styleEl);
  bridge.styleEl = styleEl;

  return styleEl;
}

function renderTokenDraft() {
  const styleEl = ensureStyleElement();

  const names = Object.keys(bridge.tokenDraft);

  if (names.length === 0) {
    styleEl.textContent = '';
    return;
  }

  const declarations = names
    .map((name) => {
      const value = bridge.tokenDraft[name];

      if (value === undefined || value === '') return '';

      return `  ${name}: ${value} !important;`;
    })
    .filter((line) => line.length > 0)
    .join('\n');

  styleEl.textContent = `:root {\n${declarations}\n}`;
}

/* ── RESPONSIVE DRAFT (SCOPED STYLESHEET) ──────────────────
 *
 * Responsive values CANNOT use inline styles: inline has no
 * media-query story. Instead the bridge writes ONE stylesheet into
 * the preview document:
 *
 *   [data-bora-ui="x"] { padding-left: 4px !important }
 *   @media (min-width: 640px) { [data-bora-ui="x"] { ... } }
 *
 * Deterministic precedence:
 *  - `!important` in an author stylesheet beats the component's own
 *    inline style and Tailwind classes.
 *  - Only EXPLICIT breakpoints emit a rule, so an omitted step
 *    inherits the previous one (mobile-first).
 *  - The rules live in <head>, so a React re-render that rewrites an
 *    element's inline style cannot erase them.
 */

function ensureResponsiveStyleElement() {
  const existing = document.getElementById(
    RESPONSIVE_STYLE_ID
  ) as HTMLStyleElement | null;

  if (existing) {
    bridge.responsiveStyleEl = existing;
    return existing;
  }

  const styleEl = document.createElement('style');
  styleEl.id = RESPONSIVE_STYLE_ID;

  document.head.appendChild(styleEl);
  bridge.responsiveStyleEl = styleEl;

  return styleEl;
}

function renderResponsiveDraft() {
  const targets = Object.keys(bridge.responsiveDraft);

  if (targets.length === 0) {
    if (bridge.responsiveStyleEl) {
      bridge.responsiveStyleEl.textContent = '';
      bridge.responsiveStyleEl.remove();
      bridge.responsiveStyleEl = null;
    }

    return;
  }

  const base: string[] = [];
  const byBreakpoint = new Map<string, string[]>();

  for (const targetId of targets) {
    const properties = bridge.responsiveDraft[targetId];

    for (const propertyId of Object.keys(properties)) {
      const byBreakpointValue =
        properties[propertyId] ?? {};

      const target = BORA_UI_ALL_TARGETS.find(
        (entry) => entry.id === targetId
      );

      const cssProperty = target?.properties.find(
        (property) => property.id === propertyId
      )?.cssProperty;

      if (!cssProperty) continue;

      const selector = `[${BORA_UI_ATTRIBUTE}="${targetId}"]`;

      for (const breakpoint of BORA_UI_BREAKPOINTS) {
        const value = byBreakpointValue[breakpoint.id];

        // Omitted breakpoint = INHERIT = emit nothing.
        if (value === undefined || value === '') continue;

        const declaration =
          `${selector} { ${cssProperty}: ${value} !important; }`;

        if (breakpoint.minWidth === null) {
          base.push(declaration);
          continue;
        }

        const bucket = byBreakpoint.get(breakpoint.id) ?? [];

        bucket.push(declaration);
        byBreakpoint.set(breakpoint.id, bucket);
      }
    }
  }

  const media: string[] = [];

  for (const breakpoint of BORA_UI_BREAKPOINTS) {
    if (breakpoint.minWidth === null) continue;

    const bucket = byBreakpoint.get(breakpoint.id);

    if (!bucket || bucket.length === 0) continue;

    media.push(
      `@media (min-width: ${breakpoint.minWidth}px) {\n  ${bucket.join(
        '\n  '
      )}\n}`
    );
  }

  const styleEl = ensureResponsiveStyleElement();

  styleEl.textContent = [...base, ...media].join('\n');
}

function resetResponsiveDraft() {
  bridge.responsiveDraft = {};

  if (bridge.responsiveStyleEl) {
    bridge.responsiveStyleEl.textContent = '';
    bridge.responsiveStyleEl.remove();
    bridge.responsiveStyleEl = null;
  }
}

/* ── TARGET STYLE DRAFT (INLINE OVERRIDES) ────────────────── */

function backupProperty(
  element: Element,
  cssProperty: string
) {
  let backup = bridge.backups.get(element);

  if (!backup) {
    backup = {};
    bridge.backups.set(element, backup);
  }

  if (!(cssProperty in backup)) {
    const inline = (element as HTMLElement).style;
    backup[cssProperty] = inline.getPropertyValue(cssProperty);
  }
}

function restoreProperty(
  element: Element,
  cssProperty: string
) {
  const backup = bridge.backups.get(element);

  if (!backup) return;

  const inline = (element as HTMLElement).style;
  const previous = backup[cssProperty];

  if (previous) {
    inline.setProperty(cssProperty, previous);
  } else {
    inline.removeProperty(cssProperty);
  }
}

/**
 * Applies a target's draft styles.
 *
 * REPLACE semantics: the message is the target's whole draft, not a
 * patch. Properties that were overridden but are no longer in the
 * draft are restored to their source value — this is what makes
 * Reset / Undo / Discard actually revert in the preview.
 */
function applyTargetStyles(targetId: string) {
  const draft = bridge.styleDraft[targetId] ?? {};
  const previouslyApplied =
    bridge.appliedProps[targetId] ?? [];
  const nextProps = Object.keys(draft);

  const elements = Array.from(
    document.querySelectorAll(
      `[${BORA_UI_ATTRIBUTE}="${targetId}"]`
    )
  );

  // 1. RESTORE properties dropped from the draft
  for (const cssProperty of previouslyApplied) {
    if (nextProps.includes(cssProperty)) continue;

    for (const element of elements) {
      restoreProperty(element, cssProperty);
    }
  }

  // 2. APPLY the current draft
  for (const element of elements) {
    const inline = (element as HTMLElement).style;

    for (const cssProperty of nextProps) {
      backupProperty(element, cssProperty);

      const value = draft[cssProperty];

      if (value === '' || value === undefined) {
        inline.removeProperty(cssProperty);
      } else {
        inline.setProperty(cssProperty, value);
      }
    }
  }

  bridge.appliedProps[targetId] = nextProps;
}

/**
 * Re-applies every target draft.
 *
 * Needed because React re-applies the component's own inline style on
 * re-render (e.g. a public section switch), and the navbar surface
 * ships its gradient via the `background` SHORTHAND — which resets
 * `background-image` and would silently drop an active draft.
 */
function reapplyTargetDrafts() {
  for (const targetId of Object.keys(bridge.styleDraft)) {
    applyTargetStyles(targetId);
  }
}

function restoreTargetStyles() {
  for (const [element, backup] of bridge.backups) {
    const inline = (element as HTMLElement).style;

    for (const cssProperty of Object.keys(backup)) {
      const previous = backup[cssProperty];

      if (previous) {
        inline.setProperty(cssProperty, previous);
      } else {
        inline.removeProperty(cssProperty);
      }
    }
  }

  bridge.backups.clear();
  bridge.styleDraft = {};
  bridge.appliedProps = {};
}

/**
 * Posts the SOURCE state: drafts are lifted for the duration of the
 * read, then restored. The editor needs real source values to know
 * what "dirty" means.
 */
function postSourceState() {
  const styleEl = bridge.styleEl;
  const savedCssText = styleEl ? styleEl.textContent : null;
  const savedStyleDraft = bridge.styleDraft;
  const savedBackups = bridge.backups;

  // 1. LIFT token draft
  if (styleEl) styleEl.textContent = '';

  // 2. LIFT inline target drafts
  for (const [element, backup] of savedBackups) {
    const inline = (element as HTMLElement).style;

    for (const cssProperty of Object.keys(backup)) {
      const previous = backup[cssProperty];

      if (previous) {
        inline.setProperty(cssProperty, previous);
      } else {
        inline.removeProperty(cssProperty);
      }
    }
  }

  bridge.styleDraft = {};

  // 3. READ the true source state
  const state = collectState();

  // 4. RESTORE drafts
  bridge.styleDraft = savedStyleDraft;
  bridge.backups = savedBackups;

  if (styleEl && savedCssText) styleEl.textContent = savedCssText;

  for (const targetId of Object.keys(savedStyleDraft)) {
    applyTargetStyles(targetId);
  }

  post({ type: 'bora-ui:state', state });
}

/* ── OVERLAYS (selection highlight) ───────────────────────── */

function clearOverlays() {
  for (const overlay of bridge.overlays) {
    overlay.remove();
  }

  bridge.overlays = [];
}

function drawOverlay(
  element: Element,
  variant: 'hovered' | 'selected',
  label?: string
) {
  const rect = element.getBoundingClientRect();
  const isSelected = variant === 'selected';
  const overlay = document.createElement('div');

  overlay.setAttribute('data-bora-ui-overlay', variant);

  const border = isSelected
    ? 'var(--bora-gold)'
    : 'color-mix(in srgb, var(--bora-gold) 50%, transparent)';

  const shadow = isSelected
    ? '0 0 18px var(--bora-gold-glow)'
    : '0 0 10px var(--bora-gold-glow)';

  overlay.style.cssText = [
    'position:fixed',
    `left:${rect.left}px`,
    `top:${rect.top}px`,
    `width:${rect.width}px`,
    `height:${rect.height}px`,
    'pointer-events:none',
    'z-index:2147483000',
    `border:1px solid ${border}`,
    isSelected ? '' : 'border-style:dashed',
    `box-shadow:${shadow}`,
  ]
    .filter(Boolean)
    .join(';');

  if (label) {
    const tag = document.createElement('span');
    tag.textContent = label;
    tag.style.cssText = [
      'position:absolute',
      'top:-16px',
      'left:0',
      'padding:1px 5px',
      'white-space:nowrap',
      'font:700 8px/1.4 ui-monospace,monospace',
      'letter-spacing:0.14em',
      'text-transform:uppercase',
      'background:var(--bora-gold)',
      'color:var(--bora-selection-text)',
    ].join(';');

    overlay.appendChild(tag);
  }

  document.body.appendChild(overlay);
  bridge.overlays.push(overlay);
}

function drawTarget(
  targetId: string,
  variant: 'hovered' | 'selected'
) {
  const target = BORA_UI_ALL_TARGETS.find(
    (entry) => entry.id === targetId
  );

  const elements = Array.from(
    document.querySelectorAll(
      `[${BORA_UI_ATTRIBUTE}="${targetId}"]`
    )
  );

  elements.forEach((element, index) => {
    drawOverlay(
      element,
      variant,
      variant === 'selected' && index === 0
        ? (target?.label ?? targetId)
        : undefined
    );
  });
}

function drawOverlays() {
  clearOverlays();

  if (!bridge.active) return;

  if (
    bridge.hoveredTargetId &&
    bridge.hoveredTargetId !== bridge.selectedTargetId
  ) {
    drawTarget(bridge.hoveredTargetId, 'hovered');
  }

  if (bridge.selectedTargetId) {
    drawTarget(bridge.selectedTargetId, 'selected');
  }
}

let redrawFrame = 0;

function scheduleRedraw() {
  if (redrawFrame) return;

  redrawFrame = window.requestAnimationFrame(() => {
    redrawFrame = 0;
    drawOverlays();
  });
}

/* ── PICK MODE ────────────────────────────────────────────── */

function findTargetElement(event: Event): HTMLElement | null {
  const target = event.target;

  if (!(target instanceof Element)) return null;

  return target.closest(
    `[${BORA_UI_ATTRIBUTE}]`
  ) as HTMLElement | null;
}

function onPointerMove(event: Event) {
  const element = findTargetElement(event);
  const targetId =
    element?.getAttribute(BORA_UI_ATTRIBUTE) ?? null;

  if (targetId === bridge.hoveredTargetId) return;

  bridge.hoveredTargetId = targetId;
  drawOverlays();

  post({ type: 'bora-ui:hovered-target', targetId });
}

function onPickClick(event: Event) {
  // Swallow the click so picking never triggers real app behaviour.
  event.preventDefault();
  event.stopPropagation();

  const element = findTargetElement(event);

  bridge.selectedTargetId =
    element?.getAttribute(BORA_UI_ATTRIBUTE) ?? null;
  bridge.hoveredTargetId = null;
  drawOverlays();

  post({
    type: 'bora-ui:selected-target',
    targetId: bridge.selectedTargetId,
  });
}

/* ── NAVIGATION DRAFT (structural) ──────────────────────────
 *
 * Order / visibility / labels are NOT CSS and NOT `data-bora-ui`
 * targets, so they cannot ride the style pipeline. The bridge applies
 * them to the real navbar nodes instead, and — like every other draft
 * layer — restores the original markup when the draft is cleared.
 *
 * This is preview-only. It never persists anything and never runs
 * outside editor mode.
 */

const SECTION_ATTRIBUTE = 'data-bora-section';
const NAV_LABEL_SELECTOR = '[data-bora-ui="public-navbar-label"]';

interface NavBackup {
  /** Buttons in their ORIGINAL DOM order. */
  order: HTMLElement[];
  /** Original aria-label per section id. */
  ariaLabels: Record<string, string | null>;
  /** Original label text per section id. */
  labelTexts: Record<string, string | null>;
}

let navBackup: NavBackup | null = null;

function navButtons(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(
      `[${SECTION_ATTRIBUTE}]`
    )
  );
}

function restoreNavigation() {
  if (!navBackup) return;

  const { order, ariaLabels, labelTexts } = navBackup;

  // Undo visibility first, then re-append in the original order.
  for (const element of order) {
    element.removeAttribute('hidden');
  }

  for (const element of order) {
    const parent = element.parentElement;

    if (parent) parent.appendChild(element);
  }

  for (const element of order) {
    const id = element.getAttribute(SECTION_ATTRIBUTE);

    if (!id) continue;

    const aria = ariaLabels[id];

    if (aria === null || aria === undefined) {
      element.removeAttribute('aria-label');
    } else {
      element.setAttribute('aria-label', aria);
    }

    const text = labelTexts[id];
    const label = element.querySelector(NAV_LABEL_SELECTOR);

    if (label) label.textContent = text ?? '';
  }

  navBackup = null;
}

function applyNavigation(config: unknown) {
  // Normalize against the canonical ids first: the preview never
  // trusts an arbitrary payload arriving from the editor window.
  const resolved = resolvePublicNavigation(
    normalizePublicNavigationConfig(config)
  );

  const buttons = navButtons();

  if (buttons.length === 0) return;

  if (!navBackup) {
    navBackup = { order: buttons, ariaLabels: {}, labelTexts: {} };

    for (const element of buttons) {
      const id = element.getAttribute(SECTION_ATTRIBUTE);

      if (!id) continue;

      navBackup.ariaLabels[id] =
        element.getAttribute('aria-label');

      const label = element.querySelector(NAV_LABEL_SELECTOR);

      navBackup.labelTexts[id] = label
        ? label.textContent
        : null;
    }
  }

  const byId = new Map<string, HTMLElement>();

  for (const element of buttons) {
    const id = element.getAttribute(SECTION_ATTRIBUTE);

    if (id) byId.set(id, element);
  }

  // 1. VISIBILITY + LABEL, per section.
  for (const item of resolved) {
    const element = byId.get(item.id);

    if (!element) continue;

    if (item.hidden) {
      element.setAttribute('hidden', '');
    } else {
      element.removeAttribute('hidden');
    }

    // The accessible name follows the visible label, exactly as the
    // public app renders it. Internal identity stays in
    // data-bora-section and is never derived from this text.
    element.setAttribute('aria-label', item.label);

    const label = element.querySelector(NAV_LABEL_SELECTOR);

    if (label) label.textContent = item.label;
  }

  // 2. ORDER — re-appending in resolved order reorders the row.
  const parent = buttons[0]?.parentElement;

  if (!parent) return;

  for (const item of resolved) {
    const element = byId.get(item.id);

    if (element) parent.appendChild(element);
  }
}

/** Non-blocking: the canvas stays fully usable while active. */
function onSectionClick(event: Event) {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const button = target.closest('[data-bora-section]');

  if (!button) return;

  // Section identity comes from the STABLE id attribute, never from
  // the visible or accessible name. The UI Room can rename a section,
  // so keying on `aria-label` would silently stop detecting it.
  const raw = button.getAttribute('data-bora-section');

  // A DOM string is never trusted blindly: only a known section id
  // counts, so arbitrary markup cannot inject section state.
  if (!isPublicSectionId(raw)) return;

  bridge.section = raw;
  post({ type: 'bora-ui:section-changed', section: raw });

  // INVENTORY REFRESH: the new section's content is still not
  // mounted when this listener runs (React flushes the section
  // change after the click event finishes), so the target inventory
  // is re-read on the next frame. Without this, the newly mounted
  // targets (e.g. public-trending) stay invisible to the editor
  // until the preview is reloaded manually.
  requestAnimationFrame(() => {
    // React has re-applied the section's own inline styles by now,
    // so an active target draft must be re-applied on top.
    reapplyTargetDrafts();
    postSourceState();
  });
}

function setPickMode(enabled: boolean) {
  if (bridge.pickMode === enabled) return;

  bridge.pickMode = enabled;

  if (enabled) {
    document.addEventListener('mousemove', onPointerMove, true);
    document.addEventListener('click', onPickClick, true);
    document.body.style.cursor = 'crosshair';
  } else {
    document.removeEventListener('mousemove', onPointerMove, true);
    document.removeEventListener('click', onPickClick, true);
    document.body.style.cursor = '';
    bridge.hoveredTargetId = null;
  }

  drawOverlays();
}

/* ── DRAFT RESET / DEACTIVATE ─────────────────────────────── */

function resetDraft() {
  bridge.tokenDraft = {};

  if (bridge.styleEl) {
    bridge.styleEl.textContent = '';
    bridge.styleEl.remove();
    bridge.styleEl = null;
  }

  resetResponsiveDraft();

  restoreTargetStyles();

  // Structural navigation is a draft layer like the others: clearing
  // the draft must restore the navbar exactly as the public app
  // rendered it.
  restoreNavigation();

  drawOverlays();
  postSourceState();
}

function deactivate() {
  setPickMode(false);

  document.removeEventListener('click', onSectionClick, false);
  window.removeEventListener('scroll', scheduleRedraw, true);
  window.removeEventListener('resize', scheduleRedraw);

  resetDraft();

  bridge.active = false;
  bridge.selectedTargetId = null;
  bridge.section = null;

  clearOverlays();
}

/* ── PROTOCOL HANDLER ─────────────────────────────────────── */

function activate() {
  if (bridge.active) {
    postSourceState();
    return;
  }

  bridge.active = true;

  document.addEventListener('click', onSectionClick, false);
  window.addEventListener('scroll', scheduleRedraw, true);
  window.addEventListener('resize', scheduleRedraw);

  postSourceState();
}

function handleMessage(event: MessageEvent) {
  // Only the parent window (the UI Room) may drive the bridge, AND
  // only from this same origin. Without the origin check, ANY page
  // that iframes the public BORA app could post editor messages and
  // rewrite its styles.
  if (event.source !== window.parent) return;
  if (event.origin !== window.location.origin) return;
  if (!isBoraUIEditorMessage(event.data)) return;

  const message = event.data;

  switch (message.type) {
    case 'bora-ui:activate':
      activate();
      break;

    case 'bora-ui:deactivate':
      deactivate();
      break;

    case 'bora-ui:apply-tokens':
      bridge.tokenDraft = { ...message.tokens };
      renderTokenDraft();
      break;

    case 'bora-ui:apply-styles': {
      // REPLACE, not merge: the editor always sends the target's
      // full draft (possibly empty), so a cleared target reverts.
      bridge.styleDraft[message.targetId] = {
        ...message.styles,
      };

      applyTargetStyles(message.targetId);
      break;
    }

    case 'bora-ui:apply-responsive': {
      // Replace wholesale: a cleared breakpoint must REMOVE its rule
      // so the value inherits again.
      bridge.responsiveDraft = message.responsive;
      renderResponsiveDraft();
      break;
    }

    case 'bora-ui:apply-navigation': {
      // Replace wholesale, like the responsive draft: null means
      // "canonical", which must RESTORE the navbar rather than leave a
      // previous draft applied.
      if (message.navigation === null) {
        restoreNavigation();
      } else {
        applyNavigation(message.navigation);
      }

      // React re-applies its own markup on the next render, and the
      // re-inventory runs on the following frame.
      requestAnimationFrame(() => {
        reapplyTargetDrafts();
        postSourceState();
      });

      break;
    }

    case 'bora-ui:select-target':
      bridge.selectedTargetId = message.targetId;
      drawOverlays();
      break;

    case 'bora-ui:set-pick-mode':
      setPickMode(message.enabled);
      break;

    case 'bora-ui:reset-draft':
      resetDraft();
      break;

    case 'bora-ui:viewport':
    case 'bora-ui:refresh-state':
      postSourceState();
      break;
  }
}

/* ── COMPONENT ────────────────────────────────────────────── */

/**
 * Renders null on purpose: the bridge must never add markup to the
 * public app, so hydration is identical with or without it.
 */
export default function BoraUIBridge() {
  useEffect(() => {
    window.addEventListener('message', handleMessage);

    // Tell the editor the preview is live. The editor activates us.
    post({ type: 'bora-ui:ready' });

    return () => {
      window.removeEventListener('message', handleMessage);

      if (bridge.active) deactivate();
    };
  }, []);

  return null;
}
