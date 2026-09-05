'use client';

import React from 'react';
import { CalendarDays, MapPin, Ticket } from 'lucide-react';

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
    <section className="w-full py-10 md:py-14 bg-[#050505] overflow-hidden relative">
      {/* BACKGROUND YA DISCOVER */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050505] to-black" />

        <div className="absolute top-0 right-1/4 w-[500px] h-[220px] bg-[#b91c1c]/10 blur-[120px]" />
      </div>

      {/* HEADER */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 bg-[#b91c1c] animate-pulse" />

          <span className="text-[9px] font-mono tracking-[0.4em] text-[#D4AF37] uppercase">
            Live Calendar
          </span>
        </div>

        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-white font-cinzel uppercase leading-none">
              UPCOMING <span className="text-white/20">SHOWS</span>
            </h2>

            <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.25em] mt-3">
              Shows and live events worth watching
            </p>
          </div>

          <CalendarDays
            size={24}
            className="text-[#D4AF37]/40 hidden md:block"
          />
        </div>
      </div>

      {/* SHOW LIST */}
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="border-t border-white/[0.08]">
          {shows.map((show, index) => (
            <div
              key={`${show.artist}-${show.event}`}
              className="group flex items-center gap-4 md:gap-6 py-4 border-b border-white/[0.06] hover:bg-white/[0.02] transition"
            >
              {/* DATE */}
              <div className="w-14 md:w-16 shrink-0 text-center border-r border-white/[0.08] pr-4">
                <p className="text-[10px] font-black text-[#D4AF37] font-mono tracking-wider">
                  {show.date}
                </p>

                <p className="text-[7px] text-white/20 font-mono mt-1">
                  {String(index + 1).padStart(2, '0')}
                </p>
              </div>

              {/* EVENT INFO */}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm md:text-base font-bold text-white uppercase font-cinzel truncate group-hover:text-[#D4AF37] transition">
                  {show.event}
                </h3>

                <p className="text-[9px] font-mono text-white/40 uppercase tracking-[0.15em] mt-1">
                  {show.artist}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-[7px] font-mono text-white/25 uppercase">
                    <MapPin size={9} />
                    {show.venue}
                  </span>

                  <span className="hidden sm:block text-[7px] font-mono text-white/20 uppercase">
                    {show.location}
                  </span>
                </div>
              </div>

              {/* STATUS */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c] animate-pulse" />

                <span className="text-[7px] font-black tracking-widest text-white/30">
                  {show.status}
                </span>
              </div>

              {/* TICKET */}
              <button
                type="button"
                className="shrink-0 flex items-center gap-2 border border-white/10 px-3 py-2 text-[7px] font-black tracking-widest text-white/40 uppercase hover:border-[#D4AF37]/40 hover:text-[#D4AF37] transition"
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