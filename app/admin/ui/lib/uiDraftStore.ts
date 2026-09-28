'use client';

import { useCallback, useMemo, useState } from 'react';

import type {
  BoraUIPropertySchema,
  BoraUIPreviewState,
  BoraUIViewport,
} from '../../../components/ui-room/boraUIProtocol';

import { BORA_UI_ALL_TARGETS } from '../../../components/ui-room/boraUITarget';

import type {
  BoraUIBreakpoint,
  BoraUITargetSchema,
} from '../../../components/ui-room/boraUIProtocol';

import { boraGradientsForTarget } from '../../../components/ui-room/boraUIGradient';

import { saveUIConfig } from '../../../../lib/ui-config-actions';

import {
  BORA_UI_TOKENS,
  BORA_UI_TYPOGRAPHY_TOKENS,
} from '../../../components/ui-room/boraUITokens';

import {
  BORA_DEFAULT_PALETTE,
  boraPaletteTokens,
  detectBoraPalette,
} from '../../../components/components-themes/tokens/boraPalettes';

import type { BoraPaletteId } from '../../../components/components-themes/tokens/boraTokenSpec';

import {
  isNavigationConfigEmpty,
  MAX_PUBLIC_SECTION_LABEL_LENGTH,
  normalizePublicNavigationConfig,
  PUBLIC_SECTION_IDS,
  PUBLIC_SECTION_LABELS,
  type BoraUINavigationConfig,
  type Section,
} from '../../../components/workflow/publicSectionIds';

import type {
  UIDraftHistoryEntry,
  UIDraftSnapshot,
  UIConfigStore,
  UIPropertyRow,
  UIResponsiveDraft,
  UISaveStatus,
  UITargetDraft,
  UITokenDraft,
} from './uiTypes';

/*
 * BORA UI ROOM — DRAFT STORE (Phase 1)
 *
 * SOURCE   values read from the live preview
 * DRAFT    values changed by the admin this session
 * LIVE     what the preview shows (source + draft)
 *
 * The store never writes to the public app, never writes source
 * files, and never talks to Supabase. Save goes through
 * UIConfigStore so persistence can be decided in a later phase.
 */

const HISTORY_LIMIT = 50;

/**
 * PHASE 1 STORE: in-memory only.
 *
 * This is deliberately NOT localStorage and NOT a database — it is a
 * session draft. The label is shown in the save bar so nobody
 * mistakes it for global BORA persistence.
 */
/**
 * Session-backed store. Keeps the committed snapshot in memory so
 * the save bar can tell the truth about what was written.
 */
interface SessionUIConfigStore extends UIConfigStore {
  committed: UIDraftSnapshot | null;
}

export const sessionUIConfigStore: SessionUIConfigStore = {
  label: 'Session draft (in-memory)',

  committed: null as UIDraftSnapshot | null,

  get() {
    return this.committed;
  },

  async save(snapshot) {
    // Deep-ish copy: drafts are flat string maps.
    this.committed = {
      paletteId: snapshot.paletteId,
      tokens: { ...snapshot.tokens },
      responsive: JSON.parse(
        JSON.stringify(snapshot.responsive ?? {})
      ) as UIDraftSnapshot['responsive'],
      targets: Object.fromEntries(
        Object.entries(snapshot.targets).map(([id, styles]) => [
          id,
          { ...styles },
        ])
      ),
    };
  },

  async reset() {
    this.committed = null;
  },
};

interface SourceState {
  connected: boolean;
  tokens: Record<string, string>;
  /** targetId → propertyId → computed value */
  targets: Record<string, Record<string, string>>;
  /** targetId → how many elements carry it in the preview */
  instances: Record<string, number>;
  section: string | null;
  width: number;
}

const EMPTY_SOURCE: SourceState = {
  connected: false,
  tokens: {},
  targets: {},
  instances: {},
  section: null,
  width: 0,
};

const EMPTY_SNAPSHOT: UIDraftSnapshot = {
  paletteId: BORA_DEFAULT_PALETTE,
  tokens: {},
  targets: {},
  responsive: {},
};

