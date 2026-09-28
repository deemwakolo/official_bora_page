'use client';

import React, { useCallback, useEffect, useRef } from 'react';

import {
  MousePointerClick,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

import {
  isBoraUIPreviewMessage,
  type BoraUIEditorMessage,
} from '../../../components/ui-room/boraUIProtocol';

import {
  toCssStyleMap,
  type UIRoomStore,
} from '../lib/uiDraftStore';

import {
  UI_CANVAS_ROUTE,
  UI_VIEWPORT_PRESETS,
} from '../lib/uiRegistry';

/*
 * BORA UI ROOM — LIVE PREVIEW
 *
 * The canvas is the REAL BORA public app inside an iframe, talking
 * to BoraUIBridge over the typed protocol. No mockup and no second
 * copy of the frontend: whatever the public app renders (including
 * live Supabase data) is what the admin edits.
 */

interface UIPreviewProps {
  store: UIRoomStore;
  onReload: () => void;
}

export default function UIPreview({
  store,
  onReload,
}: UIPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [frameReady, setFrameReady] = React.useState(false);

  const send = useCallback(
    (message: BoraUIEditorMessage) => {
      frameRef.current?.contentWindow?.postMessage(
        message,
        window.location.origin
      );
    },
    []
  );

  /* ── ACTIVATE + LISTEN ─────────────────────────────────── */

  // Destructure the stable actions: they are useCallbacks, so the
  // listener stays attached instead of resubscribing every render.
  const {
    connect,
    setHoveredTarget,
    setSelectedTarget,
    setPreviewSection,
  } = store;

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) {
        return;
      }

      // Same-origin check: the preview is the real public app on
      // this origin. Anything else is ignored.
      if (event.origin !== window.location.origin) return;

      if (!isBoraUIPreviewMessage(event.data)) return;

      const message = event.data;

      switch (message.type) {
        case 'bora-ui:ready':
          setFrameReady(true);
          send({ type: 'bora-ui:activate' });
          break;

        case 'bora-ui:state':
          connect(message.state);
          break;

        case 'bora-ui:hovered-target':
          setHoveredTarget(message.targetId);
          break;

        case 'bora-ui:selected-target':
          setSelectedTarget(message.targetId);
          break;

        case 'bora-ui:section-changed':
          setPreviewSection(message.section);
          break;
      }
    };

    window.addEventListener('message', onMessage);

    return () =>
      window.removeEventListener('message', onMessage);
  }, [
    connect,
    send,
    setHoveredTarget,
    setPreviewSection,
    setSelectedTarget,
  ]);

  useEffect(() => {
    if (!frameReady) return;

    send({
      type: 'bora-ui:apply-tokens',
      tokens: store.effectiveTokens,
    });
  }, [frameReady, send, store.effectiveTokens]);

  // Target drafts: the editor must also tell the bridge about a
  // target whose draft was CLEARED (Reset / Undo / Discard), so the
  // bridge can drop the override. Tracking what was already sent is
  // what makes "leaving without Save" a true no-op in the preview.
  const sentTargetsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!frameReady) return;

    const draftTargets = store.draft.targets;
    const targets = new Set([
      ...Object.keys(draftTargets),
      ...sentTargetsRef.current,
    ]);

    for (const targetId of targets) {
      send({
        type: 'bora-ui:apply-styles',
        targetId,
        styles: toCssStyleMap(targetId, draftTargets),
      });
    }

    sentTargetsRef.current = targets;
  }, [frameReady, send, store.draft.targets]);

  // Responsive drafts travel as structured Base / SM / MD / LG
  // values; the bridge turns them into a scoped stylesheet. Sent
  // whole, so clearing a breakpoint REMOVES its rule (inherit).
  useEffect(() => {
    if (!frameReady) return;

    send({
      type: 'bora-ui:apply-responsive',
      responsive: store.draft.responsive,
    });
  }, [frameReady, send, store.draft.responsive]);

  // Structural navigation draft. Sent whole, so a cleared block
  // (Reset / Undo / Discard) RESTORES the navbar instead of leaving a
  // previous draft applied.
  useEffect(() => {
    if (!frameReady) return;

    send({
      type: 'bora-ui:apply-navigation',
      navigation: store.draft.navigation ?? null,
    });
  }, [frameReady, send, store.draft.navigation]);

  useEffect(() => {
    if (!frameReady) return;

    send({
      type: 'bora-ui:select-target',
      targetId: store.selectedTargetId,
    });
  }, [frameReady, send, store.selectedTargetId]);

  useEffect(() => {
    if (!frameReady) return;

    send({ type: 'bora-ui:set-pick-mode', enabled: store.pickMode });
  }, [frameReady, send, store.pickMode]);

  useEffect(() => {
    if (!frameReady) return;

    send({ type: 'bora-ui:viewport', viewport: store.viewport });
  }, [frameReady, send, store.viewport]);

  const preset =
    UI_VIEWPORT_PRESETS.find(
      (entry) => entry.id === store.viewport
    ) ?? UI_VIEWPORT_PRESETS[2];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* CANVAS TOOLBAR */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => store.setPickMode(!store.pickMode)}
            aria-pressed={store.pickMode}
            className="flex items-center gap-2 border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] transition-all duration-300"
            style={{
              borderColor: store.pickMode
                ? 'var(--bora-gold)'
                : 'var(--bora-border)',
              color: store.pickMode
                ? 'var(--bora-gold)'
                : 'var(--bora-text-muted)',
              backgroundColor: store.pickMode
                ? 'color-mix(in srgb, var(--bora-gold) 8%, transparent)'
                : 'transparent',
            }}
          >
            <MousePointerClick size={12} strokeWidth={1.8} />
            Pick
          </button>

          <button
            type="button"
            onClick={onReload}
            aria-label="Reload preview"
            className="flex items-center gap-2 border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] transition-all duration-300"
            style={{
              borderColor: 'var(--bora-border)',
              color: 'var(--bora-text-muted)',
            }}
          >
            <RefreshCw size={12} strokeWidth={1.8} />
            Reload
          </button>

          <a
            href={UI_CANVAS_ROUTE}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 border px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] transition-all duration-300"
            style={{
              borderColor: 'var(--bora-border)',
              color: 'var(--bora-text-muted)',
            }}
          >
            <ExternalLink size={12} strokeWidth={1.8} />
            Open
          </a>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-[7px] font-black uppercase tracking-[0.16em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            {store.source.section ?? '—'} ·{' '}
            {store.source.width || 0}px
          </span>

          <span
            className="flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.16em]"
            style={{
              color: store.source.connected
                ? 'var(--bora-green)'
                : 'var(--bora-text-subtle)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: store.source.connected
                  ? 'var(--bora-green)'
                  : 'var(--bora-text-subtle)',
              }}
            />
            {store.source.connected ? 'Bridge live' : 'Connecting'}
          </span>
        </div>
      </div>

      {/* CANVAS */}
      <div
        className="flex flex-1 items-start justify-center overflow-auto p-5"
        style={{ backgroundColor: 'var(--bora-background-deep)' }}
      >
        <div className="relative">
          <div
            className="mb-2 flex items-center justify-between text-[7px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            <span>{UI_CANVAS_ROUTE}</span>
            <span>{preset?.note}</span>
          </div>

          <iframe
            ref={frameRef}
            src={UI_CANVAS_ROUTE}
            title="BORA public preview"
            onLoad={() => {
              setFrameReady(false);
              send({ type: 'bora-ui:refresh-state' });
            }}
            className="border"
            style={{
              width: preset?.width ?? 1280,
              height: preset?.height ?? 800,
              maxWidth: '100%',
              borderColor: 'var(--bora-border-strong)',
              backgroundColor: 'var(--bora-background)',
              color: 'var(--bora-text)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
