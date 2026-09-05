'use client';

import React from 'react';
import {
  Music2,
  Play,
  ListMusic,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

interface Playlist {
  id: number;
  name: string;
  description: string;
  songs: number;
  movement: 'up' | 'down' | 'same';
  change: number;
}

const playlists: Playlist[] = [
  {
    id: 1,
    name: 'BORA HOT 10',
    description: 'The songs ruling BORA right now',
    songs: 10,
    movement: 'up',
    change: 2,
  },
  {
    id: 2,
    name: 'NEW IN TZ',
    description: 'Fresh releases from Tanzania',
    songs: 20,
    movement: 'up',
    change: 4,
  },
  {
    id: 3,
    name: 'BONGO VIBES',
    description: 'The sound of modern Bongo Flava',
    songs: 25,
    movement: 'same',
    change: 0,
  },
  {
    id: 4,
    name: 'WEEKEND VIBES',
    description: 'Your weekend soundtrack',
    songs: 30,
    movement: 'up',
    change: 3,
  },
  {
    id: 5,
    name: 'UNDERGROUND TZ',
    description: 'Artists breaking through the noise',
    songs: 20,
    movement: 'down',
    change: 1,
  },
];

export default function PlaylistsSlide() {
  const getMovementIcon = (
    movement: Playlist['movement']
  ) => {
    if (movement === 'up') {
      return <ArrowUp size={12} />;
    }

    if (movement === 'down') {
      return <ArrowDown size={12} />;
    }

    return <Minus size={12} />;
  };

  return (
    <section className="w-full px-4 py-8 md:px-8 md:py-12">
      {/* KICHWA CHA PLAYLISTS */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-[#D4AF37]">
            DISCOVER
          </p>

          <h2 className="text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
            PLAYLISTS
          </h2>

          <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/35">
            CURATED BY BORA
          </p>
        </div>

        <ListMusic
          size={28}
          className="text-[#D4AF37]/60"
        />
      </div>

      {/* PLAYLIST LIST */}
      <div className="space-y-3">
        {playlists.map((playlist, index) => (
          <div
            key={playlist.id}
            className="group flex items-center gap-4 border border-white/[0.06] bg-white/[0.02] px-4 py-4 transition-all duration-300 hover:border-[#D4AF37]/30 hover:bg-white/[0.04]"
          >
            {/* NUMBER */}
            <div className="w-6 text-center font-mono text-[10px] text-white/25">
              {String(index + 1).padStart(2, '0')}
            </div>

            {/* PLAY ICON */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#D4AF37]/20 bg-[#D4AF37]/5 text-[#D4AF37]">
              <Play size={15} fill="currentColor" />
            </div>

            {/* PLAYLIST INFO */}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-black uppercase tracking-wide text-white">
                {playlist.name}
              </h3>

              <p className="mt-1 truncate text-[9px] uppercase tracking-wider text-white/35">
                {playlist.description}
              </p>

              <div className="mt-2 flex items-center gap-2">
                <Music2
                  size={10}
                  className="text-white/25"
                />

                <span className="text-[8px] font-mono uppercase tracking-widest text-white/30">
                  {playlist.songs} SONGS
                </span>
              </div>
            </div>

            {/* MOVEMENT */}
            <div
              className={`flex items-center gap-1 font-mono text-[9px] ${
                playlist.movement === 'up'
                  ? 'text-green-500'
                  : playlist.movement === 'down'
                  ? 'text-red-500'
                  : 'text-white/25'
              }`}
            >
              {getMovementIcon(playlist.movement)}

              {playlist.change > 0 && (
                <span>{playlist.change}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER SIGNAL */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <div className="h-px w-8 bg-[#D4AF37]/30" />

        <span className="text-[8px] font-black uppercase tracking-[0.25em] text-white/25">
          BORA CURATED
        </span>

        <div className="h-px w-8 bg-[#D4AF37]/30" />
      </div>
    </section>
  );
}