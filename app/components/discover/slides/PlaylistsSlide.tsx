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

import discoverTheme from '../DiscoverTheme';

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

  const getMovementColor = (
    movement: Playlist['movement']
  ) => {
    if (movement === 'up') {
      return discoverTheme.green;
    }

    if (movement === 'down') {
      return discoverTheme.red;
    }

    return discoverTheme.textSubtle;
  };

  return (
    <section
      className="w-full px-4 py-8 md:px-8 md:py-12"
      style={{
        backgroundColor: discoverTheme.background,
        color: discoverTheme.text,
      }}
    >
      {/* KICHWA CHA PLAYLISTS */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p
            className="mb-2 text-[9px] font-black uppercase tracking-[0.3em]"
            style={{
              color: discoverTheme.gold,
            }}
          >
            DISCOVER
          </p>

          <h2
            className="text-3xl font-black uppercase tracking-tight md:text-4xl"
            style={{
              color: discoverTheme.text,
            }}
          >
            PLAYLISTS
          </h2>

          <p
            className="mt-2 text-[10px] uppercase tracking-[0.18em]"
            style={{
              color: discoverTheme.metadata,
            }}
          >
            CURATED BY BORA
          </p>
        </div>

        <ListMusic
          size={28}
          style={{
            color: discoverTheme.gold,
            opacity: 0.6,
          }}
        />
      </div>

      {/* PLAYLIST LIST */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: discoverTheme.list.rowGap,
        }}
      >
        {playlists.map((playlist, index) => (
          <div
            key={playlist.id}
            className="group flex items-center border transition-all"
            style={{
              gap: discoverTheme.list.rowGap,
              paddingTop: discoverTheme.list.rowPaddingY,
              paddingBottom: discoverTheme.list.rowPaddingY,
              paddingLeft: '1rem',
              paddingRight: '1rem',
              borderColor: discoverTheme.list.border,
              backgroundColor:
                discoverTheme.list.rowBackground,
              transitionDuration:
                discoverTheme.list.transition,
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.borderColor =
                discoverTheme.gold;

              event.currentTarget.style.backgroundColor =
                discoverTheme.list.rowHoverBackground;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.borderColor =
                discoverTheme.list.border;

              event.currentTarget.style.backgroundColor =
                discoverTheme.list.rowBackground;
            }}
          >
            {/* NUMBER */}
            <div
              className="shrink-0 text-center font-mono"
              style={{
                width: discoverTheme.list.rankWidth,
                fontSize: discoverTheme.list.rankSize,
                fontWeight: discoverTheme.list.rankWeight,
                color: discoverTheme.rank,
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </div>

            {/* PLAY ICON */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center border"
              style={{
                borderColor: discoverTheme.goldGlow,
                backgroundColor: discoverTheme.goldGlow,
                color: discoverTheme.gold,
              }}
            >
              <Play
                size={15}
                fill="currentColor"
              />
            </div>

            {/* PLAYLIST INFO */}
            <div className="min-w-0 flex-1">
              <h3
                className="truncate uppercase transition"
                style={{
                  fontSize:
                    discoverTheme.list.titleSize,
                  fontWeight:
                    discoverTheme.list.titleWeight,
                  letterSpacing:
                    discoverTheme.list.titleTracking,
                  lineHeight:
                    discoverTheme.list.titleLineHeight,
                  color: discoverTheme.title,
                  transitionDuration:
                    discoverTheme.list.transition,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color =
                    discoverTheme.gold;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color =
                    discoverTheme.title;
                }}
              >
                {playlist.name}
              </h3>

              <p
                className="mt-1 truncate uppercase"
                style={{
                  fontSize:
                    discoverTheme.list.metadataSize,
                  fontWeight:
                    discoverTheme.list.metadataWeight,
                  letterSpacing:
                    discoverTheme.list.metadataTracking,
                  color: discoverTheme.metadata,
                }}
              >
                {playlist.description}
              </p>

              <div
                className="mt-2 flex items-center"
                style={{
                  gap: '0.5rem',
                }}
              >
                <Music2
                  size={10}
                  style={{
                    color: discoverTheme.textSubtle,
                  }}
                />

                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize:
                      discoverTheme.list.metadataSize,
                    fontWeight:
                      discoverTheme.list.metadataWeight,
                    letterSpacing:
                      discoverTheme.list.metadataTracking,
                    color: discoverTheme.artist,
                  }}
                >
                  {playlist.songs} SONGS
                </span>
              </div>
            </div>

            {/* MOVEMENT */}
            <div
              className="flex shrink-0 items-center font-mono"
              style={{
                gap: '0.25rem',
                fontSize:
                  discoverTheme.list.movementSize,
                fontWeight:
                  discoverTheme.list.movementWeight,
                letterSpacing:
                  discoverTheme.list.movementTracking,
                color: getMovementColor(
                  playlist.movement
                ),
              }}
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
        <div
          className="h-px w-8"
          style={{
            backgroundColor: discoverTheme.gold,
            opacity: 0.3,
          }}
        />

        <span
          className="font-black uppercase"
          style={{
            fontSize:
              discoverTheme.list.metadataSize,
            fontWeight:
              discoverTheme.list.titleWeight,
            letterSpacing: '0.25em',
            color: discoverTheme.footer,
          }}
        >
          BORA CURATED
        </span>

        <div
          className="h-px w-8"
          style={{
            backgroundColor: discoverTheme.gold,
            opacity: 0.3,
          }}
        />
      </div>
    </section>
  );
}