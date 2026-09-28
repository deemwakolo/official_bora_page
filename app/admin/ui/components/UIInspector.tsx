'use client';

import React, { useState } from 'react';

import { Check } from 'lucide-react';

import {
  buildPropertyRows,
  targetKey,
  tokenKey,
  type UIRoomStore,
} from '../lib/uiDraftStore';

import {
  BORA_UI_ALL_TARGETS,
  BORA_UI_TARGETS,
  BORA_UI_GROUP_ORDER,
  BORA_UI_TOKENS,
  BORA_UI_TOKEN_GROUPS,
  BORA_UI_TYPOGRAPHY_TOKENS,
  BORA_UI_VISIBILITY,
  findUIRoomArea,
  UI_VIEWPORT_PRESETS,
} from '../lib/uiRegistry';

import { BORA_UI_GRADIENT_DEFINITIONS } from '../../../components/ui-room/boraUIGradient';

import {
  BORA_PALETTES,
  boraPaletteTokens,
} from '../../../components/components-themes/tokens/boraPalettes';

import type { UIRoomArea } from '../lib/uiTypes';

import type { BoraUITokenGroup } from '../../../components/ui-room/boraUITokens';

import type {
  BoraUIPropertySchema,
  BoraUITargetSchema,
} from '../../../components/ui-room/boraUIProtocol';

import UIPropertyControl from './UIPropertyControl';

import NavigationStructurePanel from './NavigationStructurePanel';

/*
 * BORA UI ROOM — INSPECTOR
 *
 * The inspector never hardcodes a field. It renders whatever the
 * registry declares: tokens for DESIGN SYSTEM, target properties for
 * a selected component, presets for RESPONSIVE, the visibility model
 * for VISIBILITY.
 */

function PanelTitle({
  children,
  note,
}: {
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="border-b px-4 py-3">
      <p
        className="font-cinzel text-[10px] font-black uppercase tracking-[0.18em]"
        style={{ color: 'var(--bora-text)' }}
      >
        {children}
      </p>

      {note && (
        <p
          className="mt-1 text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {note}
        </p>
      )}
    </div>
  );
}

function Row({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="border-b px-4 py-3"
      style={{ borderColor: 'var(--bora-border)' }}
    >
      {children}
    </div>
  );
}

/* ── DESIGN SYSTEM (TOKENS) ───────────────────────────────── */

function TokenGroupPanel({
  group,
  store,
  properties: explicitProperties,
}: {
  group: BoraUITokenGroup;
  store: UIRoomStore;
  /** Optional override so a panel can render its own token set. */
  properties?: readonly BoraUIPropertySchema[];
}) {
  const properties =
    explicitProperties ??
    BORA_UI_TOKENS.filter(
      (entry) => entry.category === group.category
    );

  if (group.status === 'planned') {
    return (
      <Row>
        <p
          className="text-[7px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {group.label} — not registered
        </p>

        <p
          className="mt-1 text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {group.note}
        </p>
      </Row>
    );
  }

  const rows = buildPropertyRows(
    properties,
    store.paletteTokens,
    store.draft.tokens,
    tokenKey
  );

  return (
    <div>
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >
        <p
          className="text-[7px] font-black uppercase tracking-[0.2em]"
          style={{ color: 'var(--bora-gold)' }}
        >
          {group.label}
        </p>

        <p
          className="text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {properties.length} tokens
        </p>
      </div>

      <div className="space-y-3 px-4 py-3">
        {rows.map((row) => (
          <UIPropertyControl
            key={row.property.id}
            row={row}
            onChange={(value) =>
              store.setToken(tokenKey(row.property), value)
            }
            onReset={() =>
              store.resetToken(tokenKey(row.property))
            }
          />
        ))}
      </div>
    </div>
  );
}

/* ── TARGETS (COMPONENTS / NAVIGATION) ────────────────────── */

