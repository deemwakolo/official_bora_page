'use client';

import React, { useRef, useState } from 'react';

import NewSongsSlide from './slides/NewSongsSlide';
import NewArtistsSlide from './slides/NewArtistsSlide';
import PlaylistsSlide from './slides/PlaylistsSlide';
import UpcomingShowsSlide from './slides/UpcomingShowsSlide';

import discoverTheme from './DiscoverTheme';

type DiscoverSlide =
  | 'songs'
  | 'artists'
  | 'playlists'
  | 'shows';

export default function DiscoverGUI() {
  // SLIDE ILIYO ACTIVE
  const [activeSlide, setActiveSlide] =
    useState<DiscoverSlide>('songs');

  // CONTAINER YA CAROUSEL
  const carouselRef = useRef<HTMLDivElement>(null);

  // COMING SOON POPUP
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);

  const slides: DiscoverSlide[] = [
    'songs',
    'artists',
    'playlists',
    'shows',
  ];

  const slideLabels = {
    songs: 'NEW SONGS',
    artists: 'NEW ARTISTS',
    playlists: 'PLAYLISTS',
    shows: 'UPCOMING SHOWS',
  };

  // KUHAMIA KWENYE SLIDE ULIYOCHAGUA
  const goToSlide = (slide: DiscoverSlide) => {
    const index = slides.indexOf(slide);

    if (!carouselRef.current) return;

    carouselRef.current.scrollTo({
      left: index * carouselRef.current.clientWidth,
      behavior: 'smooth',
    });

    setActiveSlide(slide);
  };

  // KUFUATILIA SLIDE INAYOONEKANA
  const handleScroll = () => {
    if (!carouselRef.current) return;

    const width = carouselRef.current.clientWidth;

    if (!width) return;

    const index = Math.round(
      carouselRef.current.scrollLeft / width
    );

    const slide = slides[index];

    if (slide) {
      setActiveSlide(slide);
    }
  };

  // ARCHIVE BADO HAIJAWEKWA LIVE
  const handleArchiveClick = () => {
    setShowComingSoon(true);

    requestAnimationFrame(() => {
      setComingSoonVisible(true);
    });

    window.setTimeout(() => {
      setComingSoonVisible(false);

      window.setTimeout(() => {
        setShowComingSoon(false);
      }, 300);
    }, 1500);
  };

  return (
    <section
      className="w-full"
      style={{
        backgroundColor: discoverTheme.background,
        color: discoverTheme.text,
      }}
    >
      {/* DISCOVER CAROUSEL */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
        style={{
          backgroundColor: discoverTheme.background,
          color: discoverTheme.text,
        }}
      >
        {/* NEW SONGS */}
        <div
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: discoverTheme.background,
            color: discoverTheme.text,
          }}
        >
          <NewSongsSlide />
        </div>

        {/* NEW ARTISTS */}
        <div
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: discoverTheme.background,
            color: discoverTheme.text,
          }}
        >
          <NewArtistsSlide />
        </div>

        {/* PLAYLISTS */}
        <div
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: discoverTheme.background,
            color: discoverTheme.text,
          }}
        >
          <PlaylistsSlide />
        </div>

        {/* UPCOMING SHOWS */}
        <div
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: discoverTheme.background,
            color: discoverTheme.text,
          }}
        >
          <UpcomingShowsSlide />
        </div>
      </div>

      {/* DISCOVER NAVIGATION */}
      <div
        className="flex items-center justify-center gap-5 border-t px-4 pt-5"
        style={{
          backgroundColor: discoverTheme.background,
          borderColor: discoverTheme.border,
        }}
      >
        {slides.map((slide) => (
          <button
            key={slide}
            type="button"
            onClick={() => goToSlide(slide)}
            className="text-[8px] font-black uppercase tracking-[0.18em] transition-all duration-300"
            style={{
              color:
                activeSlide === slide
                  ? discoverTheme.gold
                  : discoverTheme.textSubtle,
            }}
            onMouseEnter={(event) => {
              if (activeSlide !== slide) {
                event.currentTarget.style.color =
                  discoverTheme.textMuted;
              }
            }}
            onMouseLeave={(event) => {
              if (activeSlide !== slide) {
                event.currentTarget.style.color =
                  discoverTheme.textSubtle;
              }
            }}
          >
            {slideLabels[slide]}
          </button>
        ))}
      </div>

      {/* ARCHIVE BUTTON */}
      <div
        className="flex justify-center px-4 pt-8 pb-10"
        style={{
          backgroundColor: discoverTheme.background,
        }}
      >
        <button
          type="button"
          onClick={handleArchiveClick}
          className="w-full max-w-md rounded-full px-8 py-5 text-center text-sm font-black uppercase tracking-[0.3em] transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
          style={{
            backgroundColor: discoverTheme.red,
            color: discoverTheme.text,
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor =
              'color-mix(in srgb, var(--bora-red) 85%, white)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor =
              discoverTheme.red;
          }}
        >
          ARCHIVE
        </button>
      </div>

      {/* COMING SOON POPUP */}
      {showComingSoon && (
        <div
          className={`fixed inset-0 z-[90] flex items-center justify-center px-6 transition-opacity duration-300 ${
            comingSoonVisible
              ? 'opacity-100'
              : 'opacity-0'
          }`}
          style={{
            backgroundColor: 'rgba(0,0,0,0.28)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div
            className={`flex flex-col items-center justify-center rounded-[2rem] border px-12 py-9 text-center shadow-2xl transition-all duration-300 ${
              comingSoonVisible
                ? 'translate-y-0 scale-100 opacity-100'
                : 'translate-y-3 scale-95 opacity-0'
            }`}
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--bora-surface-elevated) 72%, transparent)',
              borderColor:
                'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
              color: discoverTheme.text,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow:
                '0 25px 80px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* EMOJI */}
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full border text-3xl animate-[emojiPop_500ms_cubic-bezier(0.16,1,0.3,1)]"
              style={{
                backgroundColor: discoverTheme.goldGlow,
                borderColor: discoverTheme.borderStrong,
              }}
            >
              🙂
            </div>

            {/* MAIN MESSAGE */}
            <span
              className="mt-5 text-sm font-black uppercase tracking-[0.32em]"
              style={{
                color: discoverTheme.text,
              }}
            >
              COMING SOON
            </span>

            {/* SECTION NAME */}
            <span
              className="mt-2 text-[9px] font-bold uppercase tracking-[0.22em]"
              style={{
                color: discoverTheme.textSubtle,
              }}
            >
              ARCHIVE
            </span>
          </div>
        </div>
      )}

      {/* POPUP ANIMATION */}
      <style jsx>{`
        @keyframes emojiPop {
          0% {
            opacity: 0;
            transform: scale(0.5) rotate(-8deg);
          }

          70% {
            transform: scale(1.08) rotate(2deg);
          }

          100% {
            opacity: 1;
            transform: scale(1) rotate(0);
          }
        }
      `}</style>
    </section>
  );
}