'use client';

import React from 'react';

import { Undo2, Redo2, RotateCcw, Save } from 'lucide-react';

import type { UIRoomStore } from '../lib/uiDraftStore';

/*
 * BORA UI ROOM — SAVE BAR
 *
 * Follows the Operations save-bar pattern: one commit point for the
 * room, honest states. Phase 1 commits to an in-memory session
 * store, and the bar says exactly that — no fake persistence.
 */

interface UISaveBarProps {
  store: UIRoomStore;
}

export default function UISaveBar({ store }: UISaveBarProps) {
  const status = store.status;

  const tone =
    status === 'draft'
      ? 'var(--bora-gold)'
      : status === 'saving'
        ? 'var(--bora-text)'
        : status === 'saved'
          ? 'var(--bora-green)'
          : status === 'error'
            ? 'var(--bora-red)'
            : 'var(--bora-text-subtle)';

  const label =
    status === 'draft'
      ? 'Draft'
      : status === 'saving'
        ? 'Saving'
        : status === 'saved'
          ? 'Saved'
          : status === 'error'
            ? 'Error'
            : 'Clean';

  const detail =
    store.message ??
    (status === 'clean'
      ? 'No pending UI changes. Preview matches source.'
      : status === 'draft'
        ? 'Local draft held — the public app is not modified.'
        : '');

  const canSave = status === 'draft' || status === 'error';

  return (
    <div
      className="flex w-full flex-col gap-3 border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      {/* STATUS */}
      <div
        className="min-w-0"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${
              status === 'saving' ? 'animate-pulse' : ''
            }`}
            style={{ backgroundColor: tone }}
          />

          <p
            className="text-[7px] font-black uppercase tracking-[0.2em]"
            style={{ color: tone }}
          >
            {label}
          </p>

          <span
            className="text-[6px] font-black uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            {store.dirtyCount}{' '}
            {store.dirtyCount === 1
              ? 'change'
              : 'changes'}
          </span>
        </div>

        <p
          className="mt-1 text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {detail}
        </p>

        {/* SAFETY BOUNDARY */}
        <p
          className="mt-1 text-[6px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--bora-gold)' }}
        >
          Preview only — nothing goes live until you press Save
        </p>
      </div>

      {/* COMMIT CONTROLS */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={store.undo}
          disabled={!store.canUndo}
          aria-label="Undo"
          className="flex items-center gap-1.5 border px-3 py-2.5 text-[8px] font-black uppercase tracking-[0.14em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: 'var(--bora-border)',
            color: 'var(--bora-text-muted)',
          }}
        >
          <Undo2 size={12} strokeWidth={1.8} />
          Undo
        </button>

        <button
          type="button"
          onClick={store.redo}
          disabled={!store.canRedo}
          aria-label="Redo"
          className="flex items-center gap-1.5 border px-3 py-2.5 text-[8px] font-black uppercase tracking-[0.14em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: 'var(--bora-border)',
            color: 'var(--bora-text-muted)',
          }}
        >
          <Redo2 size={12} strokeWidth={1.8} />
          Redo
        </button>

        <button
          type="button"
          onClick={store.discardAll}
          disabled={!store.isDirty}
          className="flex items-center gap-1.5 border px-3 py-2.5 text-[8px] font-black uppercase tracking-[0.14em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            borderColor: 'var(--bora-border-strong)',
            color: 'var(--bora-text-muted)',
          }}
        >
          <RotateCcw size={12} strokeWidth={1.8} />
          Reset
        </button>

        <button
          type="button"
          onClick={store.save}
          disabled={!canSave}
          className="flex items-center gap-2 border-2 px-6 py-3 text-[9px] font-black uppercase tracking-[0.18em] transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed"
          style={{
            /* SAVE IS THE COMMIT BOUNDARY: the only solid, filled
               action in the bar, so it can never be confused with
               Undo / Redo / Reset. */
            borderColor: canSave
              ? 'var(--bora-gold)'
              : 'var(--bora-border)',
            color: canSave
              ? 'var(--bora-selection-text)'
              : 'var(--bora-text-subtle)',
            backgroundColor: canSave
              ? 'var(--bora-gold)'
              : 'transparent',
            boxShadow: canSave
              ? '0 0 0 1px var(--bora-gold), 0 0 26px var(--bora-gold-glow), inset 0 -2px 0 rgba(0,0,0,0.25)'
              : 'none',
          }}
        >
          <Save size={14} strokeWidth={2.4} />
          Save Draft
        </button>
      </div>
    </div>
  );
}