function TargetListPanel({
  targetIds,
  store,
}: {
  targetIds: readonly string[];
  store: UIRoomStore;
}) {
  // The registry holds ~90 targets, so the list needs a filter to
  // stay navigable. Filtering is local UI state only — it never
  // touches the draft.
  const [query, setQuery] = useState('');

  const scoped = BORA_UI_ALL_TARGETS.filter(
    (target) => targetIds.length === 0 || targetIds.includes(target.id)
  );

  const needle = query.trim().toLowerCase();

  const targets = needle
    ? scoped.filter((target) =>
        `${target.label} ${target.description} ${target.id}`
          .toLowerCase()
          .includes(needle)
      )
    : scoped;

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter targets"
          aria-label="Filter targets"
          className="w-full border px-2 py-1.5 text-[8px] outline-none transition-colors placeholder:text-[color:var(--bora-text-subtle)] focus:border-[color:var(--bora-gold)]"
          style={{
            backgroundColor: 'var(--bora-background-deep)',
            borderColor: 'var(--bora-border)',
            color: 'var(--bora-text)',
          }}
        />

        <span
          className="shrink-0 text-[6px] font-black uppercase tracking-[0.12em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {targets.length}/{scoped.length}
        </span>
      </div>

      {targets.length === 0 ? (
        <p
          className="px-1 py-3 text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          No target matches “{query}”.
        </p>
      ) : (
        <div className="space-y-1">
          {targets.map((target) => {
        const active = store.selectedTargetId === target.id;
        const instances =
          store.source.instances[target.id] ?? 0;

        return (
          <button
            key={target.id}
            type="button"
            onClick={() =>
              store.setSelectedTarget(active ? null : target.id)
            }
            className="flex w-full items-center justify-between gap-2 border px-3 py-2 text-left transition-all duration-300"
            style={{
              borderColor: active
                ? 'var(--bora-gold)'
                : 'var(--bora-border)',
              backgroundColor: active
                ? 'color-mix(in srgb, var(--bora-gold) 7%, transparent)'
                : 'transparent',
            }}
          >
            <span className="min-w-0">
              <span
                className="block truncate text-[8px] font-black uppercase tracking-[0.14em]"
                style={{
                  color: active
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text)',
                }}
              >
                {target.label}
              </span>

              <span
                className="mt-0.5 block truncate text-[6px] uppercase tracking-[0.12em]"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                {target.description}
              </span>
            </span>

            <span
              className="shrink-0 text-[6px] font-black uppercase tracking-[0.12em]"
              style={{
                color: instances > 0
                  ? 'var(--bora-text-muted)'
                  : 'var(--bora-text-subtle)',
              }}
            >
              {instances}×
            </span>
          </button>
        );
      })}
        </div>
      )}
    </div>
  );
}

/* ── PALETTE (Phase 2) ──────────────────────────────────────
 *
 * BORA Palette is a UI Room design-system control. It is NOT the
 * user's Black/White theme, which stays a viewer preference outside
 * this room. Only curated presets — no custom combinations.
 */

