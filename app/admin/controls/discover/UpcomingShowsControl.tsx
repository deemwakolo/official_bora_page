'use client';

import React, { useState } from 'react';

interface Show {
  id: number;
  title: string;
  artist: string;
  date: string;
  time: string;
  location: string;
}

export default function UpcomingShowsControl() {
  const [shows, setShows] = useState<Show[]>([
    {
      id: 1,
      title: 'UPCOMING SHOW 01',
      artist: 'ARTIST NAME',
      date: '2026-09-15',
      time: '20:00',
      location: 'LOCATION',
    },
  ]);

  const addShow = () => {
    setShows((current) => [
      ...current,
      {
        id: Date.now(),
        title: `UPCOMING SHOW ${String(
          current.length + 1
        ).padStart(2, '0')}`,
        artist: 'ARTIST NAME',
        date: '',
        time: '',
        location: '',
      },
    ]);
  };

  const removeShow = (id: number) => {
    setShows((current) =>
      current.filter((show) => show.id !== id)
    );
  };

  return (
    <div className="w-full">
      {/* UPCOMING SHOWS */}

      <div
        className="w-full border"
        style={{
          borderColor: 'var(--bora-border)',
        }}
      >
        {shows.map((show, index) => (
          <div
            key={show.id}
            className="border-b p-4 last:border-b-0 sm:p-5"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor:
                'var(--bora-surface)',
            }}
          >
            {/* SHOW HEADER */}

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="font-cinzel text-sm font-black"
                  style={{
                    color: 'var(--bora-gold)',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span
                  className="text-[13px]"
                  style={{
                    color: 'var(--bora-gold)',
                  }}
                >
                  ◷
                </span>

                <span
                  className="text-[8px] font-black uppercase tracking-[0.14em]"
                  style={{
                    color: 'var(--bora-text)',
                  }}
                >
                  Upcoming Show
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  removeShow(show.id)
                }
                className="text-[7px] font-black uppercase tracking-[0.12em]"
                style={{
                  color: 'var(--bora-red)',
                }}
              >
                Remove
              </button>
            </div>

            {/* TITLE */}

            <div className="mb-3">
              <label
                className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                style={{
                  color: 'var(--bora-text-muted)',
                }}
              >
                Show Title
              </label>

              <input
                type="text"
                value={show.title}
                onChange={(event) => {
                  setShows((current) =>
                    current.map((item) =>
                      item.id === show.id
                        ? {
                            ...item,
                            title:
                              event.target.value,
                          }
                        : item
                    )
                  );
                }}
                className="w-full border px-3 py-3 text-xs outline-none"
                style={{
                  borderColor:
                    'var(--bora-border)',
                  backgroundColor:
                    'var(--bora-background)',
                  color: 'var(--bora-text)',
                }}
              />
            </div>

            {/* ARTIST */}

            <div className="mb-3">
              <label
                className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                style={{
                  color: 'var(--bora-text-muted)',
                }}
              >
                Artist
              </label>

              <input
                type="text"
                value={show.artist}
                onChange={(event) => {
                  setShows((current) =>
                    current.map((item) =>
                      item.id === show.id
                        ? {
                            ...item,
                            artist:
                              event.target.value,
                          }
                        : item
                    )
                  );
                }}
                className="w-full border px-3 py-3 text-xs outline-none"
                style={{
                  borderColor:
                    'var(--bora-border)',
                  backgroundColor:
                    'var(--bora-background)',
                  color: 'var(--bora-text)',
                }}
              />
            </div>

            {/* DATE + TIME */}

            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <label
                  className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                  style={{
                    color:
                      'var(--bora-text-muted)',
                  }}
                >
                  Date
                </label>

                <input
                  type="date"
                  value={show.date}
                  onChange={(event) => {
                    setShows((current) =>
                      current.map((item) =>
                        item.id === show.id
                          ? {
                              ...item,
                              date: event.target.value,
                            }
                          : item
                      )
                    );
                  }}
                  className="w-full border px-3 py-3 text-xs outline-none"
                  style={{
                    borderColor:
                      'var(--bora-border)',
                    backgroundColor:
                      'var(--bora-background)',
                    color:
                      'var(--bora-text)',
                  }}
                />
              </div>

              <div>
                <label
                  className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                  style={{
                    color:
                      'var(--bora-text-muted)',
                  }}
                >
                  Time
                </label>

                <input
                  type="time"
                  value={show.time}
                  onChange={(event) => {
                    setShows((current) =>
                      current.map((item) =>
                        item.id === show.id
                          ? {
                              ...item,
                              time: event.target.value,
                            }
                          : item
                      )
                    );
                  }}
                  className="w-full border px-3 py-3 text-xs outline-none"
                  style={{
                    borderColor:
                      'var(--bora-border)',
                    backgroundColor:
                      'var(--bora-background)',
                    color:
                      'var(--bora-text)',
                  }}
                />
              </div>
            </div>

            {/* LOCATION */}

            <div>
              <label
                className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                style={{
                  color: 'var(--bora-text-muted)',
                }}
              >
                Location
              </label>

              <input
                type="text"
                value={show.location}
                onChange={(event) => {
                  setShows((current) =>
                    current.map((item) =>
                      item.id === show.id
                        ? {
                            ...item,
                            location:
                              event.target.value,
                          }
                        : item
                    )
                  );
                }}
                placeholder="Venue / City"
                className="w-full border px-3 py-3 text-xs outline-none"
                style={{
                  borderColor:
                    'var(--bora-border)',
                  backgroundColor:
                    'var(--bora-background)',
                  color: 'var(--bora-text)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ADD SHOW */}

      <button
        type="button"
        onClick={addShow}
        className="mt-3 flex w-full items-center justify-center gap-3 border px-4 py-4 transition-all duration-200"
        style={{
          borderColor: 'var(--bora-gold)',
          backgroundColor:
            'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))',
          color: 'var(--bora-gold)',
        }}
      >
        <span className="text-base leading-none">
          +
        </span>

        <span className="text-[8px] font-black uppercase tracking-[0.18em]">
          Add Show
        </span>
      </button>
    </div>
  );
}