/**
 * CANONICAL NAVIGATION — the "no draft" state.
 *
 * Order is the canonical order, nothing hidden, no label overrides.
 * The panel renders this whenever the draft block is absent, which is
 * exactly what the public site resolves.
 */
const CANONICAL_NAVIGATION: BoraUINavigationConfig = {
  order: [...PUBLIC_SECTION_IDS],
  hidden: [],
  labels: {},
};

/**
 * TRUE only when the navigation differs from its SOURCE baseline in
 * some way.
 *
 * This is the "should we persist this at all?" test. A materialized
 * navigation always has all five ids in `order`, so emptiness cannot
 * be judged on field length — it is judged on whether anything
 * actually deviates from the baseline (different order, something
 * hidden, or a non-canonical label).
 */
function isNavigationNonCanonical(
  config: BoraUINavigationConfig,
  baseline: BoraUINavigationConfig
): boolean {
  const current = materializeNavigation(config);

  if (current.order.join() !== baseline.order.join()) return true;
  if (current.hidden.length > 0) return true;

  for (const [id, label] of Object.entries(current.labels)) {
    if (label !== PUBLIC_SECTION_LABELS[id as Section]) return true;
  }

  return false;
}

/**
 * NAVIGATION (structural) — helpers shared by the store and the panel.
 * navigation — every canonical id present exactly once, hidden
 * deduped and restricted to the known set, labels falling back to
 * canonical.
 *
 * This is what the editor row list renders from, so the panel always
 * shows all five sections even when the draft is partial.
 */
export function materializeNavigation(
  config?: BoraUINavigationConfig | null
): BoraUINavigationConfig {
  const safe = normalizePublicNavigationConfig(config) ?? {
    order: [],
    hidden: [],
    labels: {},
  };

  const order: Section[] = [];

  for (const id of safe.order) {
    if (!order.includes(id)) order.push(id);
  }

  for (const id of PUBLIC_SECTION_IDS) {
    if (!order.includes(id)) order.push(id);
  }

  const hidden = safe.hidden.filter((id) => order.includes(id));

  // Never let a materialized draft hide everything, or the preview
  // would show an empty bar.
  if (hidden.length === order.length) return { ...CANONICAL_NAVIGATION };

  const labels: Partial<Record<Section, string>> = {};

  for (const id of order) {
    const label = safe.labels[id];

    if (label !== undefined) labels[id] = label;
  }

  return { order, hidden, labels };
}

/**
 * Trims + caps a label the same way the persisted normalizer does.
 *
 * The editor and the normalizer must agree, or the panel would show a
 * value that Save silently rewrites. The cap is read from the shared
 * module rather than restated here.
 */
export function normalizeDraftLabel(
  value: string
): string {
  const trimmed = value.trim();

  return trimmed.length > MAX_PUBLIC_SECTION_LABEL_LENGTH
    ? trimmed.slice(0, MAX_PUBLIC_SECTION_LABEL_LENGTH)
    : trimmed;
}

export interface UIRoomStore {
  source: SourceState;
  draft: UIDraftSnapshot;
  /** Palette currently applied in the preview. */
  paletteId: BoraPaletteId;
  /** Palette the preview is showing at source (user theme aware). */
  sourcePaletteId: BoraPaletteId;
  /** Resolved token map of the selected palette (the baseline). */
  paletteTokens: Record<string, string>;
  /**
   * The COMPLETE token map sent to the bridge:
   * palette values + per-token draft overrides.
   */
  effectiveTokens: Record<string, string>;
  dirtyCount: number;
  isDirty: boolean;
  status: UISaveStatus;
  message: string | null;
  canUndo: boolean;
  canRedo: boolean;
  selectedTargetId: string | null;
  hoveredTargetId: string | null;
  pickMode: boolean;
  viewport: BoraUIViewport;
  previewSection: string | null;
  previewWidth: number;

  connect: (state: BoraUIPreviewState) => void;
  setSelectedTarget: (targetId: string | null) => void;
  setHoveredTarget: (targetId: string | null) => void;
  setPickMode: (enabled: boolean) => void;
  setViewport: (viewport: BoraUIViewport) => void;
  setPreviewSection: (section: string) => void;

