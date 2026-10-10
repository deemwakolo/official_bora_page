'use client';

import React, { useRef, useState } from 'react';

import YouTubeSlide from './slides/YouTubeSlide';
import SpotifySlide from './slides/SpotifySlide';
import ArtistSlide from './slides/ArtistSlide';

import trendsTheme from './TrendsTheme';

type TrendSlide = 'youtube' | 'spotify' | 'artists';

export interface TrendsYoutubeSong {
  rank: number;
  title: string;
  artist: string;
  movement: number;
}

export interface TrendsArtistTrend {
  rank: number;
  artist: string;
  songs: number;
  movement: number;
}

interface TrendsGUIProps {
  youtubeSongs: TrendsYoutubeSong[];
  spotifySongs: TrendsYoutubeSong[];
  artistTrends: TrendsArtistTrend[];
}

export default function TrendsGUI({
  youtubeSongs,
  spotifySongs,
  artistTrends,
}: TrendsGUIProps) {
  // SLIDE ILIYO ACTIVE
const [activeSlide, setActiveSlide] =
  useState<TrendSlide>('youtube');

const carouselRef = useRef<HTMLDivElement>(null);

const slides: TrendSlide[] = [
  'youtube',
  'spotify',
  'artists',
];
const labels = {
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

    if (slide && slide !== activeSlide) {
      setActiveSlide(slide);
    }
  };

  return (
    <section
      data-bora-ui="public-trending"
      className="w-full"
      style={{
        backgroundColor: trendsTheme.background,
        color: trendsTheme.text,
      }}
    >
      {/* NAVIGATION YA TRENDS — TikTok-style in-screen tabs, juu ya content */}
      <div
        data-bora-ui="public-trending-nav"
        className="mx-auto w-full max-w-3xl overflow-x-auto scrollbar-hide"
        style={{ backgroundColor: trendsTheme.background }}
      >
        <div className="flex w-max min-w-full items-center justify-center gap-8 px-4 py-2">
          {slides.map((slide) => {
            const active = activeSlide === slide;
            return (
              <button
                key={slide}
                data-bora-ui="public-trending-nav-item"
                type="button"
                onClick={() => goToSlide(slide)}
                className="relative flex min-h-[36px] shrink-0 items-center whitespace-nowrap px-1 text-[9px] font-black uppercase tracking-[0.18em] transition-colors duration-200"
                style={{ color: active ? trendsTheme.gold : trendsTheme.textSubtle }}
                onMouseEnter={(event) => {
                  if (activeSlide !== slide) {
                    event.currentTarget.style.color = trendsTheme.textMuted;
                  }
                }}
                onMouseLeave={(event) => {
                  if (activeSlide !== slide) {
                    event.currentTarget.style.color = trendsTheme.textSubtle;
                  }
                }}
              >
                {labels[slide]}
                <span
                  className="absolute inset-x-0 bottom-0 h-[2px] transition-opacity duration-200"
                  style={{ backgroundColor: trendsTheme.gold, opacity: active ? 1 : 0 }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* CAROUSEL YA TRENDS */}
      <div
        data-bora-ui="public-trending-carousel"
        ref={carouselRef}
        onScroll={handleScroll}
        className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
        style={{
          backgroundColor: trendsTheme.background,
          color: trendsTheme.text,
        }}
      >
        <div
          data-bora-ui="public-trending-slide"
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: trendsTheme.background,
            color: trendsTheme.text,
          }}
        >
          <YouTubeSlide songs={youtubeSongs} />
        </div>

        <div
          data-bora-ui="public-trending-slide"
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: trendsTheme.background,
            color: trendsTheme.text,
          }}
        >
          <SpotifySlide songs={spotifySongs} />
        </div>

        <div
          data-bora-ui="public-trending-slide"
          className="w-full shrink-0 snap-center"
          style={{
            backgroundColor: trendsTheme.background,
            color: trendsTheme.text,
          }}
        >
          <ArtistSlide artists={artistTrends} />
        </div>
      </div>
    </section>
  );
}