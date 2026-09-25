'use client';

import type { MomentSong } from '@/app/components/charts/MomentChart';

import MomentChartsField from './MomentChartsField';

interface MomentChartsMovementFieldsProps {
  entry: MomentSong;
  fieldId: (name: string) => string;
  onChangeMovement: (
    rank: number,
    field: 'kind' | 'delta',
    value: string,
  ) => void;
}

export const movementKindLabels: Record<
  MomentSong['movement']['kind'],
  string
> = {
  up: 'Up',
  down: 'Down',
  same: 'Same',
  new: 'New',
};

export const movementKinds = [
  'up',
  'down',
  'same',
  'new',
] as const;

/*
 * BORA MOMENT CHARTS MOVEMENT FIELDS
 *
 * Movement Information only. Local drafts (STEP 6: no persistence).
 */
export default function MomentChartsMovementFields({
  entry,
  fieldId,
  onChangeMovement,
}: MomentChartsMovementFieldsProps) {
  return (
    <div>
      <p
        className="text-[7px] font-black uppercase tracking-[0.15em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        Movement Information
      </p>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <span
            className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Movement Kind
          </span>

          <div
            className="grid grid-cols-4 gap-2"
            role="group"
            aria-label={`Rank ${entry.rank} movement kind`}
          >
            {movementKinds.map((kind) => {
              const isActive = entry.movement.kind === kind;

              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() =>
                    onChangeMovement(entry.rank, 'kind', kind)
                  }
                  className="border px-2 py-3 text-[8px] font-black uppercase tracking-[0.12em] transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)]"
                  style={{
                    borderColor: isActive
                      ? 'var(--bora-gold)'
                      : 'var(--bora-border)',
                    color: isActive
                      ? 'var(--bora-gold)'
                      : 'var(--bora-text-muted)',
                    backgroundColor: isActive
                      ? 'color-mix(in srgb, var(--bora-gold) 6%, transparent)'
                      : 'transparent',
                  }}
                >
                  {movementKindLabels[kind]}
                </button>
              );
            })}
          </div>
        </div>

        <MomentChartsField
          id={fieldId('movement-delta')}
          label="Movement Delta"
          value={
            entry.movement.delta === undefined ||
            entry.movement.delta === null
              ? ''
              : String(entry.movement.delta)
          }
          placeholder={
            entry.movement.kind === 'up' ||
            entry.movement.kind === 'down'
              ? 'Positive number'
              : 'Empty for same / new'
          }
          onChange={(value) =>
            onChangeMovement(entry.rank, 'delta', value)
          }
        />
      </div>
    </div>
  );
}
