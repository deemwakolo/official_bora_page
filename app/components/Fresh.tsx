'use client';

import React from 'react';

export default function Fresh() {
  const newSongs = [
    { artist: "Zuchu", title: "Naringa", status: "NEW ENTRY", cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&q=80" },
    { artist: "Marioo", title: "Tomorrow", status: "TRENDING", cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=400&q=80" },
    { artist: "Harmonize", title: "Single Again", status: "NEW ENTRY", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80" },
    { artist: "Jay Melody", title: "Diamond", status: "NEW ENTRY", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80" },
    { artist: "Dulla Makabila", title: "Pitipiti", status: "HOT", cover: "https://images.unsplash.com/photo-1514525253361-bee8718a74a2?w=400&q=80" },
    { artist: "Nandy", title: "Falling", status: "NEW ENTRY", cover: "https://images.unsplash.com/photo-1459749411177-042180ce6742?w=400&q=80" },
    { artist: "Rayvanny", title: "Habibi", status: "NEW ENTRY", cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&q=80" },
    { artist: "Phina", title: "Smile", status: "BREAKOUT", cover: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=80" },
    { artist: "Ali Kiba", title: "Mahaba", status: "NEW ENTRY", cover: "https://images.unsplash.com/photo-1420133965216-754d1f86276d?w=400&q=80" },
    { artist: "Young Lunya", title: "Staki", status: "NEW ENTRY", cover: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80" },
  ];

  return (
    <section className="w-full py-12 bg-[#050505] overflow-hidden border-t border-white/5 relative">

      {/* 🌌 SOFT SYSTEM BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-[#050505] to-black" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] bg-[#D4AF37]/10 blur-[120px]" />
      </div>

      {/* HEADER */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 mb-6 flex items-end justify-between">

        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 bg-[#b91c1c] animate-pulse" />
            <span className="text-[9px] font-mono tracking-[0.4em] text-[#D4AF37] uppercase">
              Global Discovery
            </span>
          </div>

          <h2 className="text-3xl md:text-5xl font-black text-white font-cinzel uppercase leading-none">
            FRESH<span className="text-white/20">PRESS</span>
          </h2>
        </div>

        <div className="hidden md:block text-right">
          <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.3em]">
            Authorized Feed // 2026
          </p>
        </div>

      </div>

      {/* MARQUEE */}
      <div className="relative z-10">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#050505] to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#050505] to-transparent z-10" />

        <div className="flex whitespace-nowrap animate-gallery-roll-slow hover:[animation-play-state:paused]">

          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-5 px-3">

              {newSongs.map((song, index) => {
                const globalIndex = setIndex * newSongs.length + index + 1;

                return (
                  <div
                    key={globalIndex}
                    className="relative w-48 md:w-56 flex-shrink-0 group"
                  >

                    {/* CARD */}
                    <div className="relative aspect-square overflow-hidden rounded-sm border border-white/10 bg-black/40 transition-all duration-500 group-hover:border-[#D4AF37]/40 group-hover:scale-[1.02]">

                      {/* image */}
                      <img
                        src={song.cover}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-700"
                      />

                      {/* overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                      {/* status badge */}
                      <div className="absolute top-2 left-2">
                        <span className="bg-[#b91c1c]/90 backdrop-blur text-white text-[7px] font-black tracking-widest px-2 py-1 uppercase">
                          {song.status}
                        </span>
                      </div>

                    </div>

                    {/* META */}
                    <div className="mt-2 px-1">

                      <h3 className="text-sm font-bold text-white uppercase font-cinzel group-hover:text-[#D4AF37] transition truncate">
                        {song.title}
                      </h3>

                      <div className="flex justify-between items-center mt-1">

                        <p className="text-[9px] text-white/40 uppercase tracking-[0.15em] truncate">
                          {song.artist}
                        </p>

                        <span className="text-[8px] font-mono text-white/20">
                          {String(globalIndex).padStart(2, '0')}
                        </span>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>
          ))}

        </div>
      </div>

      {/* ANIMATION */}
      <style jsx global>{`
        @keyframes gallery-roll-slow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-gallery-roll-slow {
          width: fit-content;
          display: flex;
          animation: gallery-roll-slow 120s linear infinite;
        }

        @media (max-width: 768px) {
          .animate-gallery-roll-slow {
            animation-duration: 65s;
          }
        }
      `}</style>

    </section>
  );
}