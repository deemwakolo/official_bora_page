'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { MomentSong } from './MomentChart';

interface TopPerformersProps {
  songs: MomentSong[];
}

function Artwork({ src }: { src: string }) {
  const hasImg = src.trim().length > 0;

  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border"
      style={{
        borderRadius: '0.5rem',
        backgroundColor: '#1c1c1e',
        borderColor: 'var(--bora-border)',
      }}
    >
      {hasImg ? (
        <span
          className="h-full w-full"
          style={{
            backgroundImage: "url('" + src + "')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ) : (
        <span
          className="font-cinzel text-[12px]"
          style={{
            color: 'var(--bora-gold)',
            opacity: 0.8,
          }}
        >
          {'\u266A'}
        </span>
      )}
    </span>
  );
}

function Column({
  label,
  song,
  stat,
}: {
  label: string;
  song: MomentSong | null;
  stat: string | null;
}) {
  return (
    <div
      className="min-w-0 flex-1 px-2 py-3 sm:px-5 sm:py-2"
      style={{ borderColor: 'var(--bora-border)' }}
    >
      <div
        className="text-[7px] font-black uppercase tracking-[0.22em] sm:text-[8px] sm:tracking-[0.3em]"
        style={{ color: 'var(--bora-gold)' }}
      >
        {label}
      </div>

      {song ? (
        <div className="mt-2 flex min-w-0 items-center gap-2 sm:mt-3 sm:gap-3">
          <Artwork src={song.metadata.artwork} />

          <span className="min-w-0 flex-1">
            <span
              className="block truncate text-[11px] font-bold leading-tight sm:text-[12px]"
              style={{ color: 'var(--bora-text)' }}
            >
              {song.metadata.title}
            </span>

            <span
              className="mt-0.5 block truncate text-[9px] sm:mt-1 sm:text-[10px]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              {song.metadata.artist}
            </span>
          </span>
        </div>
      ) : (
        <div
          className="mt-2 text-[12px] font-bold"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          &mdash;
        </div>
      )}

      <div
        className="mt-1.5 text-[8px] font-black uppercase tracking-[0.12em] sm:mt-2 sm:text-[9px] sm:tracking-[0.16em]"
        style={{
          color: stat
            ? 'var(--bora-gold)'
            : 'var(--bora-text-subtle)',
        }}
      >
        {stat ?? '\u2014'}
      </div>
    </div>
  );
}

interface Special {
  label: string;
  song: MomentSong | null;
  stat: string | null;
}

export default function TopPerformers({
  songs,
}: TopPerformersProps) {
  /*
   * SLIDE MODEL — the three specials keep their EXISTING calculations
   * (unchanged). useMemo only recomputes when `songs` changes; the model
   * is always three items, so index 0..2 stays valid.
   */
  const slides = useMemo<Special[]>(() => {
    let highRise: MomentSong | null = null;
    let highDelta = -1;

    for (const song of songs) {
      if (song.movement.kind !== 'up') continue;

      const delta = song.movement.delta ?? 0;

      if (delta > highDelta) {
        highDelta = delta;
        highRise = song;
      }
    }

    const debut =
      songs.find((song) => song.movement.kind === 'new') ?? null;

    const longStay =
      songs.find((song) => song.rank === 1) ??
      songs[0] ??
      null;

    const highStat = highRise
      ? '\u25B2 ' + (highRise.movement.delta ?? 0)
      : null;

    const debutStat = debut ? 'NEW' : null;

    const longStat = longStay
      ? '#' + longStay.rank
      : null;

    return [
      { label: 'Long Stay', song: longStay, stat: longStat },
      { label: 'High Rise', song: highRise, stat: highStat },
      { label: 'Debut', song: debut, stat: debutStat },
    ];
  }, [songs]);

  const slideCount = slides.length;

  // STATE — reduced motion is read after mount (SSR-safe: false on server
  // + client, corrected after mount to avoid a hydration mismatch).
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const autoActive = !isHolding && !reducedMotion;

  // AUTO-ROTATION — single interval, fresh 6s window each advance (so
  // manual swipe / hold-release also resets it). Cleaned up on unmount
  // and whenever it should not run (no duplicate intervals).
  useEffect(() => {
    if (!autoActive) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slideCount);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [autoActive, index, slideCount]);

  const goTo = useCallback(
    (nextIndex: number) => {
      setIndex(((nextIndex % slideCount) + slideCount) % slideCount);
    },
    [slideCount]
  );
  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  // TOUCH SWIPE — horizontal drag advances/rewinds; vertical page scroll
  // preserved via touch-action: pan-y on the viewport.
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX == null) return;
    const endX = event.changedTouches[0]?.clientX ?? startX;
    const delta = endX - startX;
    const threshold = 40;
    if (delta <= -threshold) goNext();
    else if (delta >= threshold) goPrev();
  };

  return (
    <section
      data-bora-ui="public-charts-performers"
      className="mx-auto w-full max-w-3xl px-3 pb-3 sm:px-4"
      aria-label="Top performers"
    >
      <div
        data-bora-ui="public-charts-performers-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label="Chart specials carousel"
        className="relative min-h-[96px] select-none overflow-hidden"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onPointerDown={() => setIsHolding(true)}
        onPointerUp={() => setIsHolding(false)}
        onPointerCancel={() => setIsHolding(false)}
        onPointerLeave={() => setIsHolding(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((special, slideIndex) => {
            const isActive = slideIndex === index;
            return (
              <div
                key={special.label}
                role="group"
                aria-roledescription="slide"
                aria-label={`${special.label}, ${slideIndex + 1} of ${slideCount}`}
                aria-hidden={!isActive}
                className="w-full shrink-0"
              >
                <Column
                  label={special.label}
                  song={special.song}
                  stat={special.stat}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* POLITE LIVE REGION — identifies the current special without
          interrupting (never assertive). */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {`${slides[index].label}, ${index + 1} of ${slideCount}`}
      </p>

      {/* SECTION SEPARATOR — mirrors the original bottom border. */}
      <div style={{ borderBottom: '1px solid var(--bora-border)' }} />
    </section>
  );
}