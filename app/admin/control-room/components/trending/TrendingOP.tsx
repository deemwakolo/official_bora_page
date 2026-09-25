'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  TRENDING_RANK_COUNT,
  emptyTrendingData,
  type TrendingData,
  type TrendingEntry,
  type TrendingPlatform,
} from '@/lib/trending-shared';

import {
  getTrendingData,
  saveTrendingPlatform,
} from '@/lib/trending-actions';

import TrendingGUI, {
  type TrendingDataState,
  type TrendingSaveStatus,
} from './TrendingGUI';

type DraftMap = Record<number, TrendingEntry>;

function blankRow(
  platform: TrendingPlatform,
  rank: number
): TrendingEntry {
  return {
    platform,
    rank,
    song_id: null,
    title: '',
    artist: '',
    movement: 0,
    songs_count: platform === 'artist' ? 0 : null,
  };
}

function sameEntry(a: TrendingEntry, b: TrendingEntry) {
  return (
    a.rank === b.rank &&
    a.title === b.title &&
    a.artist === b.artist &&
    (a.movement ?? 0) === (b.movement ?? 0) &&
    (a.songs_count ?? null) === (b.songs_count ?? null)
  );
}

function parseIntOrZero(value: string): number {
  const trimmed = value.trim();
  if (trimmed === '') return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed)
    ? Math.trunc(parsed)
    : 0;
}

type SavePhase = 'idle' | 'saving' | 'saved' | 'error';

/*
 * BORA CONTROL ROOM TRENDING CONTROLLER
 *
 * Maji ya kila platform yana drafts zake. Save ni ya platform
 * iliyo active pekee — RPC haigusei zile nyingine.
 * Hakuna global draft reset kwenye reload.
 */
export default function TrendingOP() {
  const [data, setData] =
    useState<TrendingData>(emptyTrendingData());
  const [dataState, setDataState] =
    useState<TrendingDataState>('loading');
  const [dataError, setDataError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [activePlatform, setActivePlatform] =
    useState<TrendingPlatform>('youtube');

  const [drafts, setDrafts] = useState<
    Record<TrendingPlatform, DraftMap>
  >({
    youtube: {},
    spotify: {},
    artist: {},
  });

  const [selectedRank, setSelectedRank] = useState<number | null>(
    null
  );

  const [savePhase, setSavePhase] =
    useState<SavePhase>('idle');
  const [saveMessage, setSaveMessage] = useState<string | null>(
    null
  );

  const baseRef = useRef<TrendingData>(emptyTrendingData());

  useEffect(() => {
    let cancelled = false;
    setDataState('loading');
    setDataError(null);

    getTrendingData()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setDataState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDataError(
          error instanceof Error
            ? error.message
            : 'Trending unavailable.'
        );
        setDataState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    baseRef.current = data;
  }, [data]);

  const handleReload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  // SLOTS ZA PLATFORM. DB inaweka 0 rows kwa platform ambayo
  // bado haijaundwa — basi tunajaza ranks 1..N zenye blank rows
  // ili admin aweze kujaza set ya kwanza bila kuhitaji
  // records zilizopo. Ranks zilizo kwenye DB zinatumika.
  const expectedCount = TRENDING_RANK_COUNT[activePlatform];
  const persistedRows = baseRef.current[activePlatform] ?? [];
  const baseRows: TrendingEntry[] = Array.from(
    { length: expectedCount },
    (_, index) => {
      const rank = index + 1;
      return (
        persistedRows.find((row) => row.rank === rank) ??
        blankRow(activePlatform, rank)
      );
    }
  );
  const periodDrafts = drafts[activePlatform] ?? {};
  const rows = baseRows.map(
    (row) => periodDrafts[row.rank] ?? row
  );
  const dirtyRanks = baseRows
    .filter((base) => {
      const draft = periodDrafts[base.rank];
      return draft ? !sameEntry(base, draft) : false;
    })
    .map((base) => base.rank)
    .sort((a, b) => a - b);

  const handleSelectPlatform = useCallback(
    (platform: TrendingPlatform) => {
      setActivePlatform(platform);
      setSelectedRank(null);
    },
    []
  );

  const handleSelectRank = useCallback((rank: number) => {
    setSelectedRank(rank);
  }, []);

  const handleChangeField = useCallback(
    (
      rank: number,
      field: 'title' | 'artist' | 'movement' | 'songs_count',
      value: string
    ) => {
      setDrafts((prev) => {
        const current = prev[activePlatform] ?? {};
        const base = baseRef.current[activePlatform]?.find(
          (row) => row.rank === rank
        );
        const seed =
          current[rank] ??
          base ??
          blankRow(activePlatform, rank);
        const next: TrendingEntry = { ...seed };
        if (field === 'movement') {
          next.movement = parseIntOrZero(value);
        } else if (field === 'songs_count') {
          next.songs_count = parseIntOrZero(value);
        } else {
          next[field] = value;
        }
        return {
          ...prev,
          [activePlatform]: { ...current, [rank]: next },
        };
      });
    },
    [activePlatform]
  );

  const handleRevertRow = useCallback(
    (rank: number) => {
      setDrafts((prev) => {
        const current = { ...(prev[activePlatform] ?? {}) };
        delete current[rank];
        return { ...prev, [activePlatform]: current };
      });
    },
    [activePlatform]
  );

  const handleDiscard = useCallback(() => {
    setDrafts((prev) => ({
      ...prev,
      [activePlatform]: {},
    }));
    setSavePhase('idle');
    setSaveMessage(null);
  }, [activePlatform]);

  const handleSave = useCallback(async () => {
    if (dirtyRanks.length === 0 || savePhase === 'saving') return;

    setSavePhase('saving');
    setSaveMessage(null);

    const expected = TRENDING_RANK_COUNT[activePlatform];
    const payload: TrendingEntry[] = [];

    for (let rank = 1; rank <= expected; rank++) {
      const base = baseRef.current[activePlatform]?.find(
        (row) => row.rank === rank
      );
      const draft = periodDrafts[rank];
      payload.push(
        draft ?? base ?? blankRow(activePlatform, rank)
      );
    }

    const result = await saveTrendingPlatform(
      activePlatform,
      payload
    );

    if (result.success) {
      setSavePhase('saved');
      setSaveMessage(
        'Trending platform saved successfully.'
      );
      setDrafts((prev) => ({
        ...prev,
        [activePlatform]: {},
      }));
      handleReload();
    } else {
      setSavePhase('error');
      setSaveMessage(
        result.error ?? 'Failed to save trending.'
      );
    }
  }, [
    activePlatform,
    dirtyRanks.length,
    handleReload,
    periodDrafts,
    savePhase,
  ]);

  const isDirty = dirtyRanks.length > 0;
  const saveStatus: TrendingSaveStatus =
    savePhase === 'saving'
      ? 'saving'
      : savePhase === 'saved' && !isDirty
        ? 'saved'
        : savePhase === 'error'
          ? 'error'
          : isDirty
            ? 'unsaved'
            : 'clean';

  return (
    <TrendingGUI
      activePlatform={activePlatform}
      dataState={dataState}
      dataError={dataError}
      rows={rows}
      selectedRank={selectedRank}
      dirtyRanks={dirtyRanks}
      expectedCount={expectedCount}
      saveStatus={saveStatus}
      saveMessage={saveMessage}
      onSelectPlatform={handleSelectPlatform}
      onSelectRank={handleSelectRank}
      onChangeField={handleChangeField}
      onRevertRow={handleRevertRow}
      onSave={handleSave}
      onDiscard={handleDiscard}
      onReload={handleReload}
    />
  );
}
