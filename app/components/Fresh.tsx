'use client';

import React from 'react';

/**
 * FRESH.TSX - "PRESTIGE GALLERY" COMPACT EDITION
 * Reduced card sizing and speed for a smoother, more refined discovery experience.
 * Tightened the vertical gap between heading and the gallery stream.
 */
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
    <section className="w-full py-10 bg-[#050505] overflow-hidden border-t border-white/5">
      
      {/* SECTION HEADER - Tightened MB from 12 to 6 */}
      <div className="max-w-7xl mx-auto px-6 mb-6 flex items-end justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 bg-[#b91c1c] animate-pulse" />
            <span className="text-[9px] font-mono tracking-[0.4em] text-[#D4AF37] uppercase">
              Global Discovery
            </span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white font-cinzel tracking-tighter uppercase leading-none">
            FRESH<span className="text-white/20">PRESS</span>
          </h2>
        </div>
        <div className="text-right hidden md:block">
           <p className="text-[9px] font-mono text-white/30 uppercase tracking-[0.3em]">
             Authorized Feed // 2026
           </p>
        </div>
      </div>

      {/* CARD GALLERY MARQUEE */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#050505] to-transparent" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#050505] to-transparent" />

        {/* Speed reduced: animation duration increased from 80s to 120s */}
        <div className="flex whitespace-nowrap animate-gallery-roll-slow hover:[animation-play-state:paused] py-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-2">
              {newSongs.map((song, index) => (
                <div 
                  key={index} 
                  className="relative flex-shrink-0 w-48 md:w-56 group cursor-pointer"
                >
                  {/* COVER ART CONTAINER - Reduced size */}
                  <div className="relative aspect-square overflow-hidden border border-white/10 shadow-xl transition-all duration-500 group-hover:border-[#D4AF37]/40 group-hover:scale-[1.01]">
                    <img 
                      src={song.cover} 
                      alt={song.title}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#b91c1c] text-white text-[7px] font-black tracking-widest px-1.5 py-0.5 uppercase">
                        {song.status}
                      </span>
                    </div>
                  </div>

                  {/* TRACK METADATA - Tightened spacing */}
                  <div className="mt-3 px-1">
                    <h3 className="text-sm md:text-base font-bold text-white uppercase font-cinzel tracking-tight group-hover:text-[#D4AF37] transition-colors truncate">
                      {song.title}
                    </h3>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[9px] text-white/40 font-bold uppercase tracking-[0.15em] truncate">
                        {song.artist}
                      </p>
                      <span className="text-[8px] font-mono text-white/10">
                        {index + 1 < 10 ? `0${index + 1}` : index + 1}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes gallery-roll-slow {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-gallery-roll-slow {
          display: flex;
          width: fit-content;
          animation: gallery-roll-slow 120s linear infinite;
        }

        @media (max-width: 768px) {
          .animate-gallery-roll-slow {
            animation-duration: 60s;
          }
        }
      `}</style>

    </section>
  );
}