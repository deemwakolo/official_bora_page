'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Disc3,
  Search,
  Sparkles,
} from 'lucide-react';
import type {
  EngineRoomCurrentHourInputs,
  EngineRoomPlatformMappings,
  EngineRoomSongList,
} from '@/lib/bora-engine/admin-room-read-model';
import type { PlatformSourceAssessment } from '@/lib/bora-engine/source-readiness';
import DailyPlatformRankEntry from './DailyPlatformRankEntry';

type EngineRoomCategory = 'songs' | 'premium';

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  boomplay: 'Boomplay',
};

function SongArtwork({
  title,
  coverUrl,
  slotNumber,
}: {
  readonly title: string;
  readonly coverUrl: string;
  readonly slotNumber: number;
}) {
  return (
    <div
      className="relative h-[92px] w-[92px] shrink-0 overflow-visible sm:h-[112px] sm:w-[112px] md:h-[136px] md:w-[136px]"
      aria-hidden
    >
      <div
        role={coverUrl ? 'img' : undefined}
        aria-label={coverUrl ? `${title} artwork` : undefined}
        className="relative z-10 h-full w-full overflow-hidden rounded-full bg-cover bg-center shadow-2xl transition-all duration-500 group-hover:scale-[1.045] group-hover:brightness-110"
        style={{
          border: '1px solid color-mix(in srgb, var(--bora-gold) 34%, transparent)',
          backgroundColor: 'var(--bora-background-deep)',
          backgroundImage: coverUrl ? `url("${coverUrl.replaceAll('"', '%22')}")` : undefined,
        }}
      >
        {!coverUrl && (
          <div className="flex h-full items-center justify-center">
            <Disc3 size={28} style={{ color: 'var(--bora-gold)' }} aria-hidden />
          </div>
        )}
        {coverUrl && <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/35" />}
      </div>
      <span
        className="absolute -left-3 -top-3 z-20 font-cinzel text-5xl font-black italic leading-none tracking-[-0.1em] text-[var(--bora-text)] drop-shadow-[0_8px_18px_rgba(0,0,0,0.9)] sm:text-6xl"
        style={{ color: 'var(--bora-gold)', textShadow: '0 8px 20px rgba(212,175,55,0.28)' }}
      >
        {String(slotNumber).padStart(2, '0')}
      </span>
      <span
        className="absolute -bottom-2 -right-2 z-20 h-5 w-5 rotate-45 border-r border-b transition-colors group-hover:border-[color:var(--bora-gold)]"
        style={{ borderColor: 'var(--bora-border-strong)' }}
      />
    </div>
  );
}

function SongDirectory({
  songList,
  currentHourInputs,
  category,
}: {
  readonly songList: EngineRoomSongList | null;
  readonly currentHourInputs: EngineRoomCurrentHourInputs | null;
  readonly category: EngineRoomCategory;
}) {
  const [query, setQuery] = useState('');
  const songs = useMemo(
    () => (songList?.status === 'ready' ? songList.songs : []),
    [songList],
  );
  const filteredSongs = useMemo(() => {
    const filter = query.trim().toLowerCase();
    if (!filter) return songs;
    return songs.filter((song) =>
      `${song.title} ${song.artist} ${song.slotNumber}`.toLowerCase().includes(filter),
    );
  }, [query, songs]);
  const inputsBySong = new Map(
    currentHourInputs?.status === 'ready'
      ? currentHourInputs.songs.map((input) => [input.songId, input] as const)
      : [],
  );
  const currentHourUnavailable = currentHourInputs?.status !== 'ready';

  if (songList?.status !== 'ready') {
    return (
      <p className="border p-5 text-[8px]" style={{ borderColor: 'var(--bora-border)' }} role="alert">
        Song records are unavailable. Check the Engine Room database connection.
      </p>
    );
  }

  return (
    <section
      className="relative"
      style={{ backgroundColor: 'var(--bora-background)' }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute left-1/2 top-0 h-[540px] w-[780px] -translate-x-1/2 rounded-full blur-[150px]"
          style={{ backgroundColor: 'var(--bora-gold-glow)' }}
        />
      </div>
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--bora-gold)' }}>
              Song studio · {songs.length} songs
            </p>
            <h2 className="mt-2 font-cinzel text-2xl font-black uppercase tracking-[0.12em] sm:text-3xl">
              Engine roster
            </h2>
            <p className="mt-2 max-w-xl text-[8px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
              Select a song to inspect its Engine performance and edit its
              metadata and supporting evidence.
            </p>
          </div>
          <label className="relative block w-full md:max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--bora-text-subtle)' }}
              aria-hidden
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, artist, or slot"
              className="w-full border bg-transparent py-3 pl-9 pr-3 text-[8px] outline-none focus:border-[color:var(--bora-gold)]"
              style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text)' }}
            />
          </label>
        </div>
        {currentHourUnavailable && (
          <p className="mb-4 border p-3 text-[7px]" style={{ borderColor: 'var(--bora-red)', color: 'var(--bora-red)' }} role="alert">
            Current-hour Engine inputs are unavailable. Song records remain
            available, but this hour’s seed and vote values are not shown.
          </p>
        )}
        <div className="flex flex-col gap-5 md:gap-7">
          {filteredSongs.map((song) => {
            const input = inputsBySong.get(song.id);
            return (
              <Link
                key={song.id}
                href={`/admin/engine/songs/${song.id}${category === 'premium' ? '?category=premium' : ''}`}
                aria-label={`Open performance and edit workspace for ${song.title}, slot ${song.slotNumber}`}
                className="group relative overflow-hidden rounded-[2px] border px-3 py-5 transition-all duration-500 hover:-translate-y-1 sm:px-6 sm:py-7 md:px-8 md:py-9"
                style={{
                  borderColor: 'var(--bora-border)',
                  backgroundColor: 'color-mix(in srgb, var(--bora-surface) 58%, transparent)',
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(circle at 8% 15%, color-mix(in srgb, var(--bora-gold) 12%, transparent), transparent 34%)' }}
                />
                <div className="relative flex items-center gap-4 sm:gap-8">
                  <SongArtwork title={song.title} coverUrl={song.coverUrl} slotNumber={song.slotNumber} />
                  <div className="min-w-0 flex-1 py-2">
                    <p className="mb-2 text-[6px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--bora-text-subtle)' }}>
                      Engine slot {song.slotNumber}
                    </p>
                    <h3 className="break-words font-cinzel text-xl font-black uppercase leading-[0.95] tracking-[-0.04em] transition-transform duration-500 group-hover:translate-x-1 sm:text-3xl md:text-4xl">
                      {song.title || 'Untitled song'}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-4">
                      <span className="break-words font-cinzel text-[8px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--bora-text-muted)' }}>
                        {song.artist || 'Unknown artist'}
                      </span>
                      {input && (
                        <span className="border px-2 py-1 text-[6px] font-black uppercase tracking-[0.1em]" style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text-subtle)' }}>
                          {input.lifecycle}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                    <span className="text-[6px] font-mono uppercase tracking-[0.18em]" style={{ color: 'var(--bora-gold)' }}>
                      {currentHourUnavailable ? 'Inputs unavailable' : 'This hour'}
                    </span>
                    <span className="font-mono text-2xl font-black leading-none tabular-nums text-[var(--bora-gold)] sm:text-3xl">
                      {currentHourUnavailable
                        ? 'N/A'
                        : input?.seedC === null || input === undefined
                          ? '—'
                          : input.seedC}
                    </span>
                    <span className="text-[6px] font-mono uppercase tracking-[0.1em]" style={{ color: 'var(--bora-text-muted)' }}>
                      Seed C
                    </span>
                    <span className="mt-1 text-[6px] font-mono tabular-nums" style={{ color: 'var(--bora-text-subtle)' }}>
                      ↑ {currentHourUnavailable ? 'N/A' : input?.upvotes ?? '—'} · ↓ {currentHourUnavailable ? 'N/A' : input?.downvotes ?? '—'}
                    </span>
                  </div>
                  <ArrowUpRight size={16} className="hidden shrink-0 text-[color:var(--bora-gold)] transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 sm:block" aria-hidden />
                </div>
              </Link>
            );
          })}
          {filteredSongs.length === 0 && (
            <p className="border p-6 text-center text-[8px]" style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text-muted)' }}>
              No songs match this search.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function PremiumPerformance({
  songList,
  platformMappings,
  sourceAssessments,
  currentHourInputs,
}: {
  readonly songList: EngineRoomSongList | null;
  readonly platformMappings: EngineRoomPlatformMappings;
  readonly sourceAssessments: readonly PlatformSourceAssessment[];
  readonly currentHourInputs: EngineRoomCurrentHourInputs | null;
}) {
  const songs = songList?.status === 'ready' ? songList.songs : [];
  const mappingCount =
    platformMappings.status === 'ready' ? platformMappings.mappings.length : 0;

  return (
    <div className="space-y-5">
      <header className="border p-5 sm:p-7" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-surface)' }}>
        <div className="flex items-start gap-3">
          <Sparkles size={16} style={{ color: 'var(--bora-gold)' }} aria-hidden />
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--bora-gold)' }}>
              All-song performance desk
            </p>
            <h2 className="mt-2 font-cinzel text-xl font-black uppercase tracking-[0.1em]">
              Premium performance
            </h2>
            <p className="mt-2 max-w-2xl text-[8px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
              Select a song to inspect its current-hour performance, seed
              history, and song-specific evidence and editing controls.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sourceAssessments.map((assessment) => (
          <article key={assessment.platform} className="border p-4" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-background-deep)' }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[8px] font-black uppercase tracking-[0.12em]">
                {PLATFORM_LABELS[assessment.platform] ?? assessment.platform}
              </p>
              <span className="text-[6px] font-black uppercase tracking-[0.12em]" style={{ color: assessment.status === 'available' ? 'var(--bora-green)' : 'var(--bora-gold)' }}>
                {assessment.status.replaceAll('-', ' ')}
              </span>
            </div>
            <p className="mt-3 text-[7px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
              {assessment.reason.replaceAll('-', ' ')}
            </p>
            <p className="mt-2 text-[6px]" style={{ color: 'var(--bora-text-subtle)' }}>
              {assessment.unit} · {assessment.sourceIdentity ?? 'No configured source'}
            </p>
          </article>
        ))}
        <article className="border p-4" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-background-deep)' }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[8px] font-black uppercase tracking-[0.12em]">Engine desk</p>
            <span className="text-[6px] font-black uppercase tracking-[0.12em]" style={{ color: currentHourInputs?.status === 'ready' ? 'var(--bora-green)' : 'var(--bora-red)' }}>
              {currentHourInputs?.status === 'ready' ? `Hour ${currentHourInputs.referenceHour}` : 'Unavailable'}
            </span>
          </div>
          <p className="mt-3 text-[7px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
            {songs.length} songs · {mappingCount} platform identities · per-song performance opens from the roster below.
          </p>
        </article>
      </section>

      <section className="grid gap-3 border p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-surface)' }}>
        <div>
          <p className="text-[7px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--bora-gold)' }}>
            Hourly seed math
          </p>
          <p className="mt-2 font-mono text-[9px] font-bold">XPᵢ = Cᵢ / T꜀</p>
          <p className="mt-2 max-w-2xl text-[7px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
            Seed C and accepted-vote history are inspected in each song’s
            workspace. Missing coverage is not treated as zero, and historical
            synthetic values remain identified.
          </p>
        </div>
        <p className="text-[6px] uppercase tracking-[0.12em] sm:text-right" style={{ color: 'var(--bora-text-subtle)' }}>
          Select a song to open its editor
        </p>
      </section>

      {songs.length > 0 && (
        <section className="space-y-4">
          <SongDirectory
            songList={songList}
            currentHourInputs={currentHourInputs}
            category="premium"
          />
          <details className="border" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-surface)' }}>
            <summary className="cursor-pointer px-4 py-4 text-[7px] font-black uppercase tracking-[0.12em]">
              Roster-wide daily rank snapshot
            </summary>
            <p className="px-4 pb-4 text-[7px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
              Daily rank snapshots are submitted as a complete roster so each
              platform’s positions stay unique and consistent.
            </p>
            <DailyPlatformRankEntry
              songs={songs}
              mappingState={platformMappings}
            />
          </details>
        </section>
      )}
    </div>
  );
}

export default function EngineRoomWorkspace({
  songList,
  platformMappings,
  sourceAssessments,
  category,
  currentHourInputs,
}: {
  readonly songList: EngineRoomSongList | null;
  readonly platformMappings: EngineRoomPlatformMappings;
  readonly sourceAssessments: readonly PlatformSourceAssessment[];
  readonly category: EngineRoomCategory;
  readonly currentHourInputs: EngineRoomCurrentHourInputs | null;
}) {
  return category === 'premium' ? (
    <PremiumPerformance
      songList={songList}
      platformMappings={platformMappings}
      sourceAssessments={sourceAssessments}
      currentHourInputs={currentHourInputs}
    />
  ) : (
    <SongDirectory
      songList={songList}
      currentHourInputs={currentHourInputs}
      category="songs"
    />
  );
}
