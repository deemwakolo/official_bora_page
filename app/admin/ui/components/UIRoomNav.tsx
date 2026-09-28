'use client';

import React from 'react';

import {
  Palette,
  Navigation,
  LayoutGrid,
  MonitorSmartphone,
  Eye,
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import { UI_ROOM_AREAS } from '../lib/uiRegistry';
import type { UIRoomArea } from '../lib/uiTypes';

/*
 * BORA UI ROOM — ROOM NAVIGATION
 *
 * Five areas, matching the room brief. Deliberately NO theme area:
 * the Black/White theme is a user preference, not BORA config.
 */

const AREA_ICONS: Record<UIRoomArea, LucideIcon> = {
  'design-system': Palette,
  navigation: Navigation,
  components: LayoutGrid,
  responsive: MonitorSmartphone,
  visibility: Eye,
};

interface UIRoomNavProps {
  activeArea: UIRoomArea;
  onAreaChange: (area: UIRoomArea) => void;
}

export default function UIRoomNav({
  activeArea,
  onAreaChange,
}: UIRoomNavProps) {
  return (
    <nav
      aria-label="UI Room areas"
      className="w-full border-b"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-background-deep)',
      }}
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-stretch gap-1 overflow-x-auto px-3 py-2">
        {UI_ROOM_AREAS.map((area) => {
          const active = area.id === activeArea;
          const Icon = AREA_ICONS[area.id];

          return (
            <button
              key={area.id}
              type="button"
              onClick={() => onAreaChange(area.id)}
              aria-current={active ? 'page' : undefined}
              className="flex shrink-0 items-center gap-2 border px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] transition-all duration-300 active:scale-[0.98]"
              style={{
                borderColor: active
                  ? 'var(--bora-gold)'
                  : 'var(--bora-border)',
                color: active
                  ? 'var(--bora-gold)'
                  : 'var(--bora-text-muted)',
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--bora-gold) 7%, transparent)'
                  : 'transparent',
                boxShadow: active
                  ? '0 0 18px var(--bora-gold-glow)'
                  : 'none',
              }}
            >
              <Icon size={13} strokeWidth={1.8} />

              <span>{area.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
