import {
  Cpu,
  LayoutPanelTop,
  RefreshCw,
  Settings2,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

// BORA ADMIN ROOM REGISTRY: SINGLE SOURCE OF TRUTH.
// Room selector, room switcher, breadcrumbs na permissions zote
// zinasoma kutoka hapa — jina moja, route moja, icon moja.
export interface AdminRoomDefinition {
  id: string;
  route: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const ADMIN_ROOMS = [
  {
    id: 'operations',
    route: '/admin/operations',
    label: 'Operations',
    description: 'Assets · Platforms · Operations',
    icon: Settings2,
  },
  {
    id: 'ui',
    route: '/admin/ui',
    label: 'UI',
    description: 'Interface · Visual System',
    icon: LayoutPanelTop,
  },
  {
    id: 'engine',
    route: '/admin/engine',
    label: 'Engine',
    description: 'Votes · Ranking · Thresholds',
    icon: Cpu,
  },
  {
    id: 'updates',
    route: '/admin/updates',
    label: 'Updates',
    description: 'Content · Strings · Information',
    icon: RefreshCw,
  },
] as const satisfies readonly AdminRoomDefinition[];

export type AdminRoom = (typeof ADMIN_ROOMS)[number]['id'];

// LOOKUP YA ROOM: inarudisha undefined badala ya kutupa
// (caller inaamua nini cha kufanya).
export function findAdminRoom(id: string) {
  return ADMIN_ROOMS.find((room) => room.id === id);
}
