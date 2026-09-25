'use client';

import type { TrendingEntry } from '@/lib/trending-shared';

import TrendingRankList from './TrendingRankList';
import TrendingRowEditor from './TrendingRowEditor';
import TrendingSaveBar, {
  type TrendingSaveStatus,
} from './TrendingSaveBar';
import TrendingStatePanel from './TrendingStatePanel';

import type { TrendingPlatform } from '@/lib/trending-shared';

export type TrendingDataState =
  | 'loading'
  | 'ready'
  | 'error';

export type { TrendingSaveStatus };

export const TRENDING_PLATFORM_LABELS: Record<
  TrendingPlatform,
  string
> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  artist: 'Artists',
};

interface TrendingGUIProps {
  activePlatform: TrendingPlatform;
  dataState: TrendingDataState;
  dataError: string | null;
  rows: TrendingEntry[];
  selectedRank: number | null;
  dirtyRanks: number[];
  expectedCount: number;
  saveStatus: TrendingSaveStatus;
  saveMessage: string | null;
  onSelectPlatform: (
    platform: TrendingPlatform
  ) => void;
  onSelectRank: (rank: number) => void;
  onChangeField: (
    rank: number,
    field: 'title' | 'artist' | 'movement' | 'songs_count',
    value: string,
  ) => void;
  onRevertRow: (rank: number) => void;
  onSave: () => void;
  onDiscard: () => void;
  onReload: () => void;
}

const platformOrder: TrendingPlatform[] = [
  'youtube',
  'spotify',
  'artist',
];

/*
 * BORA CONTROL ROOM TRENDING COMPOSITION
 *
 * Admin Trending ni editor yake mwenyewe. Public Trending UI
 * haireusedwi hapa.
 */
export default function TrendingGUI(props: TrendingGUIProps) {
  const {
    activePlatform,
    dataState,
    dataError,
    rows,
    selectedRank,
    dirtyRanks,
    expectedCount,
    saveStatus,
    saveMessage,
    onSelectPlatform,
    onSelectRank,
    onChangeField,
    onRevertRow,
    onSave,
    onDiscard,
    onReload,
  } = props;

  const isArtist = activePlatform === 'artist';
  const platformLabel = TRENDING_PLATFORM_LABELS[activePlatform];

  const dataColor =
    dataState === 'loading'
      ? 'var(--bora-gold)'
      : dataState === 'error'
        ? 'var(--bora-red)'
        : 'var(--bora-green)';
  const dataLabel =
    dataState === 'loading'
      ? 'Reading trending data'
      : dataState === 'error'
        ? 'Trending data unavailable'
        : 'Trending data ready';

  const selectedRow =
    rows.find((row) => row.rank === selectedRank) ?? rows[0] ?? null;


  const showLoading = dataState === 'loading';
  const showError = !showLoading && dataState === 'error';
  const showEmpty = !showLoading && !showError && rows.length === 0;
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
              Trending
            </h2>
            <p
              className="mt-2 text-[7px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              Platform Signal Â· Live Current Set
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

      {/* PLATFORM NAVIGATION */}
      <nav
        aria-label="Trending platforms"
        className="mt-3 w-full border"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-background-deep)',
        }}
      >
        <div className="grid w-full grid-cols-3">
          {platformOrder.map((platform) => {
            const isActive = activePlatform === platform;

            return (
              <button
                key={platform}
                type="button"
                onClick={() => onSelectPlatform(platform)}
                aria-current={isActive ? 'page' : undefined}
                className="relative min-w-0 overflow-hidden border-r px-2 py-4 text-center transition-all duration-300 last:border-r-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)] sm:px-4 sm:py-5"
                style={{
                  borderColor: 'var(--bora-border)',
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))'
                    : 'transparent',
                }}
              >
                <p
                  className="whitespace-nowrap font-cinzel text-[9px] font-black uppercase tracking-[0.1em] sm:text-xs sm:tracking-[0.14em]"
                  style={{
                    color: isActive
                      ? 'var(--bora-gold)'
                      : 'var(--bora-text)',
                  }}
                >
                  {TRENDING_PLATFORM_LABELS[platform]}
                </p>

                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{
                      backgroundColor: 'var(--bora-gold)',
                      boxShadow: '0 0 10px var(--bora-gold-glow)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <TrendingSaveBar
        status={saveStatus}
        message={saveMessage}
        dirtyCount={dirtyRanks.length}
        platformLabel={platformLabel}
        onSave={onSave}
        onDiscard={onDiscard}
      />

      <div className="mt-3">
        {showLoading && (
          <TrendingStatePanel
            title="Reading Trending"
            lines={[
              'Trending rows are being read from Supabase.',
            ]}
          />
        )}

        {showError && (
          <TrendingStatePanel
            tone="error"
            title="Trending Unavailable"
            lines={[
              dataError ??
                'Trending data source unavailable.',
              'Nothing is displayed because no rows were read.',
            ]}
            onRetry={onReload}
          />
        )}

        {showEmpty && (
          <TrendingStatePanel
            title={`No ${platformLabel} Trending`}
            lines={[
              'This platform has no trending rows yet.',
              `A ${platformLabel} trending set holds ${expectedCount} rows.`,
              'Nothing is invented here — rows appear once they are entered and saved.',
            ]}
          />
        )}

        {showEditor && selectedRow && (
          <div className="grid w-full grid-cols-1 gap-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <TrendingRankList
              rows={rows}
              selectedRank={selectedRow.rank}
              dirtyRanks={dirtyRanks}
              onSelectRank={onSelectRank}
            />
            <TrendingRowEditor
              row={selectedRow}
              isArtist={isArtist}
              isDirty={dirtyRanks.includes(selectedRow.rank)}
              onChange={onChangeField}
              onRevert={onRevertRow}
            />
          </div>
        )}
      </div>
    </div>
  );
}