  setPalette: (palette: BoraPaletteId) => void;
  setToken: (tokenName: string, value: string) => void;
  setResponsiveProperty: (
    targetId: string,
    propertyId: string,
    breakpoint: BoraUIBreakpoint,
    value: string
  ) => void;
  resetResponsiveProperty: (
    targetId: string,
    propertyId: string
  ) => void;
  resetTargetProperty: (
    targetId: string,
    propertyId: string
  ) => void;
  setTargetProperty: (
    targetId: string,
    propertyId: string,
    value: string
  ) => void;
  resetToken: (tokenName: string) => void;
  resetTarget: (targetId: string) => void;

  /* NAVIGATION (structural) */
  /** The complete navigation the editor renders rows from. */
  navigation: BoraUINavigationConfig;
  /** True when this section differs from canonical. */
  isNavigationSectionDirty: (id: Section) => boolean;
  /** False when hiding this section would hide the last one. */
  canHideSection: (id: Section) => boolean;
  moveNavigationSection: (id: Section, direction: -1 | 1) => void;
  toggleNavigationSection: (id: Section) => void;
  setNavigationLabel: (id: Section, label: string) => void;
  resetNavigationSection: (id: Section) => void;
  resetNavigation: () => void;

  undo: () => void;
  redo: () => void;
  discardAll: () => void;
  save: () => void;
}

/* ── DERIVED HELPERS ──────────────────────────────────────── */

function isTokenDirty(
  draftTokens: UITokenDraft,
  paletteTokens: Record<string, string>
): number {
  return Object.keys(draftTokens).filter((name) => {
    const baseline = paletteTokens[name];

    return (
      baseline !== undefined &&
      draftTokens[name] !== '' &&
      draftTokens[name] !== baseline
    );
  }).length;
}

function isTargetDirty(
  draftTargets: UITargetDraft,
  sourceTargets: Record<string, Record<string, string>>
): number {
  let count = 0;

  for (const [targetId, styles] of Object.entries(draftTargets)) {
    const computed = sourceTargets[targetId] ?? {};

    for (const [propertyId, value] of Object.entries(styles)) {
      if (value === '' || value === computed[propertyId]) continue;

      count += 1;
    }
  }

  return count;
}

function isResponsiveDirty(
  draft: UIResponsiveDraft,
  targetSchemas: readonly BoraUITargetSchema[]
): number {
  let count = 0;

  for (const [targetId, properties] of Object.entries(draft)) {
    const target = targetSchemas.find(
      (entry) => entry.id === targetId
    );

    for (const [propertyId, byBreakpoint] of Object.entries(
      properties
    )) {
      const source =
        target?.properties.find(
          (property) => property.id === propertyId
        )?.responsiveSource ?? {};

      for (const [breakpoint, value] of Object.entries(
        byBreakpoint
      )) {
        if (value === undefined || value === '') continue;

        const baseline =
          source[breakpoint as BoraUIBreakpoint];

        // Set to a value the source does not have, or differing from it.
        if (baseline !== undefined && baseline === value) {
          continue;
        }

        count += 1;
      }
    }
  }

  return count;
}

/**
 * Navigation dirtiness, compared against the SOURCE baseline.
 *
 * The baseline is the COMMITTED navigation the room was opened with,
 * so "dirty" honestly means "differs from what is live". When nothing
 * is committed the baseline is canonical, which is the correct
 * nothing-changed-yet starting point.
 */
function isNavigationDirty(
  config: BoraUINavigationConfig | undefined,
  baseline: BoraUINavigationConfig
): number {
  if (isNavigationConfigEmpty(config)) return 0;

  const current = materializeNavigation(config);

  let count = 0;

  if (current.order.join() !== baseline.order.join()) count += 1;
  if (current.hidden.join() !== baseline.hidden.join()) count += 1;

  for (const [id, label] of Object.entries(current.labels)) {
    if (label !== PUBLIC_SECTION_LABELS[id as Section]) count += 1;
  }

  return count;
}