function PalettePanel({ store }: { store: UIRoomStore }) {
  return (
    <div className="space-y-1 p-3">
      {BORA_PALETTES.map((palette) => {
        const active = store.paletteId === palette.id;
        const isSource = store.sourcePaletteId === palette.id;

        return (
          <button
            key={palette.id}
            type="button"
            onClick={() => store.setPalette(palette.id)}
            className="flex w-full items-center justify-between gap-2 border px-3 py-2.5 text-left transition-all duration-300"
            style={{
              borderColor: active
                ? 'var(--bora-gold)'
                : 'var(--bora-border)',
              backgroundColor: active
                ? 'color-mix(in srgb, var(--bora-gold) 7%, transparent)'
                : 'transparent',
            }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex shrink-0 items-center gap-0.5">
                {(
                  ['--bora-background', '--bora-gold', '--bora-red'] as const
                ).map((name) => (
                  <span
                    key={name}
                    className="h-3 w-3 border"
                    style={{
                      backgroundColor:
                        boraPaletteTokens(palette.id)[name],
                      borderColor: 'var(--bora-border-strong)',
                    }}
                  />
                ))}
              </span>

              <span className="min-w-0">
                <span
                  className="block truncate text-[8px] font-black uppercase tracking-[0.14em]"
                  style={{
                    color: active
                      ? 'var(--bora-gold)'
                      : 'var(--bora-text)',
                  }}
                >
                  {palette.label}
                </span>

                <span
                  className="mt-0.5 block truncate text-[6px] uppercase tracking-[0.12em]"
                  style={{ color: 'var(--bora-text-subtle)' }}
                >
                  {palette.description}
                </span>
              </span>
            </span>

            {isSource && (
              <span
                className="shrink-0 text-[6px] font-black uppercase tracking-[0.12em]"
                style={{ color: 'var(--bora-text-muted)' }}
              >
                In preview
              </span>
            )}
          </button>
        );
      })}

      <p
        className="px-1 pt-2 text-[6px] uppercase tracking-[0.14em]"
        style={{ color: 'var(--bora-text-subtle)' }}
      >
        Applies the whole token family as one preset. The
        viewer&apos;s Black/White toggle stays a user preference.
      </p>
    </div>
  );
}

/* ── GRADIENTS (Design System -> Gradients) ─────────────────
 *
 * This is the ONE authoritative editing surface for gradient
 * definitions. The target inspector does not duplicate it: a target
 * will eventually CHOOSE a gradient here, not edit one.
 *
 * The draft is the existing target draft, so Undo / Redo / Reset /
 * Save Draft and the live preview all behave exactly as before.
 */

function GradientPanel({ store }: { store: UIRoomStore }) {
  return (
    <>
      {/* SECTION HEADING — keeps Gradients discoverable in Design
          System, alongside Palette / Colors / … / Effects. */}
      <div
        className="border-b"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <PanelTitle note="Gradient definitions used by BORA">
          Gradients
        </PanelTitle>

        {BORA_UI_GRADIENT_DEFINITIONS.map((definition) => {
        const rows = buildPropertyRows(
          [definition.property],
          store.source.targets[definition.targetId] ?? {},
          store.draft.targets[definition.targetId] ?? {},
          targetKey
        );

        return (
          <div key={definition.id}>
            <div
              className="flex items-center justify-between border-b px-4 py-2"
              style={{
                borderColor: 'var(--bora-border)',
                backgroundColor: 'var(--bora-surface)',
              }}
            >
              <div className="min-w-0">
                <p
                  className="truncate text-[7px] font-black uppercase tracking-[0.2em]"
                  style={{ color: 'var(--bora-gold)' }}
                >
                  {definition.label}
                </p>

                <p
                  className="mt-0.5 truncate text-[6px] uppercase tracking-[0.12em]"
                  style={{ color: 'var(--bora-text-subtle)' }}
                >
                  {definition.description}
                </p>
              </div>

              <span
                className="shrink-0 text-[6px] font-black uppercase tracking-[0.12em]"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                {definition.targetId}
              </span>
            </div>

            <div className="space-y-3 px-4 py-3">
              {rows.map((row) => (
                <UIPropertyControl
                  key={row.property.id}
                  row={row}
                  onChange={(value) =>
                    store.setTargetProperty(
                      definition.targetId,
                      row.property.id,
                      value
                    )
                  }
                  onReset={() =>
                    store.resetTarget(definition.targetId)
                  }
                />
              ))}
            </div>
          </div>
        );
        })}
      </div>
    </>
  );
}

/* ── SELECTED TARGET PROPERTIES ───────────────────────────── */

function TargetPropertyPanel({
  target,
  store,
}: {
  target: BoraUITargetSchema;
  store: UIRoomStore;
}) {
  // Honest empty state: the target is selectable and pickable, but
  // no property is editable yet. Say so instead of showing a blank
  // panel that reads as a bug.
  if (target.properties.length === 0) {
    return (
      <div>
        <div
          className="flex items-center justify-between border-b px-4 py-2"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
          }}
        >
          <p
            className="text-[7px] font-black uppercase tracking-[0.2em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            {target.label}
          </p>
        </div>

        <p
          className="px-4 py-4 text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          No editable properties yet. This target is registered and
          selectable for future control work.
        </p>
      </div>
    );
  }

  const rows = buildPropertyRows(
    target.properties,
    store.source.targets[target.id] ?? {},
    store.draft.targets[target.id] ?? {},
    targetKey
  );

  const grouped = new Map<string, typeof rows>();

  for (const row of rows) {
    const key = row.property.category;
    const bucket = grouped.get(key) ?? [];

    bucket.push(row);
    grouped.set(key, bucket);
  }

  return (
    <div>
      <div
        className="flex items-center justify-between border-b px-4 py-2"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >
        <p
          className="text-[7px] font-black uppercase tracking-[0.2em]"
          style={{ color: 'var(--bora-gold)' }}
        >
          {target.label}
        </p>

        <button
          type="button"
          onClick={() => store.resetTarget(target.id)}
          className="text-[6px] font-black uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          Reset target
        </button>
      </div>

      {[...grouped.entries()].map(([category, groupRows]) => (
        <div key={category}>
          <p
            className="px-4 pt-3 text-[6px] font-black uppercase tracking-[0.2em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            {category}
          </p>

          <div className="space-y-3 px-4 py-3">
            {groupRows.map((row) => (
              <UIPropertyControl
                key={row.property.id}
                row={row}
                onChange={(value) =>
                  store.setTargetProperty(
                    target.id,
                    row.property.id,
                    value
                  )
                }
                onReset={() =>
                  store.resetTargetProperty(
                    target.id,
                    row.property.id
                  )
                }
                responsiveValues={
                  store.draft.responsive[target.id]?.[
                    row.property.id
                  ]
                }
                onResponsiveChange={(
                  breakpoint,
                  value
                ) =>
                  store.setResponsiveProperty(
                    target.id,
                    row.property.id,
                    breakpoint,
                    value
                  )
                }
                onResponsiveReset={() =>
                  store.resetResponsiveProperty(
                    target.id,
                    row.property.id
                  )
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── RESPONSIVE ───────────────────────────────────────────── */

function ViewportPanel({ store }: { store: UIRoomStore }) {
  return (
    <div className="space-y-2 p-3">
      {UI_VIEWPORT_PRESETS.map((preset) => {
        const active = store.viewport === preset.id;

        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => store.setViewport(preset.id)}
            className="flex w-full items-center justify-between border px-3 py-2.5 transition-all duration-300"
            style={{
              borderColor: active
                ? 'var(--bora-gold)'
                : 'var(--bora-border)',
              backgroundColor: active
                ? 'color-mix(in srgb, var(--bora-gold) 7%, transparent)'
                : 'transparent',
            }}
          >
            <span
              className="text-[8px] font-black uppercase tracking-[0.16em]"
              style={{
                color: active
                  ? 'var(--bora-gold)'
                  : 'var(--bora-text)',
              }}
            >
              {preset.label}
            </span>

            <span
              className="text-[6px] uppercase tracking-[0.14em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              {preset.note}
            </span>
          </button>
        );
      })}

      <p
        className="px-1 pt-2 text-[6px] uppercase tracking-[0.14em]"
        style={{ color: 'var(--bora-text-subtle)' }}
      >
        One iframe, three sizes. No duplicate frontend is
        rendered. Live width: {store.source.width || 0}px.
      </p>
    </div>
  );
}

/* ── VISIBILITY MODEL ─────────────────────────────────────── */

function VisibilityPanel() {
  return (
    <div className="space-y-1 p-3">
      {BORA_UI_VISIBILITY.map((entry) => (
        <div
          key={entry.targetId}
          className="flex items-center justify-between gap-2 border px-3 py-2"
          style={{ borderColor: 'var(--bora-border)' }}
        >
          <span className="min-w-0">
            <span
              className="block truncate text-[8px] font-black uppercase tracking-[0.14em]"
              style={{ color: 'var(--bora-text)' }}
            >
              {entry.label}
            </span>

            <span
              className="mt-0.5 block truncate text-[6px] uppercase tracking-[0.12em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              {entry.note}
            </span>
          </span>

          <span
            className="flex shrink-0 items-center gap-1 text-[6px] font-black uppercase tracking-[0.12em]"
            style={{ color: 'var(--bora-green)' }}
          >
            <Check size={11} strokeWidth={2} />
            {entry.visibility}
          </span>
        </div>
      ))}

      <p
        className="px-1 pt-2 text-[6px] uppercase tracking-[0.14em]"
        style={{ color: 'var(--bora-text-subtle)' }}
      >
        Model prepared only. No public section is hidden by the
        UI Room.
      </p>
    </div>
  );
}

/* ── MAIN INSPECTOR ───────────────────────────────────────── */

interface UIInspectorProps {
  store: UIRoomStore;
  area: UIRoomArea;
}

export default function UIInspector({
  store,
  area,
}: UIInspectorProps) {
  const areaDefinition = findUIRoomArea(area);

  const selectedTarget = store.selectedTargetId
    ? BORA_UI_ALL_TARGETS.find(
        (target) => target.id === store.selectedTargetId
      )
    : undefined;

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-l md:w-[360px]"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-background)',
      }}
    >
      <PanelTitle note={areaDefinition?.description}>
        {areaDefinition?.label ?? 'Inspector'}
      </PanelTitle>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {area === 'design-system' && (
          <>
            {/* PALETTE — curated presets, design-system control */}
            <div
              className="border-b"
              style={{ borderColor: 'var(--bora-border)' }}
            >
              <PanelTitle note="Curated BORA palettes">
                Palette
              </PanelTitle>

              <PalettePanel store={store} />
            </div>

            {BORA_UI_TOKEN_GROUPS.map((group) => {
              const order =
                BORA_UI_GROUP_ORDER.indexOf(group.category);

              return { group, order };
            })
              .sort((a, b) => a.order - b.order)
              .map(({ group }) =>
                group.category === 'gradients' ? (
                  <GradientPanel
                    key={group.category}
                    store={store}
                  />
                ) : (
                  <TokenGroupPanel
                    key={group.category}
                    group={group}
                    store={store}
                    properties={
                      group.category === 'typography'
                        ? BORA_UI_TYPOGRAPHY_TOKENS
                        : undefined
                    }
                  />
                )
              )}
          </>
        )}

        {(area === 'navigation' ||
          area === 'components') && (
          <>
            {/* NAVIGATION AREA ONLY: structural order / visibility /
                labels supplement the scalar target controls below. The
                components area shows targets only, because structure
                is a property of the public navbar, not of sections. */}
            {area === 'navigation' && (
              <NavigationStructurePanel store={store} />
            )}

            <TargetListPanel
              targetIds={areaDefinition?.targetIds ?? []}
              store={store}
            />

            {selectedTarget ? (
              <div
                className="border-t"
                style={{
                  borderColor: 'var(--bora-border)',
                }}
              >
                <TargetPropertyPanel
                  target={selectedTarget}
                  store={store}
                />
              </div>
            ) : (
              <p
                className="px-4 py-4 text-[6px] uppercase tracking-[0.14em]"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                {store.hoveredTargetId
                  ? `Hovering: ${store.hoveredTargetId}`
                  : 'Turn on Pick and click a component in the preview — or choose a target above.'}
              </p>
            )}
          </>
        )}

        {area === 'responsive' && (
          <ViewportPanel store={store} />
        )}

        {area === 'visibility' && <VisibilityPanel />}
      </div>
    </aside>
  );
}
