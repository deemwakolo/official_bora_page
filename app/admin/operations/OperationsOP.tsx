'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

import OperationsGUI from './OperationsGUI';

import {
  OPERATIONS_SONG_COLUMNS,
  toOperationsSong,
  type OperationsSection,
  type OperationsSong,
} from './config/operations';

// HALI YA DATA: loading / ready / error. Hakuna fake data ya kuifunika.
export type OperationsDataState =
  | 'loading'
  | 'ready'
  | 'error';

// HALI YA SAVE: clean / unsaved / saving / saved / error.
// 'saved' inafikiwa TU pale write ya kweli inapofanikiwa.
export type OperationsSaveStatus =
  | 'clean'
  | 'unsaved'
  | 'saving'
  | 'saved'
  | 'error';

export type OperationsSavePhase =
  | 'idle'
  | 'saving'
  | 'error';

// DRAFTS: song id → Operations-owned fields zilizobadilishwa.
export type OperationsDrafts = Record<string, OperationsSong>;

/*
 * BORA OPERATIONS CONTROLLER
 *
 * Kazi yake: data ya Operations (read pekee), section, selection,
 * drafts za local na hali ya Save.
 *
 * HAKUNA: chart listeners, voting, trending, engine, updates,
 * cross-room sync wala event bus.
 */
export default function OperationsOP() {
  const [activeSection, setActiveSection] =
    useState<OperationsSection>('songs');

  const [dataState, setDataState] =
    useState<OperationsDataState>('loading');

  const [dataError, setDataError] = useState<string | null>(
    null
  );

  const [songs, setSongs] = useState<OperationsSong[]>([]);

  const [selectedId, setSelectedId] = useState<string | null>(
    null
  );

  const [drafts, setDrafts] = useState<OperationsDrafts>({});

  const [savePhase, setSavePhase] =
    useState<OperationsSavePhase>('idle');

  const [saveMessage, setSaveMessage] = useState<string | null>(
    null
  );

  /*
   * OPERATIONS READ: whitelist ya Operations-owned columns pekee.
   * Hakuna chart field inayovuka boundary ya Operations.
   */
  const loadSongs = useCallback(async () => {
    setDataState('loading');
    setDataError(null);

    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('songs')
        .select(OPERATIONS_SONG_COLUMNS)
        .order('title', { ascending: true });

      if (error) {
        setDataState('error');
        setDataError(error.message);
        return;
      }

      const rows = (data ?? []) as unknown as Record<
        string,
        unknown
      >[];

      setSongs(rows.map(toOperationsSong));
      setDataState('ready');
    } catch (error) {
      setDataState('error');
      setDataError(
        error instanceof Error
          ? error.message
          : 'Operations data source unavailable.'
      );
    }
  }, []);

  useEffect(() => {
    void loadSongs();
  }, [loadSongs]);

  // SELECTION YA KWANZA: mstari wa kwanza wa registry.
  useEffect(() => {
    if (selectedId !== null) return;

    if (songs.length === 0) return;

    setSelectedId(songs[0].id);
  }, [selectedId, songs]);

  const selectedSong = useMemo(
    () => songs.find((song) => song.id === selectedId) ?? null,
    [selectedId, songs]
  );

  const draft = selectedId
    ? drafts[selectedId] ?? selectedSong
    : null;

  const dirtyIds = useMemo(() => Object.keys(drafts), [drafts]);

  const isDirty = dirtyIds.length > 0;

  const isSelectedDirty = selectedId
    ? Boolean(drafts[selectedId])
    : false;

  // ERROR CLEAR: draft mpya au revert inarudisha hali kwenye UNSAVED/CLEAN.
  const clearSaveError = useCallback(() => {
    setSaveMessage(null);

    setSavePhase((phase) =>
      phase === 'error' ? 'idle' : phase
    );
  }, []);

  const selectSection = useCallback(
    (section: OperationsSection) => {
      setActiveSection(section);
    },
    []
  );

  const selectSong = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // DRAFT UPDATE: badiliko linabaki LOCAL hadi Save.
  const updateDraftField = useCallback(
    (field: keyof OperationsSong, value: string) => {
      if (!selectedId || !selectedSong) return;

      clearSaveError();

      setDrafts((current) => {
        const base = current[selectedId] ?? selectedSong;

        return {
          ...current,
          [selectedId]: {
            ...base,
            [field]: value,
          },
        };
      });
    },
    [clearSaveError, selectedId, selectedSong]
  );

  // REVERT SONG: kurudisha song moja kwenye values za chanzo.
  const revertSong = useCallback(() => {
    if (!selectedId) return;

    setDrafts((current) => {
      if (!current[selectedId]) return current;

      const next = { ...current };

      delete next[selectedId];

      return next;
    });

    clearSaveError();
  }, [clearSaveError, selectedId]);

  // DISCARD ALL: kurudisha drafts zote za Operations.
  const discardAll = useCallback(() => {
    setDrafts({});
    setSaveMessage(null);
    setSavePhase('idle');
  }, []);

  /*
   * SAVE: commit point MOJA ya Operations.
   *
   * Write service ya Operations haijawekwa bado, kwa hiyo:
   *   - hakuna write inayotokea
   *   - HAKUNA 'saved' inayoonyeshwa
   *
   * Itakapowekwa, payload inaundwa kwa whitelist ya
   * OPERATIONS_SONG_FIELDS pekee — kamwe si `.update(song)`.
   */
  const saveDrafts = useCallback(() => {
    if (!isDirty || savePhase === 'saving') return;

    setSavePhase('error');

    setSaveMessage(
      'Operations write service not connected — nothing was saved.'
    );
  }, [isDirty, savePhase]);

  const saveStatus: OperationsSaveStatus =
    savePhase === 'saving'
      ? 'saving'
      : savePhase === 'error'
        ? 'error'
        : isDirty
          ? 'unsaved'
          : 'clean';

  return (
    <OperationsGUI
      activeSection={activeSection}
      dataState={dataState}
      dataError={dataError}
      songs={songs}
      selectedId={selectedId}
      draft={draft}
      isSelectedDirty={isSelectedDirty}
      saveStatus={saveStatus}
      saveMessage={saveMessage}
      dirtyCount={dirtyIds.length}
      dirtyIds={dirtyIds}
      onSelectSection={selectSection}
      onSelectSong={selectSong}
      onChangeField={updateDraftField}
      onRevertSong={revertSong}
      onDiscardAll={discardAll}
      onSave={saveDrafts}
      onReload={loadSongs}
    />
  );
}
