'use client';

import React, { useState } from 'react';

import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';

import {
  MAX_PUBLIC_SECTION_LABEL_LENGTH,
  PUBLIC_SECTION_LABELS,
  type Section,
} from '../../../components/workflow/publicSectionIds';

import { PUBLIC_SECTIONS } from '../../../components/workflow/publicSections';

import type { UIRoomStore } from '../lib/uiDraftStore';

/*
 * BORA UI ROOM — NAVIGATION STRUCTURE EDITOR
 *
 * Order, visibility and labels are STRUCTURAL configuration, not CSS
 * scalars, so they are deliberately NOT `data-bora-ui` targets and are
 * not edited as scalar property rows. This panel sits beside the
 * existing scalar navigation controls; it does not replace them.
 *
 * DISCIPLINE — every action goes through the store's existing draft
 * actions, so Undo / Redo / Discard / the universal Save bar and the
 * live preview need no special handling. This panel owns no state, no
 * save button and no persistence of its own.
 *
 * SCOPE GUARD — the internal section id is shown for orientation but
 * is never editable, and `data-bora-section` is never derived from
 * anything typed here.
 */

type SectionIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
}>;

/** Icons come from the canonical client presentation module. */
const SECTION_ICONS = PUBLIC_SECTIONS.reduce(
  (map, section) => {
    map[section.id] = section.Icon as SectionIcon;

    return map;
  },
  {} as Record<Section, SectionIcon>
);

const miniButtonClass =
  'flex items-center justify-center border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-30';

interface NavigationStructurePanelProps {
  store: UIRoomStore;
}

