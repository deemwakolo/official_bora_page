'use client';

import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import AdminLoginToggle from '../login/components/AdminLoginToggle';

import RoomSelectorBackground from '../room-selector/graphics/RoomSelectorBackground';

import {
  OPERATIONS_SECTIONS,
  type OperationsSection,
  type OperationsSong,
} from './config/operations';

import type {
  OperationsDataState,
  OperationsSaveStatus,
} from './OperationsOP';

import OperationsNav from './components/OperationsNav';
import OperationsSaveBar from './components/OperationsSaveBar';
import OperationsSongs from './components/OperationsSongs';
import OperationsArtists from './components/OperationsArtists';
import OperationsPlatformIds from './components/OperationsPlatformIds';
import OperationsAssets from './components/OperationsAssets';

interface OperationsGUIProps {
  activeSection: OperationsSection;
  dataState: OperationsDataState;
  dataError: string | null;
  songs: OperationsSong[];
  selectedId: string | null;
  draft: OperationsSong | null;
  isSelectedDirty: boolean;
  saveStatus: OperationsSaveStatus;
  saveMessage: string | null;
  dirtyCount: number;
  dirtyIds: string[];
  onSelectSection: (section: OperationsSection) => void;
  onSelectSong: (id: string) => void;
  onChangeField: (
    field: keyof OperationsSong,
    value: string
  ) => void;
  onRevertSong: () => void;
  onDiscardAll: () => void;
  onSave: () => void;
  onReload: () => void;
}

/*
 * BORA OPERATIONS COMPOSITION LAYER
 *
 * Geometria inatoka kwenye admin frontend iliyopo:
 *   - container   : mx-auto max-w-7xl px-4 md:px-8 (AdminShell)
 *   - panel rhythm: nav → mt-3 → save bar → mt-3 → workspace
 *   - top gutter  : pt-16 (h-16 = rhythm ya admin header) inatoa
 *     nafasi kwa GUI toggle ya TOP-LEFT (Operations decision).
 *
 * HAKUNA public mast/header/navbar hapa. Operations ni admin room.
 */
export default function OperationsGUI({
  activeSection,
  dataState,
  dataError,
  songs,
  selectedId,
  draft,
  isSelectedDirty,
  saveStatus,
  saveMessage,
  dirtyCount,
  dirtyIds,
  onSelectSection,
  onSelectSong,
  onChangeField,
  onRevertSong,
  onDiscardAll,
  onSave,
  onReload,
}: OperationsGUIProps) {
  const dataLink =
    dataState === 'loading'
      ? {
          color: 'var(--bora-gold)',
          label: 'Reading operations data',
        }
      : dataState === 'error'
        ? {
            color: 'var(--bora-red)',
            label: 'Operations data unavailable',
          }
        : {
            color: 'var(--bora-green)',
            label: 'Operations data ready',
          };

  const renderWorkspace = () => {
    switch (activeSection) {
      case 'artists':
        return <OperationsArtists />;

      case 'platformIds':
        return (
          <OperationsPlatformIds
            state={dataState}
            error={dataError}
            songs={songs}
            onRetry={onReload}
          />
        );

      case 'assets':
        return (
          <OperationsAssets
            state={dataState}
            error={dataError}
            songs={songs}
            onRetry={onReload}
          />
        );

      default:
        return (
          <OperationsSongs
            state={dataState}
            error={dataError}
            songs={songs}
            selectedId={selectedId}
            draft={draft}
            isDirty={isSelectedDirty}
            dirtyIds={dirtyIds}
            onSelectSong={onSelectSong}
            onChangeField={onChangeField}
            onRevertSong={onRevertSong}
            onRetry={onReload}
          />
        );
    }
  };

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      <RoomSelectorBackground />

      {/* TOP GUTTER (pt-16) inatoa nafasi kwa GUI toggle ya top-left */}

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 pt-16 md:px-8">
        {/* ROOM IDENTITY */}

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

              <h1 className="mt-2 font-cinzel text-lg font-black uppercase tracking-[0.14em] sm:text-xl">
                Operations
              </h1>

              <p
                className="mt-2 text-[7px] font-bold uppercase tracking-[0.18em]"
                style={{ color: 'var(--bora-text-muted)' }}
              >
                Songs · Artists · Platform IDs · Assets
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <div className="flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    dataState === 'loading'
                      ? 'animate-pulse'
                      : ''
                  }`}
                  style={{ backgroundColor: dataLink.color }}
                />

                <span
                  className="text-[7px] font-black uppercase tracking-[0.18em]"
                  style={{ color: 'var(--bora-text-subtle)' }}
                >
                  {dataLink.label}
                </span>
              </div>

              <Link
                href="/admin/room-selector"
                className="flex items-center gap-2 font-cinzel text-[8px] font-black uppercase tracking-[0.2em] text-[color:var(--bora-text-muted)] transition-colors duration-300 hover:text-[color:var(--bora-gold)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[color:var(--bora-gold)]"
              >
                <ArrowLeft size={12} />

                Room Selector
              </Link>
            </div>
          </div>
        </div>

        {/* OPERATIONS NAVIGATION */}

        <OperationsNav
          sections={OPERATIONS_SECTIONS}
          activeSection={activeSection}
          onSelect={onSelectSection}
        />

        {/* UNIVERSAL SAVE */}

        <OperationsSaveBar
          status={saveStatus}
          message={saveMessage}
          dirtyCount={dirtyCount}
          onSave={onSave}
          onDiscard={onDiscardAll}
        />

        {/* ACTIVE WORKSPACE */}

        <div className="mt-3">{renderWorkspace()}</div>
      </div>

      {/* GUI LAYER: theme + sound + haptics, TOP-LEFT kwa Operations */}

      <AdminLoginToggle align="top-left" />
    </main>
  );
}
