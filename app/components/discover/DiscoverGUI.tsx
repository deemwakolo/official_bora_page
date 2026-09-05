'use client';

import React, { useRef, useState } from 'react';

import NewSongsSlide from './slides/NewSongsSlide';
import NewArtistsSlide from './slides/NewArtistsSlide';
import PlaylistsSlide from './slides/PlaylistsSlide';
import UpcomingShowsSlide from './slides/UpcomingShowsSlide';

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

  return (
    <section className="w-full">
      {/* DISCOVER CAROUSEL */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
      >
        {/* NEW SONGS */}
        <div className="w-full shrink-0 snap-center">
          <NewSongsSlide />
        </div>

        {/* NEW ARTISTS */}
        <div className="w-full shrink-0 snap-center">
          <NewArtistsSlide />
        </div>

        {/* PLAYLISTS */}
        <div className="w-full shrink-0 snap-center">
          <PlaylistsSlide />
        </div>

        {/* UPCOMING SHOWS */}
        <div className="w-full shrink-0 snap-center">
          <UpcomingShowsSlide />
        </div>
      </div>

      {/* DISCOVER NAVIGATION */}
      <div className="flex items-center justify-center gap-5 pt-5">
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
            {slideLabels[slide]}
          </button>
        ))}
      </div>

      {/* ARCHIVE BUTTON */}
      <div className="flex justify-center px-4 pt-8 pb-10">
        <a
          href="/archive"
          className="w-full max-w-md bg-[#b91c1c] px-8 py-5 text-center text-sm font-black uppercase tracking-[0.3em] text-white transition-all duration-300 hover:bg-[#dc2626]"
        >
          ARCHIVE
        </a>
      </div>
    </section>
  );
}