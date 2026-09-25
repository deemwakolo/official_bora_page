'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import type {
  MomentChartData,
  MomentSong,
} from '@/app/components/charts/MomentChart';

import { getLatestMomentCharts } from '@/lib/moment-charts-actions';

import MomentChartsGUI, {
  type MomentChartsDataState,
  type MomentChartsPeriod,
} from './MomentChartsGUI';
import type { MomentSongField } from './MomentChartsSongFields';

type ChartsBundle = {
  weekly: MomentChartData | null;
  monthly: MomentChartData | null;
};

type DraftMap = Record<number, MomentSong>;

function sortByRank(songs: MomentSong[]): MomentSong[] {
  return [...songs].sort((a, b) => a.rank - b.rank);
}

function sameSongMeta(a: MomentSong, b: MomentSong): boolean {
  return (
    a.metadata.title === b.metadata.title &&
    a.metadata.artist === b.metadata.artist &&
    a.metadata.feature === b.metadata.feature &&
    a.metadata.producer === b.metadata.producer &&
    a.metadata.releaseDate === b.metadata.releaseDate &&
    a.metadata.genre === b.metadata.genre
  );
}
function sameSongUrls(a: MomentSong, b: MomentSong): boolean {
  return (
    a.metadata.artwork === b.metadata.artwork &&
    a.metadata.youtube === b.metadata.youtube &&
    a.metadata.spotify === b.metadata.spotify &&
    a.metadata.boomplay === b.metadata.boomplay
  );
}
function sameSong(a: MomentSong, b: MomentSong): boolean {
  const aDelta = a.movement.delta ?? null;
  const bDelta = b.movement.delta ?? null;
  return (
    a.rank === b.rank &&
    a.movement.kind === b.movement.kind &&
    aDelta === bDelta &&
    sameSongMeta(a, b) &&
    sameSongUrls(a, b)
  );
}

function readOnlyText(
  activeChart: MomentChartData | null,
  baseSongs: MomentSong[],
): string {
  if (!activeChart) return 'Waiting for Supabase edition.';
  const periodWord =
    activeChart.periodLabel === 'WEEKLY' ? 'Weekly' : 'Monthly';
  return `${periodWord} ${activeChart.date} Â· ${baseSongs.length} entries Â· local drafts only â€” save arrives later.`;
}

function isPositiveIntText(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return false;
  return Number(trimmed) > 0;
}

