'use client';

import React, { useEffect, useRef, useState } from 'react';
import ChartAnimation from './ChartAnimation';
import TapGUI from '../charts/TapGUI';
import type { SongMetadata } from '../charts/TapOP';

import {
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// STRUCTURE YA TAARIFA ZA KILA WIMBO KWENYE CHART
interface Song {
  id?: string | number;
  slot_number?: number;
  title: string;
  artist?: string;
  cover_url: string;
  youtube_id?: string;
  xp?: number | null;
  yt_rank?: number;
  sp_rank?: number;
  upvotes?: number | null;
  voteShare?: number | null;
  metadata?: SongMetadata;

  // NAFASI YA WIMBO KWENYE CHART YA AWALI
  previous_rank?: number | null;
}

// TAARIFA NA FUNCTIONS AMBAZO CHARTGUI INAPOKEA
interface ChartGUIProps {
  songs: Song[];

  // FUNCTION YA KUPITISHA KURA KWENYE COMPONENT YA JUU
  onVote: (
    id: string | number | undefined,
    title: string,
    type: 'up' | 'down'
  ) => void;
}

// COMPONENT KUU YA TOP 10 CHART
export default function ChartGUI({
  songs,
  onVote,
}: ChartGUIProps) {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerOrigin = useRef<{ x: number; y: number } | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current !== null) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pointerOrigin.current = null;
  };

  useEffect(() => clearLongPress, []);

  const startLongPress = (song: Song, event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    clearLongPress();
    pointerOrigin.current = { x: event.clientX, y: event.clientY };
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      pointerOrigin.current = null;
      setSelectedSong(song);
    }, 2000);
  };

  const moveLongPress = (event: React.PointerEvent) => {
    const origin = pointerOrigin.current;
    if (
      origin &&
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 10
    ) {
      clearLongPress();
    }
  };

  return (
    // SECTION NZIMA YA CHART
    <section
      data-bora-ui="public-vote-hero"
      className="relative min-h-screen overflow-hidden selection:bg-[var(--bora-selection-background)] selection:text-[var(--bora-selection-text)]"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      {/* BACKGROUND YA CHART */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: 'var(--bora-background)',
          }}
        />

        {/* GLOW YA GOLD UPANDE WA JUU */}
        <div
          className="absolute left-1/2 top-0 h-[700px] w-[1000px] -translate-x-1/2 rounded-full blur-[150px]"
          style={{
            backgroundColor: 'var(--bora-gold-glow)',
          }}
        />

        {/* GLOW YA RED UPANDE WA CHINI KULIA */}
        <div
          className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full blur-[140px]"
          style={{
            backgroundColor: 'var(--bora-red-glow)',
          }}
        />
      </div>

      {/* CONTAINER KUU YA CHART */}
      <div
        data-bora-ui="public-vote-hero-content"
        className="relative mx-auto max-w-6xl px-1 py-8 md:px-10 md:py-16"
      >

        {/* LIST YA NYIMBO */}
        <div
          data-bora-ui="public-vote-hero-list"
          className="flex flex-col gap-5 md:gap-7"
        >

          {/* KUPITIA KILA WIMBO NA KUTENGENEZA CARD YAKE */}
          {songs.map((item, i) => {

            // RANK INAANZA 1 BADALA YA 0
            const rank = i + 1;

            // NAFASI YA WIMBO KWENYE CHART YA AWALI
            const previousRank = item.previous_rank;

            // KUGAWA TITLE IKIWA DATABASE INA "SONG - ARTIST"
            const titleParts = item.title.split(' - ');

            // SEHEMU YA KWANZA NI JINA LA WIMBO
            const displayTitle = titleParts[0];

            // SEHEMU ZILIZOBAKI NI JINA LA MSANII
            const displayArtist =
              titleParts.length > 1
                ? titleParts.slice(1).join(' - ')
                : item.artist || 'Bongo Flava Industry';

            const finalCover =
              typeof item.cover_url === 'string'
                ? item.cover_url.trim()
                : '';

            const engineShare =
              typeof item.xp === 'number' &&
              Number.isFinite(item.xp) &&
              item.xp >= 0 &&
              item.xp <= 1
                ? item.xp * 100
                : null;
            const hasEngineShare = item.xp !== undefined;
            const voteShare =
              typeof item.voteShare === 'number' &&
              Number.isFinite(item.voteShare) &&
              item.voteShare >= 0 &&
              item.voteShare <= 1
                ? item.voteShare * 100
                : null;
            const sharePercent = hasEngineShare ? engineShare : voteShare;
            const shareLabel =
              hasEngineShare ? 'ENGINE SHARE' : 'VOTE SHARE';
            const shareValue =
              sharePercent === null ? '—' : `${sharePercent.toFixed(1)}%`;
            const shareDescription =
              hasEngineShare
                ? engineShare !== null
                  ? `Engine share ${engineShare.toFixed(1)} percent`
                  : 'Engine share unavailable: no accepted vote events recorded for this song in the current evaluation window'
                : voteShare !== null
                  ? `Vote share ${voteShare.toFixed(1)} percent`
                  : 'Engine percentage unavailable until real Engine inputs are ready';

            return (
              // CARD NZIMA YA WIMBO MMOJA
              <article
                key={item.id}
                data-bora-ui="public-vote-hero-row"
                className={`group relative overflow-visible rounded-[2px] border px-1 py-1 transition-all duration-500 hover:-translate-y-1 md:px-8 md:py-10 ${
                  rank === 1
                    ? 'shadow-[0_20px_80px_rgba(212,175,55,0.045)]'
                    : ''
                }`}
                style={{
                  borderColor:
                    rank === 1
                      ? 'rgba(212,175,55,0.20)'
                      : 'var(--bora-border)',
                  backgroundColor:
                    'color-mix(in srgb, var(--bora-surface) 50%, transparent)',
                }}
              >
                {/* GLOW YA CARD INAYOONEKANA WAKATI WA HOVER */}
                <div
                  className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${
                    rank === 1
                      ? 'bg-[radial-gradient(circle_at_8%_15%,rgba(212,175,55,0.12),transparent_32%)]'
                      : 'bg-[radial-gradient(circle_at_8%_15%,rgba(128,128,128,0.045),transparent_28%)]'
                  }`}
                />

                {/* ROW KUU YA TAARIFA ZA WIMBO */}
                <div className="relative flex items-center gap-3 md:gap-10">
                  <button
                    type="button"
                    aria-label={`Press and hold for two seconds to view ${displayTitle} details`}
                    onPointerDown={(event) => startLongPress(item, event)}
                    onPointerMove={moveLongPress}
                    onPointerUp={clearLongPress}
                    onPointerLeave={clearLongPress}
                    onPointerCancel={clearLongPress}
                    onContextMenu={(event) => event.preventDefault()}
                    onClick={(event) => {
                      if (event.detail === 0) setSelectedSong(item);
                    }}
                    className="relative flex min-w-0 flex-1 items-center gap-3 text-left md:gap-10"
                  >

                  {/* COVER NA RANK */}
                  <div className="relative shrink-0">

                    {/* SIZE NA CONTAINER YA COVER */}
                    <div
                      data-bora-ui="public-vote-hero-artwork"
                      className={`relative z-10 overflow-hidden rounded-full shadow-2xl transition-all duration-500 ease-out group-hover:scale-[1.045] group-hover:shadow-[0_20px_45px_rgba(0,0,0,0.65)] ${
                        rank === 1
                          ? 'h-[120px] w-[120px] md:h-[152px] md:w-[152px]'
                          : 'h-[104px] w-[104px] md:h-[136px] md:w-[136px]'
                      }`}
                      style={{
                        backgroundColor:
                          'var(--bora-background-deep)',
                      }}
                    >
                      {/* PICHA YA ALBUM / WIMBO */}
                      {finalCover ? (
                        <img
                          src={finalCover}
                          alt={displayTitle}
                          className="h-full w-full object-cover brightness-[0.78] transition-all duration-500 group-hover:brightness-100"
                        />
                      ) : (
                        <span
                          aria-label={`Artwork unavailable for ${displayTitle}`}
                          className="flex h-full w-full items-center justify-center font-cinzel text-3xl"
                          style={{ color: 'var(--bora-gold)' }}
                        >
                          ♪
                        </span>
                      )}

                      {/* DARK GRADIENT JUU YA COVER */}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />

                      {/* GOLD OUTLINE MAALUM KWA NUMBER 1 */}
                      {rank === 1 && (
                        <div
                          className="absolute inset-0 ring-1 ring-inset"
                          style={{
                            '--tw-ring-color':
                              'rgba(212,175,55,0.40)',
                          } as React.CSSProperties}
                        />
                      )}
                    </div>

                    {/* NUMBER YA RANK INAYOKAA JUU YA COVER */}
                    <div
                      data-bora-ui="public-vote-hero-rank"
                      className={`absolute -left-4 -top-6 z-20 font-cinzel font-black italic leading-none tracking-[-0.1em] transition-all duration-500 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:scale-110 ${
                        rank === 1
                          ? 'text-6xl md:text-7xl'
                          : rank === 2
                            ? 'text-5xl md:text-6xl'
                            : rank === 3
                              ? 'text-5xl md:text-6xl'
                              : 'text-5xl md:text-6xl'
                      }`}
                      style={{
                        color:
                          rank === 1
                            ? 'var(--bora-gold)'
                            : rank === 2
                              ? '#CD7F32'
                              : rank === 3
                                ? '#ef4444'
                                : 'var(--bora-text)',
                        textShadow:
                          rank === 1
                            ? '0 8px 20px rgba(212,175,55,0.35)'
                            : rank === 2
                              ? '0 8px 18px rgba(205,127,50,0.28)'
                              : rank === 3
                                ? '0 8px 18px rgba(239,68,68,0.22)'
                                : '0 8px 18px rgba(0,0,0,0.9)',
                        opacity: rank > 3 ? 0.9 : 1,
                      }}
                    >
                      {String(rank).padStart(2, '0')}
                    </div>

                    {/* DIAMOND DECORATION CHINI YA COVER */}
                    <div
                      className="absolute -bottom-3 -right-3 z-20 h-6 w-6 rotate-45 border-r border-b transition-all duration-500 group-hover:border-[var(--bora-gold)]/30"
                      style={{
                        borderColor: 'var(--bora-border-strong)',
                      }}
                    />
                  </div>

                  {/* TITLE NA ARTIST */}
                  <div
                    data-bora-ui="public-vote-hero-identity"
                    className="min-w-0 flex-1 py-1 md:py-3"
                  >

                    {/* JINA LA WIMBO — HERO */}
                    <h3
                      data-bora-ui="public-vote-hero-title"
                      className={`break-words font-cinzel font-black uppercase leading-[0.92] tracking-[-0.05em] transition-transform duration-500 group-hover:translate-x-1 ${
                        rank === 1
                          ? 'text-2xl md:text-5xl'
                          : 'text-xl md:text-4xl'
                      }`}
                    >
                      {displayTitle}
                    </h3>

                    {/* JINA LA MSANII + CHART MOVEMENT */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 md:mt-4 md:gap-x-4">

                      {/* JINA LA MSANII */}
                      <span
                        data-bora-ui="public-vote-hero-artist"
                        className="break-words font-cinzel text-[9px] font-bold uppercase tracking-[0.24em] md:text-[10px] md:tracking-[0.35em]"
                        style={{
                          color: 'var(--bora-text-muted)',
                        }}
                      >
                        {displayArtist}
                      </span>

                      {/* LABEL YA CURRENT NUMBER 1 */}
                      {rank === 1 && (
                        <span
                          className="shrink-0 text-[7px] font-mono font-bold uppercase tracking-[0.3em]"
                          style={{
                            color: 'var(--bora-gold)',
                            opacity: 0.55,
                          }}
                        >
                          CURRENT #1
                        </span>
                      )}

                      {/* CHART MOVEMENT */}
                      <div className="shrink-0">
                        <ChartAnimation
                          currentRank={rank}
                          previousRank={previousRank}
                        />
                      </div>
                    </div>
                  </div>

                  </button>

                  {/* DESKTOP XP SHARE NA VOTE BUTTONS */}
                  <div className="hidden shrink-0 items-center gap-8 lg:flex">

                    {/* XP SHARE */}
                    <div className="w-36 -translate-x-2">
                      <div className="mb-2 flex items-center justify-between">
                        <span
                          className="text-[7px] font-mono uppercase tracking-[0.25em]"
                          style={{
                            color: 'var(--bora-gold)',
                          }}
                        >
                          {shareLabel}
                        </span>
                      </div>

                      <div
                        className="h-[3px] w-full overflow-hidden"
                        style={{
                          backgroundColor: 'var(--bora-border)',
                        }}
                      >
                        <div
                          className="h-full bg-[var(--bora-gold)] transition-all duration-700"
                          style={{
                            width: `${sharePercent ?? 0}%`,
                          }}
                        />
                      </div>

                      <div
                        data-bora-ui="public-vote-hero-xp-share-value"
                        aria-label={
                          shareDescription
                        }
                        className="relative mt-2 text-right text-4xl font-black leading-none tracking-[-0.06em] tabular-nums text-[var(--bora-gold)] transition-transform duration-500 group-hover:scale-105"
                      >
                        {shareValue}
                      </div>
                      {sharePercent === null && (
                        <p
                          className="mt-1 text-right text-[6px] font-mono uppercase tracking-[0.12em]"
                          style={{ color: 'var(--bora-text-subtle)' }}
                        >
                          {hasEngineShare
                            ? 'Awaiting accepted vote events'
                            : 'Awaiting real Engine inputs'}
                        </p>
                      )}
                    </div>

                    {/* DESKTOP BUTTONS ZA KUPANDISHA NA KUSHUSHA WIMBO */}
                    <div className="flex gap-2">

                      {/* BUTTON YA PANDISHA */}
                      <button
                        type="button"
                        aria-label={`Pandisha ${displayTitle}`}
                        onClick={() =>
                          onVote(
                            item.id,
                            displayTitle,
                            'up'
                          )
                        }
                        className="group/vote bora-pandisha flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--bora-gold)]/75 bg-[var(--bora-gold)]/[0.07] px-6 text-[var(--bora-gold)] shadow-[0_0_18px_rgba(255,196,0,0.28)] transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out hover:scale-[1.035] hover:border-[var(--bora-gold)] hover:bg-[var(--bora-gold)]/[0.11] hover:shadow-[0_0_24px_rgba(255,196,0,0.42)] active:scale-[0.96]"
                      >
                        <ArrowUp
                          size={18}
                          strokeWidth={1.8}
                          className="bora-pandisha-icon"
                        />

                        <span className="text-[8px] font-black uppercase tracking-[0.18em]">
                          PANDISHA
                        </span>
                      </button>

                      {/* BUTTON YA SHUSHA */}
                      <button
                        type="button"
                        aria-label={`Shusha ${displayTitle}`}
                        onClick={() =>
                          onVote(
                            item.id,
                            displayTitle,
                            'down'
                          )
                        }
                        className="group/vote flex h-11 items-center justify-center gap-2 rounded-full border border-red-600/45 bg-red-600/[0.035] px-4 text-red-500 transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out hover:scale-[1.025] hover:border-red-500/70 hover:bg-red-600/[0.08] hover:shadow-[0_0_14px_rgba(220,20,60,0.22)] active:scale-[0.96]"
                      >
                        <ArrowDown
                          size={18}
                          strokeWidth={1.8}
                          className="transition-transform duration-300 group-hover/vote:translate-y-1 group-hover/vote:scale-110"
                        />

                        <span className="text-[8px] font-black uppercase tracking-[0.18em]">
                          SHUSHA
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* MOBILE XP SHARE */}
                  <div className="flex shrink-0 -translate-x-1 flex-col items-end lg:hidden">

                    <span
                      className="text-[7px] font-mono uppercase tracking-[0.2em]"
                      style={{
                        color: 'var(--bora-gold)',
                      }}
                    >
                      {shareLabel}
                    </span>

                    <span
                      data-bora-ui="public-vote-hero-xp-share-value-compact"
                      aria-label={
                        shareDescription
                      }
                      className="mt-1 text-3xl font-black leading-none tracking-[-0.05em] tabular-nums text-[var(--bora-gold)] transition-transform duration-500 group-hover:scale-105"
                    >
                      {shareValue}
                    </span>
                    {sharePercent === null && (
                      <span
                        className="mt-1 text-right text-[5px] font-mono uppercase tracking-[0.08em]"
                        style={{ color: 'var(--bora-text-subtle)' }}
                      >
                        Awaiting real Engine
                      </span>
                    )}
                  </div>
                </div>

                {/* MOBILE VOTE ROW */}
                <div
                  className="mt-5 flex items-center justify-end gap-2 border-t pt-4 lg:hidden"
                  style={{
                    borderColor: 'var(--bora-border)',
                  }}
                >

                  {/* MOBILE BUTTON YA PANDISHA */}
                  <button
                    type="button"
                    aria-label={`Pandisha ${displayTitle}`}
                    onClick={() =>
                      onVote(
                        item.id,
                        displayTitle,
                        'up'
                      )
                    }
                    className="group/vote bora-pandisha flex h-11 items-center justify-center gap-2 rounded-full border border-[var(--bora-gold)]/75 bg-[var(--bora-gold)]/[0.07] px-5 text-[var(--bora-gold)] shadow-[0_0_16px_rgba(255,196,0,0.28)] transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out hover:scale-[1.035] hover:border-[var(--bora-gold)] hover:bg-[var(--bora-gold)]/[0.11] hover:shadow-[0_0_22px_rgba(255,196,0,0.42)] active:scale-[0.96]"
                  >
                    <ArrowUp
                      size={17}
                      strokeWidth={1.8}
                      className="bora-pandisha-icon"
                    />

                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">
                      PANDISHA
                    </span>
                  </button>

                  {/* MOBILE BUTTON YA SHUSHA */}
                  <button
                    type="button"
                    aria-label={`Shusha ${displayTitle}`}
                    onClick={() =>
                      onVote(
                        item.id,
                        displayTitle,
                        'down'
                      )
                    }
                    className="group/vote flex h-10 items-center justify-center gap-2 rounded-full border border-red-600/45 bg-red-600/[0.035] px-3 text-red-500 transition-[transform,background-color,border-color,box-shadow] duration-300 ease-out hover:scale-[1.025] hover:border-red-500/70 hover:bg-red-600/[0.08] hover:shadow-[0_0_12px_rgba(220,20,60,0.20)] active:scale-[0.94]"
                  >
                    <ArrowDown
                      size={17}
                      strokeWidth={1.8}
                      className="transition-transform duration-300 group-hover/vote:translate-y-1 group-hover/vote:scale-110"
                    />

                    <span className="text-[8px] font-black uppercase tracking-[0.15em]">
                      SHUSHA
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <TapGUI
        song={
          selectedSong
            ? {
                rank: songs.indexOf(selectedSong) + 1,
                metadata: selectedSong.metadata ?? {
                  title: selectedSong.title,
                  artist: selectedSong.artist ?? '',
                  feature: '-',
                  producer: '-',
                  releaseDate: '',
                  genre: '',
                  artwork: selectedSong.cover_url,
                  youtube: '',
                  spotify: '',
                  boomplay: '',
                },
                totalUpvotes: selectedSong.upvotes,
              }
            : null
        }
        onClose={() => setSelectedSong(null)}
      />

      <style jsx>{`
        @keyframes boraPandishaBorder {
          0%,
          100% {
            border-color: color-mix(in srgb, var(--bora-gold) 68%, transparent);
            box-shadow: 0 0 14px rgba(255, 196, 0, 0.22);
          }

          50% {
            border-color: var(--bora-gold);
            box-shadow: 0 0 22px rgba(255, 196, 0, 0.38);
          }
        }

        .bora-pandisha {
          animation: boraPandishaBorder 3s ease-in-out infinite;
        }

        .bora-pandisha-icon {
          transition:
            transform 300ms cubic-bezier(0.68, -0.55, 0.27, 2.5),
            opacity 200ms ease;
        }

        .bora-pandisha:hover .bora-pandisha-icon {
          transform: translateY(-2px) scale(1.08);
        }

        @media (prefers-reduced-motion: reduce) {
          .bora-pandisha {
            animation: none;
          }

          .bora-pandisha-icon {
            transition: none;
          }
        }
      `}</style>
    </section>
  );
}