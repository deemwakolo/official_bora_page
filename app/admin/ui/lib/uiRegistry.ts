import {
  BORA_UI_ALL_TARGETS,
  BORA_UI_ATTRIBUTE,
  BORA_UI_TARGETS,
  BORA_UI_VISIBILITY,
} from '../../../components/ui-room/boraUITarget';

import {
  BORA_UI_TOKENS,
  BORA_UI_TOKEN_GROUPS,
  BORA_UI_GROUP_ORDER,
  BORA_UI_TYPOGRAPHY_TOKENS,
} from '../../../components/ui-room/boraUITokens';

import type { UIRoomArea } from './uiTypes';

/*
 * BORA UI ROOM — ROOM REGISTRY (presentation layer)
 *
 * The real editable surface is the shared registry in
 * app/components/ui-room. This file only decides HOW the UI Room
 * presents it: which areas exist, what each area shows, and the
 * viewport presets.
 *
 * NOTE: there is deliberately no THEME area. The Black/White theme is
 * a USER preference (MasterGUI + localStorage) and stays that way.
 */

export interface UIRoomAreaDefinition {
  id: UIRoomArea;
  label: string;
  description: string;
  /** What this area drives in Phase 1. */
  mode: 'tokens' | 'targets' | 'viewport' | 'model';
  /** Target ids this area is allowed to select (empty = all). */
  targetIds: readonly string[];
}

export const UI_ROOM_AREAS: readonly UIRoomAreaDefinition[] = [
  {
    id: 'design-system',
    label: 'Design System',
    description: 'BORA design tokens',
    mode: 'tokens',
    targetIds: [],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    description: 'Public navigation presentation',
    mode: 'targets',
    // Masthead + navbar, section roots and Phase 2A child targets.
    targetIds: BORA_UI_ALL_TARGETS.filter(
      (target) =>
        target.id.startsWith('public-navbar') ||
        target.id.startsWith('public-header')
    ).map((target) => target.id),
  },
  {
    id: 'components',
    label: 'Components',
    description: 'Public sections',
    mode: 'targets',
    targetIds: BORA_UI_ALL_TARGETS.filter(
      (target) =>
        !target.id.startsWith('public-navbar') &&
        !target.id.startsWith('public-header')
    ).map((target) => target.id),
  },
  {
    id: 'responsive',
    label: 'Responsive',
    description: 'Preview viewport',
    mode: 'viewport',
    targetIds: [],
  },
  {
    id: 'visibility',
    label: 'Visibility',
    description: 'Visibility model (prepared)',
    mode: 'model',
    targetIds: [],
  },
];

export function findUIRoomArea(
  id: UIRoomArea
): UIRoomAreaDefinition | undefined {
  return UI_ROOM_AREAS.find((area) => area.id === id);
}

/* ── PREVIEW CONFIG ───────────────────────────────────────── */

export interface UIViewportPreset {
  id: 'mobile' | 'sm' | 'tablet' | 'desktop';
  label: string;
  width: number;
  height: number;
  note: string;
}

export const UI_VIEWPORT_PRESETS: readonly UIViewportPreset[] = [
  {
    id: 'mobile',
    label: 'Mobile',
    width: 390,
    height: 780,
    note: '390 x 780',
  },
  {
    // SM breakpoint test width: the only range where the 640px
    // rule applies and the 768px rule does not.
    id: 'sm',
    label: 'SM',
    width: 640,
    height: 780,
    note: '640 x 780',
  },
  {
    id: 'tablet',
    label: 'Tablet',
    width: 834,
    height: 1000,
    note: '834 x 1000',
  },
  {
    id: 'desktop',
    label: 'Desktop',
    width: 1280,
    height: 800,
    note: '1280 x 800',
  },
];

export const UI_CANVAS_ROUTE = '/';

/* ── RE-EXPORTS (single import site for the room) ─────────── */

export {
  BORA_UI_ATTRIBUTE,
  BORA_UI_ALL_TARGETS,
  BORA_UI_TARGETS,
  BORA_UI_TOKENS,
  BORA_UI_TYPOGRAPHY_TOKENS,
  BORA_UI_TOKEN_GROUPS,
  BORA_UI_GROUP_ORDER,
  BORA_UI_VISIBILITY,
};