/** Per-section dirty flag, so a row can show its own marker. */
export function isNavigationSectionDirty(
  config: BoraUINavigationConfig | undefined,
  id: Section,
  baseline: BoraUINavigationConfig
): boolean {
  const current = materializeNavigation(config);

  return (
    current.order.indexOf(id) !== baseline.order.indexOf(id) ||
    current.hidden.includes(id) !== baseline.hidden.includes(id) ||
    (current.labels[id] ?? PUBLIC_SECTION_LABELS[id]) !==
      (baseline.labels[id] ?? PUBLIC_SECTION_LABELS[id])
  );
}

export function useUIDraftStore(
  committedNavigation?: BoraUINavigationConfig | null
): UIRoomStore {
  const [source, setSource] =
    useState<SourceState>(EMPTY_SOURCE);

  // The SOURCE baseline for navigation: what is already committed.
  // Falls back to canonical when nothing is committed, which is the
  // honest "nothing changed yet" starting point.
  const sourceNavigation = useMemo(
    () => materializeNavigation(committedNavigation ?? null),
    [committedNavigation]
  );
  const [draft, setDraft] =
    useState<UIDraftSnapshot>(() => ({
      ...EMPTY_SNAPSHOT,
      // Seed navigation from what is COMMITTED, not from canonical.
      // Without this the draft carries no navigation, and saving any
      // other change would write a payload with no `navigation` key,
      // silently erasing the committed structural config.
      navigation: committedNavigation ?? undefined,
    }));
  const [history, setHistory] = useState<
    UIDraftHistoryEntry[]
  >([]);
  const [future, setFuture] = useState<
    UIDraftHistoryEntry[]
  >([]);
  const [status, setStatus] =
    useState<UISaveStatus>('clean');
  const [message, setMessage] = useState<string | null>(null);

  const [selectedTargetId, setSelectedTargetId] =
    useState<string | null>(null);
  const [hoveredTargetId, setHoveredTargetId] =
    useState<string | null>(null);
  const [pickMode, setPickModeState] = useState(false);
  const [viewport, setViewportState] =
    useState<BoraUIViewport>('desktop');
  const [previewSection, setPreviewSection] =
    useState<string | null>(null);

  // The draft snapshot is the single source of truth for the
  // palette, so undo/redo/reset cover it for free.
  const paletteId = draft.paletteId;

  const [sourcePaletteId, setSourcePaletteId] =
    useState<BoraPaletteId>(BORA_DEFAULT_PALETTE);

  // SOURCE for token drafts is the SELECTED PALETTE (what the BORA
  // design system says), not the viewer's theme — the palette IS the
  // design-system control. Per-token overrides are compared against
  // the palette baseline.
  const paletteTokens = useMemo(
    () => boraPaletteTokens(paletteId),
    [paletteId]
  );

  // The COMPLETE map the bridge applies: palette + overrides.
  const effectiveTokens = useMemo(
    () => ({ ...paletteTokens, ...draft.tokens }),
    [paletteTokens, draft.tokens]
  );

  const dirtyCount =
    isTokenDirty(draft.tokens, paletteTokens) +
    isTargetDirty(draft.targets, source.targets) +
    isResponsiveDirty(draft.responsive, BORA_UI_ALL_TARGETS) +
    isNavigationDirty(draft.navigation, sourceNavigation) +
    (draft.paletteId === sourcePaletteId ? 0 : 1);

  // The complete, always-five-row navigation the editor renders from.
  const navigation = useMemo(
    () => materializeNavigation(draft.navigation),
    [draft.navigation]
  );

  const isDirty = dirtyCount > 0;

  const connect = useCallback((state: BoraUIPreviewState) => {
    const targets: Record<string, Record<string, string>> = {};
    const instances: Record<string, number> = {};

    for (const target of state.targets) {
      targets[target.id] = { ...target.computed };
      instances[target.id] = target.instances;
    }

    setSource({
      connected: true,
      tokens: { ...state.tokens },
      targets,
      instances,
      section: state.section,
      width: state.width,
    });

    // Learn which palette the preview is showing at source. This is
    // the VIEWER's theme (a preference) — the editor only needs to
    // know what it is looking at.
    setSourcePaletteId(detectBoraPalette(state.tokens));

    if (state.section) setPreviewSection(state.section);
  }, []);

  const pushHistory = useCallback(
    (label: string, snapshot: UIDraftSnapshot) => {
      setHistory((previous) => {
        const next = [
          ...previous,
          { label, snapshot },
        ];

        return next.length > HISTORY_LIMIT
          ? next.slice(next.length - HISTORY_LIMIT)
          : next;
      });

      setFuture([]);
    },
    []
  );

  /* ── DRAFT MUTATIONS ──────────────────────────────────── */

  const setPalette = useCallback(
    (palette: BoraPaletteId) => {
      pushHistory(`Palette ${palette}`, draft);

      // Switching palette REPLACES the palette baseline. Per-token
      // overrides are kept so an intentional tweak survives a
      // palette flip, and Reset returns each value to the palette.
      setDraft((previous) => ({
        ...previous,
        paletteId: palette,
      }));

      setStatus('draft');
      setMessage(null);
    },
    [draft, pushHistory]
  );

  const setToken = useCallback(
    (tokenName: string, value: string) => {
      pushHistory(`Token ${tokenName}`, draft);

      setDraft((previous) => ({
        ...previous,
        tokens: { ...previous.tokens, [tokenName]: value },
      }));

      setStatus('draft');
      setMessage(null);
    },
    [draft, pushHistory]
  );

  /**
   * Responsive draft mutation.
   *
   * An empty `value` DELETES the breakpoint, which is how "inherit"
   * is expressed — never an empty CSS value.
   */
  const setResponsiveProperty = useCallback(
    (
      targetId: string,
      propertyId: string,
      breakpoint: BoraUIBreakpoint,
      value: string
    ) => {
      pushHistory(
        `${targetId} Â· ${propertyId} Â· ${breakpoint}`,
        draft
      );

      setDraft((previous) => {
        const targetDraft = previous.responsive[targetId] ?? {};
        const byBreakpoint = {
          ...(targetDraft[propertyId] ?? {}),
        };

        if (value === '') {
          delete byBreakpoint[breakpoint];
        } else {
          byBreakpoint[breakpoint] = value;
        }

        const nextTarget: UIResponsiveDraft[string] = {
          ...targetDraft,
        };

        if (Object.keys(byBreakpoint).length === 0) {
          delete nextTarget[propertyId];
        } else {
          nextTarget[propertyId] = byBreakpoint;
        }

        const responsive: UIResponsiveDraft = {
          ...previous.responsive,
        };

        if (Object.keys(nextTarget).length === 0) {
          delete responsive[targetId];
        } else {
          responsive[targetId] = nextTarget;
        }

        return { ...previous, responsive };
      });

      setStatus('draft');
      setMessage(null);
    },
    [draft, pushHistory]
  );

  /** Clears every breakpoint of one responsive property. */
  const resetResponsiveProperty = useCallback(
    (targetId: string, propertyId: string) => {
      pushHistory(
        `${targetId} Â· ${propertyId} Â· reset`,
        draft
      );

      setDraft((previous) => {
        const targetDraft = previous.responsive[targetId] ?? {};

        if (!(propertyId in targetDraft)) return previous;

        const nextTarget: UIResponsiveDraft[string] = {
          ...targetDraft,
        };

        delete nextTarget[propertyId];

        const responsive: UIResponsiveDraft = {
          ...previous.responsive,
        };

        if (Object.keys(nextTarget).length === 0) {
          delete responsive[targetId];
        } else {
          responsive[targetId] = nextTarget;
        }

        return { ...previous, responsive };
      });

      setStatus('draft');
      setMessage(null);
    },
    [draft, pushHistory]
  );

  const setTargetProperty = useCallback(
    (
      targetId: string,
      propertyId: string,
      value: string
    ) => {
      pushHistory(`${targetId} · ${propertyId}`, draft);

      setDraft((previous) => {
        const current = previous.targets[targetId] ?? {};

        return {
          ...previous,
          targets: {
            ...previous.targets,
            [targetId]: { ...current, [propertyId]: value },
          },
        };
      });

      setStatus('draft');
      setMessage(null);
    },
    [draft, pushHistory]
  );

  const resetToken = useCallback(
    (tokenName: string) => {
      pushHistory(`Reset ${tokenName}`, draft);

      setDraft((previous) => {
        const tokens = { ...previous.tokens };
        delete tokens[tokenName];

        return { ...previous, tokens };
      });

      setStatus('draft');
      setMessage(null);
    },
    [draft, pushHistory]
  );

  /** Clears a single scalar property of one target. */
  const resetTargetProperty = useCallback(
    (targetId: string, propertyId: string) => {
      pushHistory(`${targetId} · ${propertyId} reset`, draft);

      setDraft((previous) => {
        const current = previous.targets[targetId];

        if (!current || !(propertyId in current)) {
          return previous;
        }

        const next: Record<string, string> = { ...current };
        delete next[propertyId];

        const targets = { ...previous.targets };

        if (Object.keys(next).length === 0) {
          delete targets[targetId];
        } else {
          targets[targetId] = next;
        }

        return { ...previous, targets };
      });

      setStatus('draft');
      setMessage(null);
    },
    [draft, pushHistory]
  );

  const resetTarget = useCallback(
    (targetId: string) => {
      pushHistory(`Reset ${targetId}`, draft);

      setDraft((previous) => {
        const targets = { ...previous.targets };
        delete targets[targetId];

        // Reset clears BOTH scalar and responsive drafts for the
        // target, exactly as before — one meaning for one control.
        const responsive = { ...previous.responsive };
        delete responsive[targetId];

        return { ...previous, targets, responsive };
      });

      setStatus('draft');
      setMessage(null);
    },
    [draft, pushHistory]
  );

  /* ── NAVIGATION (structural) ────────────────────────────────
   *
   * Every action goes through pushHistory + setDraft exactly like the
   * scalar property actions, so Undo / Redo / Discard / the universal
   * Save bar need no special handling.
   *
   * The draft block is stored MATERIALIZED (all five ids, hidden
   * deduped) so the row list is always complete, but it is dropped to
   * undefined when it equals canonical, so a round trip through the
   * editor never persists a no-op block.
   */

  const writeNavigation = useCallback(
    (
      label: string,
      next: BoraUINavigationConfig | null
    ) => {
      pushHistory(label, draft);

      setDraft((previous) => {
        const navigation = next ?? undefined;

        // Back to the SOURCE baseline -> store nothing at all.
        if (
          navigation === undefined ||
          !isNavigationNonCanonical(navigation, sourceNavigation)
        ) {
          const { navigation: _dropped, ...rest } = previous;

          return rest as UIDraftSnapshot;
        }

        return { ...previous, navigation };
      });

      setStatus('draft');
      setMessage(null);
    },
    [draft, pushHistory, sourceNavigation]
  );

  const moveNavigationSection = useCallback(
    (id: Section, direction: -1 | 1) => {
      const current = materializeNavigation(draft.navigation);
      const index = current.order.indexOf(id);
      const target = index + direction;

      // Boundary: the panel disables these, and this is the guard.
      if (index === -1 || target < 0 || target >= current.order.length) {
        return;
      }

      const order = [...current.order];
      const [moved] = order.splice(index, 1);

      if (!moved) return;

      order.splice(target, 0, moved);

      writeNavigation(`Navigation · move ${id}`, {
        ...current,
        order,
      });
    },
    [draft.navigation, writeNavigation]
  );

  const canHideSection = useCallback(
    (id: Section) => {
      const current = materializeNavigation(draft.navigation);
      const isHidden = current.hidden.includes(id);

      if (!isHidden) return true;

      // Un-hiding is always allowed. Hiding is blocked only when it
      // would leave the bar empty.
      return current.hidden.length < current.order.length;
    },
    [draft.navigation]
  );

  const toggleNavigationSection = useCallback(
    (id: Section) => {
      const current = materializeNavigation(draft.navigation);
      const isHidden = current.hidden.includes(id);

      if (isHidden) {
        writeNavigation(`Navigation · show ${id}`, {
          ...current,
          hidden: current.hidden.filter((entry) => entry !== id),
        });

        return;
      }

      if (!canHideSection(id)) return;

      writeNavigation(`Navigation · hide ${id}`, {
        ...current,
        hidden: [...current.hidden, id],
      });
    },
    [canHideSection, draft.navigation, writeNavigation]
  );

  const setNavigationLabel = useCallback(
    (id: Section, label: string) => {
      const current = materializeNavigation(draft.navigation);

      // Same trim + cap the persisted normalizer applies, so the panel
      // never shows a value Save would silently rewrite.
      const next = normalizeDraftLabel(label);
      const canonical = PUBLIC_SECTION_LABELS[id];

      const labels = { ...current.labels };

      // A blank or canonical label is a NO-OP: drop the override so it
      // does not register as dirty and never persists.
      if (next.length === 0 || next === canonical) {
        delete labels[id];
      } else {
        labels[id] = next;
      }

      writeNavigation(`Navigation · label ${id}`, { ...current, labels });
    },
    [draft.navigation, writeNavigation]
  );

  const resetNavigationSection = useCallback(
    (id: Section) => {
      const current = materializeNavigation(draft.navigation);

      // SECTION-SCOPED reset, never a whole-block reset:
      //  1. visibility back to visible
      //  2. label back to canonical (override dropped)
      //  3. position re-anchored to its CANONICAL index
      const hidden = current.hidden.filter((entry) => entry !== id);

      const labels = { ...current.labels };
      delete labels[id];

      // Deterministic position rule: the section returns to the slot
      // its canonical index occupies, relative to the sections that
      // were NOT moved. Concretely, remove it, then re-insert it at
      // min(canonicalIndex, length).
      const order = current.order.filter((entry) => entry !== id);
      const canonicalIndex = PUBLIC_SECTION_IDS.indexOf(id);
      order.splice(Math.min(canonicalIndex, order.length), 0, id);

      writeNavigation(`Navigation · reset ${id}`, { order, hidden, labels });
    },
    [draft.navigation, writeNavigation]
  );

  const resetNavigation = useCallback(() => {
    // DRAFT-ONLY. This never touches the committed configuration;
    // only the universal Save bar can do that.
    writeNavigation('Navigation · reset all', null);
  }, [writeNavigation]);

  const undo = useCallback(() => {
    setHistory((previous) => {
      const entry = previous[previous.length - 1];

      if (!entry) return previous;

      setFuture((nextFuture) => [
        ...nextFuture,
        { label: entry.label, snapshot: draft },
      ]);

      setDraft(entry.snapshot);

      return previous.slice(0, previous.length - 1);
    });

    setStatus('draft');
  }, [draft]);

  const redo = useCallback(() => {
    setFuture((previous) => {
      const entry = previous[previous.length - 1];

      if (!entry) return previous;

      setHistory((nextHistory) => [
        ...nextHistory,
        { label: entry.label, snapshot: draft },
      ]);

      setDraft(entry.snapshot);

      return previous.slice(0, previous.length - 1);
    });

    setStatus('draft');
  }, [draft]);

  const discardAll = useCallback(() => {
    pushHistory('Discard all', draft);

    // Back to SOURCE: the palette the preview is actually showing, and
    // the navigation that is already committed. Dropping navigation
    // here would let a later save erase the committed structural
    // config.
    setDraft({
      ...EMPTY_SNAPSHOT,
      paletteId: sourcePaletteId,
      navigation: committedNavigation ?? undefined,
    });

    setStatus('clean');
    setMessage('Draft discarded. Preview is back to source.');
  }, [committedNavigation, draft, pushHistory, sourcePaletteId]);

  const save = useCallback(() => {
    setStatus('saving');
    setMessage('Committing UI draft...');

    void (async () => {
      // 1. COMMIT — the server action normalises against the registry
      //    and writes the runtime override. This is the only path
      //    that can make a change persistent.
      try {
        const result = await saveUIConfig(draft);

        if (!result.success) {
          setStatus('error');
          setMessage(
            result.error ??
              'Commit failed. The draft is still held locally and is NOT live.'
          );
          return;
        }

        // 2. MIRROR — keep the in-session view in step with what is
        //    now committed, so Reset/discard messaging stays honest.
        await sessionUIConfigStore.save(draft);

        setStatus('saved');

        const dropped = result.warnings?.length ?? 0;

        setMessage(
          dropped > 0
            ? `Committed. ${dropped} obsolete or invalid ${
                dropped === 1 ? 'entry was' : 'entries were'
              } dropped and not applied.`
            : 'Committed. This is now the live BORA presentation (runtime override). The file baseline is unchanged.'
        );
      } catch {
        setStatus('error');
        setMessage(
          'Commit failed unexpectedly. The draft is still held locally and is NOT live.'
        );
      }
    })();
  }, [draft]);

  const setPickMode = useCallback((enabled: boolean) => {
    setPickModeState(enabled);
  }, []);

  const setViewport = useCallback((next: BoraUIViewport) => {
    setViewportState(next);
  }, []);

  return {
    source,
    draft,
    paletteId,
    sourcePaletteId,
    paletteTokens,
    effectiveTokens,
    dirtyCount,
    isDirty,
    status: isDirty && status === 'clean' ? 'draft' : status,
    message,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
    selectedTargetId,
    hoveredTargetId,
    pickMode,
    viewport,
    previewSection,
    previewWidth: source.width,

    connect,
    setSelectedTarget: setSelectedTargetId,
    setHoveredTarget: setHoveredTargetId,
    setPickMode,
    setViewport,
    setPreviewSection,

    setPalette,
    setToken,
    setResponsiveProperty,
    resetResponsiveProperty,
    resetTargetProperty,
    setTargetProperty,
    resetToken,
    resetTarget,

    navigation,
    isNavigationSectionDirty: (id) =>
      isNavigationSectionDirty(
        draft.navigation,
        id,
        sourceNavigation
      ),
    canHideSection,
    moveNavigationSection,
    toggleNavigationSection,
    setNavigationLabel,
    resetNavigationSection,
    resetNavigation,

    undo,
    redo,
    discardAll,
    save,
  };
}

