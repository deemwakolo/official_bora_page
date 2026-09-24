'use client';

import type { OperationsSaveStatus } from '../OperationsOP';

interface OperationsSaveBarProps {
  status: OperationsSaveStatus;
  message: string | null;
  dirtyCount: number;
  onSave: () => void;
  onDiscard: () => void;
}

/*
 * BORA OPERATIONS SAVE BAR
 *
 * Hii ni control ya room nzima: inakaa DIRECTLY chini ya Operations
 * navigation, si button inayoelea chini ya viewport.
 *
 * Drafts ni local. Save ni commit point MOJA ya Operations.
 * 'Saved' inaonekana TU pale write ya kweli inapofanikiwa —
 * kwa sasa write service haipo, hivyo hali inasema ukweli.
 */
export default function OperationsSaveBar({
  status,
  message,
  dirtyCount,
  onSave,
  onDiscard,
}: OperationsSaveBarProps) {
  const tone =
    status === 'unsaved'
      ? 'var(--bora-gold)'
      : status === 'saving'
        ? 'var(--bora-text)'
        : status === 'saved'
          ? 'var(--bora-green)'
          : status === 'error'
            ? 'var(--bora-red)'
            : 'var(--bora-text-subtle)';

  const label =
    status === 'unsaved'
      ? 'Unsaved'
      : status === 'saving'
        ? 'Saving'
        : status === 'saved'
          ? 'Saved'
          : status === 'error'
            ? 'Error'
            : 'Clean';

  const detail =
    message ??
    (status === 'unsaved'
      ? 'Local draft held — nothing is written until Save.'
      : status === 'saving'
        ? 'Committing Operations draft...'
        : status === 'saved'
          ? 'Operations draft committed.'
          : status === 'clean'
            ? 'No pending Operations changes.'
            : 'Nothing was saved.');

  const canSave = status === 'unsaved';

  const canDiscard =
    status === 'unsaved' || status === 'error';

  return (
    <div
      className="mt-3 flex w-full flex-col gap-3 border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
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

          {dirtyCount > 0 && (
            <span
              className="text-[6px] font-black uppercase tracking-[0.14em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              {dirtyCount}{' '}
              {dirtyCount === 1 ? 'Song' : 'Songs'}
            </span>
          )}
        </div>

        <p
          className="mt-1 text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {detail}
        </p>
      </div>

      {/* COMMIT CONTROLS */}

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onDiscard}
          disabled={!canDiscard}
          className="border px-4 py-3 text-[8px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)] disabled:cursor-not-allowed"
          style={{
            borderColor: canDiscard
              ? 'var(--bora-border-strong)'
              : 'var(--bora-border)',
            color: canDiscard
              ? 'var(--bora-text-muted)'
              : 'var(--bora-text-subtle)',
          }}
        >
          Discard
        </button>

        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="border px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)] disabled:cursor-not-allowed"
          style={{
            borderColor: canSave
              ? 'var(--bora-gold)'
              : 'var(--bora-border)',
            color: canSave
              ? 'var(--bora-gold)'
              : 'var(--bora-text-subtle)',
            backgroundColor: canSave
              ? 'color-mix(in srgb, var(--bora-gold) 6%, transparent)'
              : 'transparent',
            boxShadow: canSave
              ? '0 0 22px var(--bora-gold-glow)'
              : 'none',
          }}
        >
          Save Operations
        </button>
      </div>
    </div>
  );
}
