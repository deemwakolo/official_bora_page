'use client';

import React from 'react';

import {
  CalendarDays,
  MapPin,
  Ticket,
} from 'lucide-react';

import discoverTheme from '../DiscoverTheme';

export default function UpcomingShowsSlide() {
  // ORODHA YA SHOWS ZINAZOKUJA
  const shows = [
    {
      date: '12 SEP',
      artist: 'Marioo',
      event: 'LIVE IN DAR',
      venue: 'Mlimani City',
      location: 'Dar es Salaam',
      status: 'UPCOMING',
    },
    {
      date: '19 SEP',
      artist: 'Zuchu',
      event: 'THE ZUCHU EXPERIENCE',
      venue: 'Warehouse Arena',
      location: 'Dar es Salaam',
      status: 'UPCOMING',
    },
    {
      date: '26 SEP',
      artist: 'Harmonize',
      event: 'KONDE GANG LIVE',
      venue: 'Posta Grounds',
      location: 'Dar es Salaam',
      status: 'UPCOMING',
    },
    {
      date: '03 OCT',
      artist: 'Phina',
      event: 'AFRO VIBES NIGHT',
      venue: 'Elements',
      location: 'Dar es Salaam',
      status: 'UPCOMING',
    },
    {
      date: '10 OCT',
      artist: 'Jay Melody',
      event: 'LIVE SESSION',
      venue: 'Mlimani City',
      location: 'Dar es Salaam',
      status: 'UPCOMING',
    },
  ];

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
          className="absolute right-1/4 top-0 h-[220px] w-[500px] blur-[120px]"
          style={{
            backgroundColor: discoverTheme.redGlow,
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
            Live Calendar
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
              UPCOMING{' '}
              <span
                style={{
                  color: discoverTheme.textSubtle,
                }}
              >
                SHOWS
              </span>
            </h2>

            <p
              className="mt-3 font-mono text-[9px] uppercase tracking-[0.25em]"
              style={{
                color: discoverTheme.metadata,
              }}
            >
              Shows and live events worth watching
            </p>
          </div>

          <CalendarDays
            size={24}
            className="hidden md:block"
            style={{
              color: discoverTheme.gold,
              opacity: 0.4,
            }}
          />
        </div>
      </div>

      {/* SHOW LIST */}
      <div className="relative z-10 mx-auto max-w-5xl px-6">
        <div
          style={{
            borderTop: `1px solid ${discoverTheme.borderStrong}`,
          }}
        >
          {shows.map((show, index) => (
            <div
              key={`${show.artist}-${show.event}`}
              className="group flex items-center border-b transition"
              style={{
                gap: discoverTheme.list.rowGap,
                paddingTop: discoverTheme.list.rowPaddingY,
                paddingBottom: discoverTheme.list.rowPaddingY,
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
              {/* DATE */}
              <div
                className="w-14 shrink-0 border-r pr-4 text-center md:w-16"
                style={{
                  borderColor: discoverTheme.borderStrong,
                }}
              >
                <p
                  className="font-mono font-black tracking-wider"
                  style={{
                    fontSize:
                      discoverTheme.list.metadataSize,
                    color: discoverTheme.gold,
                  }}
                >
                  {show.date}
                </p>

                <p
                  className="mt-1 font-mono"
                  style={{
                    fontSize:
                      discoverTheme.list.metadataSize,
                    color: discoverTheme.textSubtle,
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </p>
              </div>

              {/* EVENT INFO */}
              <div className="min-w-0 flex-1">
                <h3
                  className="truncate font-cinzel uppercase transition"
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
                  {show.event}
                </h3>

                <p
                  className="mt-1 font-mono uppercase"
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
                  {show.artist}
                </p>

                <div
                  className="mt-2 flex items-center"
                  style={{
                    gap: discoverTheme.list.rowGap,
                  }}
                >
                  <span
                    className="flex items-center gap-1 font-mono uppercase"
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
                    <MapPin size={9} />
                    {show.venue}
                  </span>

                  <span
                    className="hidden font-mono uppercase sm:block"
                    style={{
                      fontSize:
                        discoverTheme.list.metadataSize,
                      fontWeight:
                        discoverTheme.list.metadataWeight,
                      letterSpacing:
                        discoverTheme.list.metadataTracking,
                      color: discoverTheme.textSubtle,
                    }}
                  >
                    {show.location}
                  </span>
                </div>
              </div>

              {/* STATUS */}
              <div className="hidden items-center sm:flex">
                <span
                  className="mr-2 h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{
                    backgroundColor: discoverTheme.red,
                  }}
                />

                <span
                  className="font-black tracking-widest"
                  style={{
                    fontSize:
                      discoverTheme.list.metadataSize,
                    fontWeight:
                      discoverTheme.list.movementWeight,
                    letterSpacing:
                      discoverTheme.list.movementTracking,
                    color: discoverTheme.metadata,
                  }}
                >
                  {show.status}
                </span>
              </div>

              {/* TICKET */}
              <button
                type="button"
                className="flex shrink-0 items-center border px-3 py-2 font-black uppercase transition"
                style={{
                  gap: '0.5rem',
                  fontSize:
                    discoverTheme.list.metadataSize,
                  fontWeight:
                    discoverTheme.list.metadataWeight,
                  letterSpacing:
                    discoverTheme.list.metadataTracking,
                  borderColor: discoverTheme.borderStrong,
                  color: discoverTheme.metadata,
                  backgroundColor: 'transparent',
                  transitionDuration:
                    discoverTheme.list.transition,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.borderColor =
                    discoverTheme.gold;

                  event.currentTarget.style.color =
                    discoverTheme.gold;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.borderColor =
                    discoverTheme.borderStrong;

                  event.currentTarget.style.color =
                    discoverTheme.metadata;
                }}
              >
                <Ticket size={11} />

                <span className="hidden md:inline">
                  DETAILS
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}