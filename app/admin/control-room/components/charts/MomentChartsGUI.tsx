'use client';

import type { MomentSong } from '@/app/components/charts/MomentChart';

import MomentChartsEntryEditor from './MomentChartsEntryEditor';
import MomentChartsNav, {
  type MomentChartsPeriod,
} from './MomentChartsNav';
import MomentChartsRankList from './MomentChartsRankList';
import MomentChartsStatePanel from './MomentChartsStatePanel';

import type { MomentSongField } from './MomentChartsSongFields';

export type MomentChartsDataState = 'loading' | 'ready' | 'error';

export type { MomentChartsPeriod };

interface MomentChartsGUIProps {
  activePeriod: MomentChartsPeriod;
  dataState: MomentChartsDataState;
  dataError: string | null;
  weeklyLabel: string;
  monthlyLabel: string;
  readOnlyLabel: string;
  songs: MomentSong[];
  selectedRank: number | null;
  dirtyRanks: number[];
  onSelectPeriod: (period: MomentChartsPeriod) => void;
  onSelectRank: (rank: number) => void;
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
  onReload: () => void;
}

export default function MomentChartsGUI(props: MomentChartsGUIProps) {
  const {
    activePeriod,
    dataState,
    dataError,
    weeklyLabel,
    monthlyLabel,
    readOnlyLabel,
    songs,
    selectedRank,
    dirtyRanks,
    onSelectPeriod,
    onSelectRank,
    onChangeSongField,
    onChangeMovement,
    onRevertEntry,
    onReload,
  } = props;
  const dataColor =
    dataState === 'loading'
      ? 'var(--bora-gold)'
      : dataState === 'error'
        ? 'var(--bora-red)'
        : 'var(--bora-green)';
  const dataLabel =
    dataState === 'loading'
      ? 'Reading moment charts data'
      : dataState === 'error'
        ? 'Moment charts data unavailable'
        : 'Moment charts data ready';
  const selectedSong =
    songs.find((song) => song.rank === selectedRank) ?? null;

  const showLoading = dataState === 'loading';
  const showError = !showLoading && dataState === 'error';
  const showEmpty = !showLoading && !showError && songs.length === 0;
  const showEditor = !showLoading && !showError && !showEmpty;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-5 md:px-8">
      <div
        className="w-full border"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-background-deep)',
        }}
      >
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
          <div className="min-w-0">
            <p
              className="text-[7px] font-black uppercase tracking-[0.24em]"
              style={{ color: 'var(--bora-gold)' }}
            >
              BORA Admin
            </p>
            <h2 className="mt-2 font-cinzel text-lg font-black uppercase tracking-[0.14em] sm:text-xl">
              Moment Charts
            </h2>
            <p
              className="mt-2 text-[7px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              Weekly · Monthly · Historical Editions
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                dataState === 'loading' ? 'animate-pulse' : ''
              }`}
              style={{ backgroundColor: dataColor }}
            />
            <span
              className="text-[7px] font-black uppercase tracking-[0.18em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              {dataLabel}
            </span>
          </div>
        </div>
      </div>
      <MomentChartsNav
        activePeriod={activePeriod}
        weeklyLabel={weeklyLabel}
        monthlyLabel={monthlyLabel}
        onSelect={onSelectPeriod}
      />
      <div
        className="mt-3 flex w-full flex-col gap-3 border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >
        <div className="min-w-0" role="status" aria-live="polite">
          <p
            className="text-[7px] font-black uppercase tracking-[0.2em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Read Only
          </p>
          <p
            className="mt-1 text-[6px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            {readOnlyLabel}
          </p>
        </div>
      </div>
      <div className="mt-3">
        {showLoading && (
          <MomentChartsStatePanel
            title="Reading Moment Charts"
            lines={[
              'Chart editions are being read from Supabase.',
            ]}
          />
        )}

        {showError && (
          <MomentChartsStatePanel
            tone="error"
            title="Moment Charts Unavailable"
            lines={[
              dataError ?? 'Moment charts data source unavailable.',
              'Nothing is displayed because no edition was read.',
            ]}
            onRetry={onReload}
          />
        )}

        {showEmpty && (
          <MomentChartsStatePanel
            title="No Moment Chart Edition"
            lines={[
              'No published edition exists for this period.',
              'Editions appear here once real records exist.',
            ]}
            onRetry={onReload}
          />
        )}

        {showEditor && (
          <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <MomentChartsRankList
              songs={songs}
              selectedRank={selectedRank}
              dirtyRanks={dirtyRanks}
              onSelectRank={onSelectRank}
            />
            <MomentChartsEntryEditor
              entry={selectedSong}
              isDirty={
                selectedRank !== null &&
                dirtyRanks.includes(selectedRank)
              }
              onChangeSongField={onChangeSongField}
              onChangeMovement={onChangeMovement}
              onRevertEntry={onRevertEntry}
            />
          </div>
        )}
      </div>
    </div>
  );
}