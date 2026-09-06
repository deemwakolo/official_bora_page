'use client';

import React, { useRef, useState } from 'react';

import ThroneSlide from './slides/ThroneSlide';
import YouTubeSlide from './slides/YouTubeSlide';
import SpotifySlide from './slides/SpotifySlide';
import ArtistSlide from './slides/ArtistSlide';

import trendsTheme from './TrendsTheme';

type TrendSlide = 'throne' | 'youtube' | 'spotify' | 'artists';

export default function TrendsGUI() {
  // SLIDE ILIYO ACTIVE
  const [activeSlide, setActiveSlide] =
    useState<TrendSlide>('throne');

  // CONTAINER YA CAROUSEL
  const carouselRef = useRef<HTMLDivElement>(null);

  const slides: TrendSlide[] = [
    'throne',
    'youtube',
    'spotify',
    'artists',
  ];

  const labels = {
    throne: 'THRONE',
    youtube: 'YOUTUBE',
    spotify: 'SPOTIFY',
    artists: 'ARTISTS',
  };

  // KUSOGEZA KWENYE SLIDE
  const goToSlide = (slide: TrendSlide) => {
    const index = slides.indexOf(slide);

    if (!carouselRef.current) return;

    carouselRef.current.scrollTo({
      left: index * carouselRef.current.clientWidth,
      behavior: 'smooth',
    });

    setActiveSlide(slide);
  };

  // KUJUA SLIDE ILIYOONEKANA
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

  return (
    <section
      className="w-full"
      style={{
        backgroundColor: trendsTheme.background,
        color: trendsTheme.text,
      }}
    >
      {/* CAROUSEL YA TRENDS */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
        style={{
          backgroundColor: trendsTheme.background,
          color: trendsTheme.text,
        }}
      >
        <div
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: trendsTheme.background,
            color: trendsTheme.text,
          }}
        >
          <ThroneSlide />
        </div>

        <div
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: trendsTheme.background,
            color: trendsTheme.text,
          }}
        >
          <YouTubeSlide />
        </div>

        <div
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: trendsTheme.background,
            color: trendsTheme.text,
          }}
        >
          <SpotifySlide />
        </div>

        <div
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: trendsTheme.background,
            color: trendsTheme.text,
          }}
        >
          <ArtistSlide />
        </div>
      </div>

      {/* NAVIGATION YA TRENDS */}
      <div
        className="flex items-center justify-center gap-5 border-t px-4 py-5"
        style={{
          backgroundColor: trendsTheme.background,
          borderColor: trendsTheme.border,
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
                  ? trendsTheme.gold
                  : trendsTheme.textSubtle,
            }}
            onMouseEnter={(event) => {
              if (activeSlide !== slide) {
                event.currentTarget.style.color =
                  trendsTheme.textMuted;
              }
            }}
            onMouseLeave={(event) => {
              if (activeSlide !== slide) {
                event.currentTarget.style.color =
                  trendsTheme.textSubtle;
              }
            }}
          >
            {labels[slide]}
          </button>
        ))}
      </div>
    </section>
  );
}