export default function NavigationStructurePanel({
  store,
}: NavigationStructurePanelProps) {
  const navigation = store.navigation;

  // Local-only typing buffer: keeps the field responsive while the
  // store holds the trimmed, capped value.
  const [typing, setTyping] = useState<{
    id: Section;
    value: string;
  } | null>(null);

  const visibleCount =
    navigation.order.length - navigation.hidden.length;

  return (
    <div
      className="border-b"
      style={{ borderColor: 'var(--bora-border)' }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <p
            className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--bora-text)' }}
          >
            Navigation Structure
          </p>

          <p
            className="mt-1 text-[6px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            Order, visibility and labels for the public navbar
          </p>
        </div>

        <button
          type="button"
          onClick={store.resetNavigation}
          disabled={!store.isDirty}
          className="shrink-0 border px-2.5 py-1.5 text-[7px] font-black uppercase tracking-[0.14em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: 'var(--bora-border)',
            color: 'var(--bora-text-muted)',
          }}
        >
          Reset navigation
        </button>
      </div>

      {/* ROWS — one per canonical section, in configured order */}
      <div className="space-y-1.5 p-3">
        {navigation.order.map((id, index) => {
          const hidden = navigation.hidden.includes(id);
          const dirty = store.isNavigationSectionDirty(id);
          const canonicalLabel = PUBLIC_SECTION_LABELS[id];
          const currentLabel =
            navigation.labels[id] ?? canonicalLabel;

          const Icon = SECTION_ICONS[id];
          const canHide = store.canHideSection(id);
          const isFirst = index === 0;
          const isLast = index === navigation.order.length - 1;

          // Show what is being typed, else the stored (trimmed) value.
          const fieldValue =
            typing?.id === id ? typing.value : currentLabel;

          return (
            <div
              key={id}
              className="border px-2.5 py-2 transition-colors duration-300"
              style={{
                borderColor: dirty
                  ? 'var(--bora-gold)'
                  : 'var(--bora-border)',
                backgroundColor: dirty
                  ? 'color-mix(in srgb, var(--bora-gold) 6%, transparent)'
                  : 'transparent',
                opacity: hidden ? 0.55 : 1,
              }}
            >
              <div className="flex items-center gap-2">
                {/* REORDER */}
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      store.moveNavigationSection(id, -1)
                    }
                    disabled={isFirst}
                    aria-label={`Move ${canonicalLabel} up`}
                    className={`${miniButtonClass} h-4 w-5`}
                    style={{
                      borderColor: 'var(--bora-border)',
                      color: 'var(--bora-text-muted)',
                    }}
                  >
                    <ArrowUp size={9} strokeWidth={2.2} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      store.moveNavigationSection(id, 1)
                    }
                    disabled={isLast}
                    aria-label={`Move ${canonicalLabel} down`}
                    className={`${miniButtonClass} h-4 w-5`}
                    style={{
                      borderColor: 'var(--bora-border)',
                      color: 'var(--bora-text-muted)',
                    }}
                  >
                    <ArrowDown size={9} strokeWidth={2.2} />
                  </button>
                </div>

                {/* ICON + INTERNAL ID — read-only, never editable */}
                <span
                  className="flex shrink-0 items-center gap-1.5"
                  style={{ color: 'var(--bora-gold)' }}
                >
                  {Icon ? (
                    <Icon size={12} strokeWidth={2} />
                  ) : null}

                  <span
                    className="font-mono text-[7px] uppercase tracking-[0.1em]"
                    style={{ color: 'var(--bora-text-subtle)' }}
                  >
                    {id}
                  </span>
                </span>

                {/* LABEL INPUT */}
                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    aria-label={`${canonicalLabel} label`}
                    value={fieldValue}
                    maxLength={MAX_PUBLIC_SECTION_LABEL_LENGTH}
                    onChange={(event) => {
                      const value = event.target.value;

                      setTyping({ id, value });
                      store.setNavigationLabel(id, value);
                    }}
                    onBlur={() => setTyping(null)}
                    className="w-full border px-2 py-1 text-[9px] outline-none transition-colors focus:border-[color:var(--bora-gold)]"
                    style={{
                      backgroundColor: 'var(--bora-background-deep)',
                      borderColor: dirty
                        ? 'var(--bora-gold)'
                        : 'var(--bora-border)',
                      color: 'var(--bora-text)',
                    }}
                  />

                  <p
                    className="mt-1 text-[6px] uppercase tracking-[0.12em]"
                    style={{ color: 'var(--bora-text-subtle)' }}
                  >
                    {fieldValue.length}/
                    {MAX_PUBLIC_SECTION_LABEL_LENGTH}
                  </p>
                </div>

                {/* VISIBILITY */}
                <button
                  type="button"
                  onClick={() => store.toggleNavigationSection(id)}
                  disabled={!canHide}
                  aria-pressed={!hidden}
                  aria-label={
                    hidden
                      ? `Show ${canonicalLabel}`
                      : `Hide ${canonicalLabel}`
                  }
                  title={
                    canHide
                      ? undefined
                      : 'At least one section must stay visible'
                  }
                  className="flex shrink-0 items-center gap-1 border px-2 py-1.5 text-[7px] font-black uppercase tracking-[0.12em] transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    borderColor: hidden
                      ? 'var(--bora-border)'
                      : 'var(--bora-gold)',
                    color: hidden
                      ? 'var(--bora-text-subtle)'
                      : 'var(--bora-gold)',
                  }}
                >
                  {hidden ? (
                    <EyeOff size={10} strokeWidth={2} />
                  ) : (
                    <Eye size={10} strokeWidth={2} />
                  )}
                  {hidden ? 'Hidden' : 'Visible'}
                </button>

                {/* PER-SECTION RESET */}
                <button
                  type="button"
                  onClick={() => store.resetNavigationSection(id)}
                  disabled={!dirty}
                  aria-label={`Reset ${canonicalLabel}`}
                  className={`${miniButtonClass} shrink-0 px-1.5 py-1.5`}
                  style={{
                    borderColor: 'var(--bora-border)',
                    color: 'var(--bora-text-muted)',
                  }}
                >
                  <RotateCcw size={10} strokeWidth={2} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p
        className="px-4 pb-3 text-[6px] uppercase tracking-[0.14em]"
        style={{ color: 'var(--bora-text-subtle)' }}
      >
        {visibleCount} of {navigation.order.length} visible. Hidden
        entries keep their section content — only the navbar entry is
        removed. Section ids are fixed and are not editable.
      </p>
    </div>
  );
}