/* ── INSPECTOR ROW BUILDER (schema-driven) ────────────────── */

/**
 * Turns a property schema + source/draft maps into inspector rows.
 * `keyOf` maps a property to the key used in the draft map: tokens
 * are keyed by CSS variable name, targets by property id.
 */
export function buildPropertyRows(
  properties: readonly BoraUIPropertySchema[],
  sourceValues: Record<string, string>,
  draftValues: Record<string, string>,
  keyOf: (property: BoraUIPropertySchema) => string
): UIPropertyRow[] {
  return properties.map((property) => {
    const key = keyOf(property);

    // A structured gradient keeps its CANONICAL source. The browser
    // resolves color-mix()/var() to flat rgb() in computed style, so
    // reading it back would destroy the token references.
    const source =
      property.gradient?.source ?? sourceValues[key] ?? '';

    const draftValue = draftValues[key];

    const dirty =
      draftValue !== undefined &&
      draftValue !== '' &&
      draftValue !== source;

    return {
      property,
      value: dirty && draftValue !== undefined
        ? draftValue
        : source,
      source,
      dirty,
    };
  });
}

/** Token schema -> the CSS variable name used as the draft key. */
export function tokenKey(
  property: BoraUIPropertySchema
): string {
  return property.token ?? property.id;
}

