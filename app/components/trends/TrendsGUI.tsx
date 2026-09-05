'use client';

import React, { useRef, useState } from 'react';

import ThroneSlide from './slides/ThroneSlide';
import YouTubeSlide from './slides/YouTubeSlide';
import SpotifySlide from './slides/SpotifySlide';
import ArtistSlide from './slides/ArtistSlide';

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
    <section className="w-full">
      {/* CAROUSEL YA TRENDS */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
      >
        <div className="w-full shrink-0 snap-center">
          <ThroneSlide />
        </div>

        <div className="w-full shrink-0 snap-center">
          <YouTubeSlide />
        </div>

        <div className="w-full shrink-0 snap-center">
          <SpotifySlide />
        </div>

        <div className="w-full shrink-0 snap-center">
          <ArtistSlide />
        </div>
      </div>

      {/* NAVIGATION YA TRENDS */}
      <div className="flex items-center justify-center gap-5 border-t border-white/[0.06] bg-[#050505] px-4 py-5">
        {slides.map((slide) => (
          <button
            key={slide}
            type="button"
            onClick={() => goToSlide(slide)}
            className={`text-[8px] font-black uppercase tracking-[0.18em] transition-all duration-300 ${
              activeSlide === slide
                ? 'text-[#D4AF37]'
                : 'text-white/30 hover:text-white/70'
            }`}
          >
            {labels[slide]}
          </button>
        ))}
      </div>
    </section>
  );
}