'use client';

import React from 'react';

import { ArrowUp, ArrowDown, Minus, Music2 } from 'lucide-react';

import trendsTheme from '../TrendsTheme';

interface SpotifySong {
  rank: number;
  title: string;
  artist: string;
  movement: number;
}

export default function SpotifySlide() {
  // DATA YA MFANO YA SPOTIFY TOP 10
  const songs: SpotifySong[] = [
    { rank: 1, title: 'SIGNAL', artist: 'BORA ARTIST', movement: 3 },
    { rank: 2, title: 'NIGHT DRIVE', artist: 'BORA ARTIST', movement: 1 },
    { rank: 3, title: 'MOTO', artist: 'BORA ARTIST', movement: -2 },
    { rank: 4, title: 'MALAIKA', artist: 'BORA ARTIST', movement: 4 },
    { rank: 5, title: 'CITY LIGHTS', artist: 'BORA ARTIST', movement: 0 },
    { rank: 6, title: 'KESHO', artist: 'BORA ARTIST', movement: -1 },
    { rank: 7, title: 'NANI', artist: 'BORA ARTIST', movement: 2 },
    { rank: 8, title: 'MASHUP', artist: 'BORA ARTIST', movement: 0 },
    { rank: 9, title: 'KIVULI', artist: 'BORA ARTIST', movement: -3 },
    { rank: 10, title: 'MWANGA', artist: 'BORA ARTIST', movement: 1 },
  ];

  return (
    <div
      className="relative w-full overflow-hidden px-4 py-10"
      style={{
        backgroundColor: trendsTheme.background,
        color: trendsTheme.text,
      }}
    >
      {/* GLOW YA SPOTIFY */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[260px] w-[500px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.035)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-3xl">

        {/* HEADER */}
        <div
          className="mb-7 flex items-end justify-between border-b pb-4"
          style={{
            borderColor: trendsTheme.borderStrong,
          }}
        >
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Music2
                size={14}
                style={{
                  color: trendsTheme.green,
                }}
              />

              <span
                className="text-[8px] font-black uppercase tracking-[0.3em]"
                style={{
                  color: trendsTheme.green,
                }}
              >
                SPOTIFY
              </span>
            </div>

            <h2
              className="font-cinzel text-2xl font-black uppercase tracking-tight md:text-3xl"
              style={{
                color: trendsTheme.text,
              }}
            >
              TOP 10
            </h2>
          </div>

          <span
            className="font-mono text-[8px] uppercase tracking-[0.15em]"
            style={{
              color: trendsTheme.signal,
            }}
          >
            PLATFORM SIGNAL
          </span>
        </div>

        {/* SONG LIST */}
        <div>
          {songs.map((song) => (
            <div
              key={song.rank}
              className="flex items-center gap-3 border-b py-3.5"
              style={{
                borderColor: trendsTheme.border,
              }}
            >
              {/* RANK */}
              <div
                className="w-7 shrink-0 text-right font-cinzel text-sm font-black"
                style={{
                  color: trendsTheme.rank,
                }}
              >
                {String(song.rank).padStart(2, '0')}
              </div>

              {/* MOVEMENT */}
              <div className="flex w-7 shrink-0 justify-center">
                {song.movement > 0 ? (
                  <ArrowUp
                    size={11}
                    style={{
                      color: trendsTheme.gold,
                    }}
                  />
                ) : song.movement < 0 ? (
                  <ArrowDown
                    size={11}
                    style={{
                      color: trendsTheme.red,
                    }}
                  />
                ) : (
                  <Minus
                    size={10}
                    style={{
                      color: trendsTheme.textSubtle,
                    }}
                  />
                )}
              </div>

              {/* SONG */}
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[10px] font-black uppercase tracking-[0.08em]"
                  style={{
                    color: trendsTheme.text,
                  }}
                >
                  {song.title}
                </p>

                <p
                  className="mt-1 truncate text-[8px] font-bold uppercase tracking-[0.15em]"
                  style={{
                    color: trendsTheme.artist,
                  }}
                >
                  {song.artist}
                </p>
              </div>

              {/* MOVEMENT NUMBER */}
              <div
                className="w-8 shrink-0 text-right font-mono text-[8px]"
                style={{
                  color: trendsTheme.movement,
                }}
              >
                {song.movement > 0
                  ? `+${song.movement}`
                  : song.movement < 0
                    ? song.movement
                    : '—'}
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div
          className="mt-5 border-t pt-3"
          style={{
            borderColor: trendsTheme.border,
          }}
        >
          <p
            className="text-center font-mono text-[7px] uppercase tracking-[0.22em]"
            style={{
              color: trendsTheme.footer,
            }}
          >
            SPOTIFY PERFORMANCE • BORA TREND SIGNAL
          </p>
        </div>
      </div>
    </div>
  );
}