/** Target schema -> the property id used as the draft key. */
export function targetKey(
  property: BoraUIPropertySchema
): string {
  return property.id;
}

/** Target id -> cssProperty map for the bridge message. */
export function toCssStyleMap(
  targetId: string,
  draftTargets: UITargetDraft
): Record<string, string> {
  // Section-level AND Phase 2A child targets. Resolving only the old
  // section-level list silently dropped every child-target draft.
  const target = BORA_UI_ALL_TARGETS.find(
    (entry) => entry.id === targetId
  );

  if (!target) return {};

  const values = draftTargets[targetId] ?? {};
  const styles: Record<string, string> = {};

  // Target properties.
  for (const property of target.properties) {
    if (!property.cssProperty) continue;

    const value = values[property.id];

    if (value === undefined || value === '') continue;

    styles[property.cssProperty] = value;
  }

  // Design System gradient definitions applied to this target. The
  // gradient is EDITED under Design System -> Gradients, but its
  // draft still lives in this target's draft (single source of
  // truth), so the preview message needs its css mapping here.
  for (const property of boraGradientsForTarget(targetId)) {
    if (!property.cssProperty) continue;

    const value = values[property.id];

    if (value === undefined || value === '') continue;

    styles[property.cssProperty] = value;
  }

  return styles;
}
