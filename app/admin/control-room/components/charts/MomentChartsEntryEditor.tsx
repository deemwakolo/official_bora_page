'use client';

import type { MomentSong } from '@/app/components/charts/MomentChart';

import MomentChartsSongFields, {
  type MomentSongField,
} from './MomentChartsSongFields';
import MomentChartsMovementFields, {
  movementKindLabels,
} from './MomentChartsMovementFields';

interface MomentChartsEntryEditorProps {
  entry: MomentSong | null;
  isDirty: boolean;
  onChangeSongField: (
    rank: number,
    field: MomentSongField,
    value: string,
  ) => void;
  onChangeMovement: (
    rank: number,
    field: 'kind' | 'delta',
    value: string,
  ) => void;
  onRevertEntry: (rank: number) => void;
}

/* RENDER */
export default function MomentChartsEntryEditor({
  entry,
  isDirty,
  onChangeSongField,
  onChangeMovement,
  onRevertEntry,
}: MomentChartsEntryEditorProps) {
  if (!entry) {
    return (
      <section
        aria-label="Moment chart entry editor"
        className="flex w-full flex-col border px-6 py-12 text-center"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >
        <p
          className="font-cinzel text-[10px] font-black uppercase leading-none tracking-[0.18em]"
          style={{ color: 'var(--bora-gold)' }}
        >
          No Rank Selected
        </p>
        <p
          className="mx-auto mt-2 max-w-[420px] text-[7px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          Select a rank from the chart list to inspect its song and
          movement information.
        </p>
      </section>
    );
  }

  const fieldId = (name: string) => `moment-entry-${entry.rank}-${name}`;
  const imgAlt = `${entry.metadata.title} artwork`;
  const moveDelta = ` · ${entry.movement.delta ?? 0}`;
  const moveTone = isDirty ? 'edited locally' : 'matches database';
  return (
    <section
      aria-label={`Moment chart rank ${entry.rank} editor`}
      className="flex w-full flex-col border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <div className="min-w-0">
          <p
            className="text-[7px] font-black uppercase tracking-[0.2em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            Rank {entry.rank} · Song + Movement
          </p>
          <p
            className="mt-1 truncate text-[6px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            {isDirty ? 'Unsaved draft — local only' : 'In sync with edition'}
          </p>
        </div>
        {isDirty && (
          <button
            type="button"
            onClick={() => onRevertEntry(entry.rank)}
            className="shrink-0 border px-3 py-2 text-[7px] font-black uppercase tracking-[0.15em] active:scale-[0.98]"
            style={{
              borderColor: 'var(--bora-border-strong)',
              color: 'var(--bora-text-muted)',
            }}
          >
            Revert
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,190px)_minmax(0,1fr)]">
        <div
          className="border-b p-4 sm:p-5 md:border-b-0 md:border-r"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor:
              'color-mix(in srgb, var(--bora-background-deep) 72%, transparent)',
          }}
        >
          <p
            className="font-cinzel text-4xl font-black leading-none"
            style={{ color: 'var(--bora-gold)' }}
          >
            {entry.rank}
          </p>
          <p
            className="mt-2 text-[6px] font-black uppercase tracking-[0.18em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            {movementKindLabels[entry.movement.kind]}
            {entry.movement.kind === 'up' ||
            entry.movement.kind === 'down'
              ? moveDelta
              : ''}
          </p>
          <div
            className="mx-auto mt-4 flex aspect-square w-full max-w-[150px] items-center justify-center overflow-hidden border"
            style={{
              borderColor: 'var(--bora-border-strong)',
              backgroundColor: 'var(--bora-background)',
            }}
          >
            {entry.metadata.artwork ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.metadata.artwork}
                alt={imgAlt}
                className="h-full w-full object-cover"
              />
            ) : (
              <span
                className="font-cinzel text-2xl"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                ♪
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-5">
          <MomentChartsSongFields
            entry={entry}
            fieldId={fieldId}
            onChangeSongField={onChangeSongField}
          />
          <MomentChartsMovementFields
            entry={entry}
            fieldId={fieldId}
            onChangeMovement={onChangeMovement}
          />
          <div
            className="flex items-center justify-between gap-3 border-t pt-3"
            style={{ borderColor: 'var(--bora-border)' }}
          >
            <span
              className="text-[6px] font-black uppercase tracking-[0.15em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              Local Draft State
            </span>
            <span
              className="truncate font-mono text-[7px]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              {moveTone}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}