export default function MomentChartsOP() {
  const [charts, setCharts] = useState<ChartsBundle>({
    weekly: null,
    monthly: null,
  });
  const [dataState, setDataState] =
    useState<MomentChartsDataState>('loading');
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activePeriod, setActivePeriod] =
    useState<MomentChartsPeriod>('weekly');
  const [draftsByPeriod, setDraftsByPeriod] = useState<
    Record<MomentChartsPeriod, DraftMap>
  >({ weekly: {}, monthly: {} });
  const [selectedByPeriod, setSelectedByPeriod] = useState<
    Record<MomentChartsPeriod, number | null>
  >({ weekly: null, monthly: null });

  const baseSongsRef = useRef<Record<MomentChartsPeriod, MomentSong[]>>({
    weekly: [],
    monthly: [],
  });

  useEffect(() => {
    let cancelled = false;
    setDataState('loading');
    setDataError(null);
    getLatestMomentCharts()
      .then((result) => {
        if (cancelled) return;
        setCharts({ weekly: result.weekly, monthly: result.monthly });
        setDraftsByPeriod({ weekly: {}, monthly: {} });
        setSelectedByPeriod({
          weekly: result.weekly?.songs[0]?.rank ?? null,
          monthly: result.monthly?.songs[0]?.rank ?? null,
        });
        setDataState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDataError(
          error instanceof Error ? error.message : 'Moment charts unavailable.',
        );
        setDataState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleSelectPeriod = (period: MomentChartsPeriod) => {
    setActivePeriod(period);
  };

  const handleSelectRank = (rank: number) => {
    setSelectedByPeriod((prev) => ({ ...prev, [activePeriod]: rank }));
  };

  const handleChangeSongField = useCallback(
    (rank: number, field: MomentSongField, value: string) => {
      setDraftsByPeriod((prev) => {
        const periodDrafts = prev[activePeriod] ?? {};
        const base =
          baseSongsRef.current[activePeriod]?.find(
            (song) => song.rank === rank,
          ) ?? null;
        const current = periodDrafts[rank] ?? base;
        if (!current) return prev;
        const next: MomentSong = {
          ...current,
          metadata: { ...current.metadata, [field]: value },
        };
        return {
          ...prev,
          [activePeriod]: { ...periodDrafts, [rank]: next },
        };
      });
    },
    [activePeriod],
  );

  const handleChangeMovement = useCallback(
    (rank: number, field: 'kind' | 'delta', value: string) => {
      setDraftsByPeriod((prev) => {
        const periodDrafts = prev[activePeriod] ?? {};
        const base =
          baseSongsRef.current[activePeriod]?.find(
            (song) => song.rank === rank,
          ) ?? null;
        const current = periodDrafts[rank] ?? base;
        if (!current) return prev;
        if (field === 'kind') {
          const kind = value as MomentSong['movement']['kind'];
          if (
            kind !== 'up' &&
            kind !== 'down' &&
            kind !== 'same' &&
            kind !== 'new'
          ) {
            return prev;
          }
          const next: MomentSong = {
            ...current,
            movement:
              kind === 'up' || kind === 'down'
                ? { kind, delta: current.movement.delta ?? 1 }
                : { kind },
          };
          return {
            ...prev,
            [activePeriod]: { ...periodDrafts, [rank]: next },
          };
        }
        const trimmed = value.trim();
        if (trimmed === '') {
          const next: MomentSong = {
            ...current,
            movement: { kind: current.movement.kind },
          };
          return {
            ...prev,
            [activePeriod]: { ...periodDrafts, [rank]: next },
          };
        }
        if (!isPositiveIntText(trimmed)) return prev;
        const next: MomentSong = {
          ...current,
          movement: {
            kind: current.movement.kind,
            delta: Number(trimmed),
          },
        };
        return {
          ...prev,
          [activePeriod]: { ...periodDrafts, [rank]: next },
        };
      });
    },
    [activePeriod],
  );

  const handleRevertEntry = useCallback(
    (rank: number) => {
      setDraftsByPeriod((prev) => {
        const periodDrafts = { ...(prev[activePeriod] ?? {}) };
        delete periodDrafts[rank];
        return { ...prev, [activePeriod]: periodDrafts };
      });
    },
    [activePeriod],
  );

  const handleReload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    baseSongsRef.current = {
      weekly: sortByRank(charts.weekly?.songs ?? []),
      monthly: sortByRank(charts.monthly?.songs ?? []),
    };
  }, [charts]);

  const activeChart =
    activePeriod === 'weekly' ? charts.weekly : charts.monthly;
  const baseSongs = sortByRank(activeChart?.songs ?? []);
  const songs = sortByRank(
    baseSongs.map((song) => periodDrafts[song.rank] ?? song),
  );
  const dirtyRanks = Object.keys(periodDrafts)
    .map((key) => Number(key))
    .filter((rank) => {
      const base = baseSongs.find((song) => song.rank === rank);
      const draft = periodDrafts[rank];
      return Boolean(base && draft && !sameSong(base, draft));
    })
    .sort((a, b) => a - b);
  const selectedRank = selectedByPeriod[activePeriod] ?? null;

  return (
    <MomentChartsGUI
      activePeriod={activePeriod}
      dataState={dataState}
      dataError={dataError}
      weeklyLabel={charts.weekly?.date || 'No weekly edition'}
      monthlyLabel={charts.monthly?.date || 'No monthly edition'}
      readOnlyLabel={readOnlyText(activeChart, baseSongs)}
      songs={songs}
      selectedRank={selectedRank}
      dirtyRanks={dirtyRanks}
      onSelectPeriod={handleSelectPeriod}
      onSelectRank={handleSelectRank}
      onChangeSongField={handleChangeSongField}
      onChangeMovement={handleChangeMovement}
      onRevertEntry={handleRevertEntry}
      onReload={handleReload}
    />
  );
}
