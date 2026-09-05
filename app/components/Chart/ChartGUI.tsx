'use client';

import React from 'react';
import ChartAnimation from './ChartAnimation';

import {
  Youtube,
  Music,
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
  momentum_score?: number;
  yt_rank?: number;
  sp_rank?: number;

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
  return (
    // SECTION NZIMA YA CHART
    <section className="relative min-h-screen overflow-hidden bg-[#050505] text-white selection:bg-[#D4AF37] selection:text-black">

      {/* BACKGROUND YA CHART */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[#050505]" />

        {/* GLOW YA GOLD UPANDE WA JUU */}
        <div className="absolute left-1/2 top-0 h-[700px] w-[1000px] -translate-x-1/2 rounded-full bg-[#D4AF37]/[0.035] blur-[150px]" />

        {/* GLOW YA RED UPANDE WA CHINI KULIA */}
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-[#b91c1c]/[0.025] blur-[140px]" />
      </div>

      {/* CONTAINER KUU YA CHART */}
      <div className="relative mx-auto max-w-6xl px-1 py-8 md:px-10 md:py-16">

        {/* LIST YA NYIMBO */}
        <div className="flex flex-col gap-5 md:gap-7">

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

            // KUTENGENEZA YOUTUBE THUMBNAIL KAMA YOUTUBE ID IPO
            const finalCover = item.youtube_id
              ? `https://img.youtube.com/vi/${item.youtube_id}/maxresdefault.jpg`
              : item.cover_url || '/placeholder.jpg';

            // KUBADILISHA MOMENTUM SCORE KUWA NUMBER
            const score = Math.floor(
              Number(item.momentum_score) || 0
            );

            // THEME YA POWER SCORE KULINGANA NA RANK
            const scoreTheme =
              rank === 1
                ? 'text-[#D4AF37] drop-shadow-[0_0_18px_rgba(212,175,55,0.35)]'
                : rank === 2
                  ? 'text-[#CD7F32] drop-shadow-[0_0_16px_rgba(205,127,50,0.28)]'
                  : rank === 3
                    ? 'text-red-500 drop-shadow-[0_0_16px_rgba(239,68,68,0.22)]'
                    : 'text-white/90';

            return (
              // CARD NZIMA YA WIMBO MMOJA
              <article
                key={item.id}
                className={`group relative overflow-visible rounded-[2px] border border-white/[0.03] bg-[#090909]/50 px-1 py-1 transition-all duration-500 hover:-translate-y-1 hover:border-white/[0.14] hover:bg-[#0c0c0c] md:px-8 md:py-10 ${
                  rank === 1
                    ? 'border-[#D4AF37]/20 shadow-[0_20px_80px_rgba(212,175,55,0.045)]'
                    : ''
                }`}
              >

                {/* GLOW YA CARD INAYOONEKANA WAKATI WA HOVER */}
                <div
                  className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 ${
                    rank === 1
                      ? 'bg-[radial-gradient(circle_at_8%_15%,rgba(212,175,55,0.12),transparent_32%)]'
                      : 'bg-[radial-gradient(circle_at_8%_15%,rgba(255,255,255,0.045),transparent_28%)]'
                  }`}
                />

                {/* ROW KUU YA TAARIFA ZA WIMBO */}
                <div className="relative flex items-center gap-3 md:gap-10">

                  {/* COVER NA RANK */}
                  <div className="relative shrink-0">

                    {/* SIZE NA CONTAINER YA COVER */}
                    <div
                      className={`relative z-10 overflow-hidden bg-[#080808] shadow-2xl transition-all duration-500 ease-out group-hover:scale-[1.045] group-hover:shadow-[0_20px_45px_rgba(0,0,0,0.65)] ${
                        rank === 1
                          ? 'h-28 w-28 md:h-36 md:w-36'
                          : 'h-24 w-24 md:h-32 md:w-32'
                      }`}
                    >

                      {/* PICHA YA ALBUM / WIMBO */}
                      <img
                        src={finalCover}
                        alt={displayTitle}
                        className="h-full w-full object-cover brightness-[0.78] transition-all duration-500 group-hover:brightness-100"
                      />

                      {/* DARK GRADIENT JUU YA COVER */}
                      <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/30" />

                      {/* GOLD OUTLINE MAALUM KWA NUMBER 1 */}
                      {rank === 1 && (
                        <div className="absolute inset-0 ring-1 ring-inset ring-[#D4AF37]/40" />
                      )}
                    </div>

                    {/* NUMBER YA RANK INAYOKAA JUU YA COVER */}
                    <div
                      className={`absolute -left-4 -top-6 z-20 font-black italic leading-none tracking-[-0.1em] transition-all duration-500 group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:scale-110 ${
                        rank === 1
                          ? 'text-[#D4AF37] drop-shadow-[0_8px_20px_rgba(212,175,55,0.35)] text-6xl md:text-7xl'
                          : rank === 2
                            ? 'text-[#CD7F32] drop-shadow-[0_8px_18px_rgba(205,127,50,0.28)] text-5xl md:text-6xl'
                            : rank === 3
                              ? 'text-red-500 drop-shadow-[0_8px_18px_rgba(239,68,68,0.22)] text-5xl md:text-6xl'
                              : 'text-white/90 drop-shadow-[0_8px_18px_rgba(0,0,0,0.9)] text-5xl md:text-6xl'
                      }`}
                    >
                      {String(rank).padStart(2, '0')}
                    </div>

                    {/* DIAMOND DECORATION CHINI YA COVER */}
                    <div className="absolute -bottom-3 -right-3 z-20 h-6 w-6 rotate-45 border-r border-b border-white/10 transition-all duration-500 group-hover:border-[#D4AF37]/30" />
                  </div>

                  {/* TITLE NA ARTIST */}
                  <div className="min-w-0 flex-1 py-1 md:py-3">

                    {/* JINA LA MSANII + CHART MOVEMENT */}
                    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 md:gap-x-4">

                      {/* JINA LA MSANII */}
                      <span className="break-words text-[8px] font-bold uppercase tracking-[0.22em] text-[#D4AF37] md:text-[10px] md:tracking-[0.4em]">
                        {displayArtist}
                      </span>

                      {/* LABEL YA CURRENT NUMBER 1 */}
                      {rank === 1 && (
                        <span className="shrink-0 text-[7px] font-mono font-bold uppercase tracking-[0.3em] text-[#D4AF37]/55">
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

                    {/* JINA LA WIMBO */}
                    <h3
                      className={`break-words font-black uppercase leading-[0.92] tracking-[-0.05em] transition-transform duration-500 group-hover:translate-x-1 ${
                        rank === 1
                          ? 'text-2xl md:text-5xl'
                          : 'text-xl md:text-4xl'
                      }`}
                    >
                      {displayTitle}
                    </h3>

                    {/* RANKING ZA YOUTUBE NA SPOTIFY */}
                    <div className="mt-4 flex flex-wrap items-center gap-3 md:mt-6 md:gap-4">

                      {/* YOUTUBE RANK */}
                      {item.yt_rank && (
                        <div className="flex items-center gap-2 text-red-500/70">
                          <Youtube size={11} />

                          <span className="text-[8px] font-mono font-bold uppercase tracking-[0.12em]">
                            #{item.yt_rank} YT
                          </span>
                        </div>
                      )}

                      {/* SPOTIFY RANK */}
                      {item.sp_rank && (
                        <div className="flex items-center gap-2 text-green-500/70">
                          <Music size={11} />

                          <span className="text-[8px] font-mono font-bold uppercase tracking-[0.12em]">
                            #{item.sp_rank} SP
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DESKTOP POWER INDEX NA VOTE BUTTONS */}
                  <div className="hidden shrink-0 items-center gap-8 lg:flex">

                    {/* POWER INDEX */}
                    <div className="w-32 -translate-x-2">

                      {/* POWER NA POINTS LABEL */}
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[7px] font-mono uppercase tracking-[0.25em] text-white/25">
                          POWER
                        </span>

                        <span className="text-[8px] font-mono text-white/25">
                          PTS
                        </span>
                      </div>

                      {/* POWER BAR */}
                      <div className="h-[3px] w-full overflow-hidden bg-white/[0.07]">
                        <div
                          className={`h-full transition-all duration-700 ${
                            rank === 1
                              ? 'bg-[#D4AF37]'
                              : rank === 2
                                ? 'bg-slate-300'
                                : rank === 3
                                  ? 'bg-red-500'
                                  : 'bg-white/40'
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, score)
                            )}%`,
                          }}
                        />
                      </div>

                      {/* POWER SCORE KUBWA */}
                      <div
                        className={`relative mt-1 -translate-x-1 overflow-visible text-right text-6xl font-black italic leading-none tracking-[-0.08em] tabular-nums transition-all duration-500 group-hover:-translate-x-2 group-hover:scale-105 ${scoreTheme}`}
                      >
                        {score}
                      </div>
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
                        className="group/vote flex h-11 items-center justify-center gap-2 border border-white/10 px-3 text-white/50 transition-all duration-300 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.08] hover:text-[#D4AF37] active:scale-90"
                      >
                        <ArrowUp
                          size={18}
                          strokeWidth={1.8}
                          className="transition-transform duration-300 group-hover/vote:-translate-y-1 group-hover/vote:scale-110"
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
                        className="group/vote flex h-11 items-center justify-center gap-2 border border-white/10 px-3 text-white/50 transition-all duration-300 hover:border-red-600/50 hover:bg-red-600/[0.08] hover:text-red-500 active:scale-90"
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

                  {/* MOBILE POWER SCORE */}
                  <div className="flex shrink-0 -translate-x-1 flex-col items-end lg:hidden">

                    {/* POWER LABEL */}
                    <span className="text-[7px] font-mono uppercase tracking-[0.2em] text-white/25">
                      POWER
                    </span>

                    {/* POWER SCORE YA MOBILE */}
                    <span
                      className={`mt-1 text-4xl font-black italic leading-none tracking-[-0.07em] tabular-nums transition-all duration-500 group-hover:scale-110 ${scoreTheme}`}
                    >
                      {score}
                    </span>
                  </div>
                </div>

                {/* MOBILE VOTE ROW */}
                <div className="mt-5 flex items-center justify-end gap-2 border-t border-white/[0.05] pt-4 lg:hidden">

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
                    className="group/vote flex h-10 items-center justify-center gap-2 border border-white/10 px-4 text-white/50 transition-all duration-300 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/[0.08] hover:text-[#D4AF37] active:scale-90"
                  >
                    <ArrowUp
                      size={17}
                      strokeWidth={1.8}
                      className="transition-transform duration-300 group-hover/vote:-translate-y-1 group-hover/vote:scale-110"
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
                    className="group/vote flex h-10 items-center justify-center gap-2 border border-white/10 px-4 text-white/50 transition-all duration-300 hover:border-red-600/50 hover:bg-red-600/[0.08] hover:text-red-500 active:scale-90"
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
    </section>
  );
}