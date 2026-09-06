'use client';

import React from 'react';

import {
  Music2,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

import discoverTheme from '../DiscoverTheme';

export default function NewSongsSlide() {
  // ORODHA YA NYIMBO MPYA
  const songs = [
    {
      title: 'Naringa',
      artist: 'Zuchu',
      status: 'NEW ENTRY',
      movement: 4,
    },
    {
      title: 'Tomorrow',
      artist: 'Marioo',
      status: 'TRENDING',
      movement: 2,
    },
    {
      title: 'Single Again',
      artist: 'Harmonize',
      status: 'NEW ENTRY',
      movement: 3,
    },
    {
      title: 'Diamond',
      artist: 'Jay Melody',
      status: 'NEW ENTRY',
      movement: 1,
    },
    {
      title: 'Pitipiti',
      artist: 'Dulla Makabila',
      status: 'HOT',
      movement: 5,
    },
    {
      title: 'Falling',
      artist: 'Nandy',
      status: 'NEW ENTRY',
      movement: 0,
    },
    {
      title: 'Habibi',
      artist: 'Rayvanny',
      status: 'NEW ENTRY',
      movement: 2,
    },
    {
      title: 'Smile',
      artist: 'Phina',
      status: 'BREAKOUT',
      movement: 6,
    },
  ];

  // ICON YA MWELEKEO WA NYIMBO
  const MovementIcon = ({
    movement,
  }: {
    movement: number;
  }) => {
    if (movement > 0) {
      return <ArrowUp size={11} />;
    }

    if (movement < 0) {
      return <ArrowDown size={11} />;
    }

    return <Minus size={11} />;
  };

  return (
    <section
      className="relative w-full overflow-hidden py-10 md:py-14"
      style={{
        backgroundColor: discoverTheme.background,
        color: discoverTheme.text,
      }}
    >
      {/* BACKGROUND YA DISCOVER */}

      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(
              to bottom,
              ${discoverTheme.backgroundDeep},
              ${discoverTheme.background},
              ${discoverTheme.backgroundDeep}
            )`,
          }}
        />

        <div
          className="absolute left-1/2 top-0 h-[220px] w-[500px] -translate-x-1/2 blur-[120px]"
          style={{
            backgroundColor: discoverTheme.goldGlow,
          }}
        />
      </div>

      {/* HEADER */}

      <div className="relative z-10 mx-auto mb-8 max-w-5xl px-6">
        <div className="mb-2 flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 animate-pulse"
            style={{
              backgroundColor: discoverTheme.red,
            }}
          />

          <span
            className="font-mono text-[9px] uppercase tracking-[0.4em]"
            style={{
              color: discoverTheme.gold,
            }}
          >
            Fresh Feed
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h2
              className="font-cinzel text-3xl font-black uppercase leading-none md:text-5xl"
              style={{
                color: discoverTheme.text,
              }}
            >
              NEW{' '}
              <span
                style={{
                  color: discoverTheme.textSubtle,
                }}
              >
                SONGS
              </span>
            </h2>

            <p
              className="mt-3 font-mono text-[9px] uppercase tracking-[0.25em]"
              style={{
                color: discoverTheme.metadata,
              }}
            >
              Fresh music entering the BORA ecosystem
            </p>
          </div>

          <Music2
            size={24}
            className="hidden md:block"
            style={{
              color: discoverTheme.gold,
              opacity: 0.4,
            }}
          />
        </div>
      </div>

      {/* SONG LIST */}

      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <div
          style={{
            borderTop: `1px solid ${discoverTheme.borderStrong}`,
          }}
        >
          {songs.map((song, index) => (
            <div
              key={`${song.artist}-${song.title}`}
              className="group flex items-center border-b transition md:gap-6"
              style={{
                gap: discoverTheme.list.rowGap,
                paddingTop: discoverTheme.list.rowPaddingY,
                paddingBottom:
                  discoverTheme.list.rowPaddingY,
                borderColor: discoverTheme.list.divider,
                backgroundColor:
                  discoverTheme.list.rowBackground,
                transitionDuration:
                  discoverTheme.list.transition,
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor =
                  discoverTheme.list.rowHoverBackground;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor =
                  discoverTheme.list.rowBackground;
              }}
            >
              {/* NUMBER */}

              <div
                className="shrink-0 font-mono"
                style={{
                  width: discoverTheme.list.rankWidth,
                  fontSize: discoverTheme.list.rankSize,
                  fontWeight:
                    discoverTheme.list.rankWeight,
                  color: discoverTheme.rank,
                }}
              >
                {String(index + 1).padStart(2, '0')}
              </div>

              {/* MUSIC ICON */}

              <div
                className="flex shrink-0 items-center justify-center rounded-sm border md:h-14 md:w-14"
                style={{
                  width: '2.75rem',
                  height: '2.75rem',
                  borderColor: discoverTheme.borderStrong,
                  backgroundColor:
                    discoverTheme.surfaceElevated,
                }}
              >
                <Music2
                  size={18}
                  style={{
                    color: discoverTheme.textSubtle,
                  }}
                />
              </div>

              {/* SONG INFO */}

              <div className="min-w-0 flex-1">
                <h3
                  className="truncate font-cinzel uppercase transition"
                  style={{
                    fontSize: discoverTheme.list.titleSize,
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
                  {song.title}
                </h3>

                <div
                  className="mt-1 flex items-center"
                  style={{
                    gap: discoverTheme.list.rowGap,
                  }}
                >
                  <span
                    className="truncate font-mono uppercase"
                    style={{
                      fontSize:
                        discoverTheme.list.artistSize,
                      fontWeight:
                        discoverTheme.list.artistWeight,
                      letterSpacing:
                        discoverTheme.list.artistTracking,
                      color: discoverTheme.artist,
                    }}
                  >
                    {song.artist}
                  </span>

                  <span
                    className="shrink-0"
                    style={{
                      fontSize:
                        discoverTheme.list.metadataSize,
                      fontWeight:
                        discoverTheme.list.movementWeight,
                      letterSpacing:
                        discoverTheme.list.movementTracking,
                      color: discoverTheme.red,
                    }}
                  >
                    {song.status}
                  </span>
                </div>
              </div>

              {/* MOVEMENT */}

              <div
                className="flex min-w-[32px] shrink-0 items-center justify-end gap-1 font-mono"
                style={{
                  color: discoverTheme.gold,
                  fontSize:
                    discoverTheme.list.movementSize,
                  fontWeight:
                    discoverTheme.list.movementWeight,
                  letterSpacing:
                    discoverTheme.list.movementTracking,
                }}
              >
                <MovementIcon
                  movement={song.movement}
                />

                <span>
                  {Math.abs(song.movement)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}