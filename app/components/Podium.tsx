'use client';

import React from 'react';

interface ChartItem {
  song: string;
  artist: string;
  votes: string;
  weeks: number;
  yt: string;
  sp: string;
  bp: string;
  medal?: string;
  accent: string;
  rank: number;
  direction?: 'up' | 'down' | 'flat';
}

export default function Podium({
  onVote
}: {
  onVote: (song: string, type: 'up' | 'down') => void;
}) {

  const baseTop3 = [
    {
      song: "Sielewi",
      artist: "Dee",
      votes: "18.2K",
      weeks: 12,
      yt: "#01",
      sp: "#02",
      bp: "#01",
      medal: "🥇",
      accent: "#D4AF37",
      direction: "up"
    },
    {
      song: "The Rock",
      artist: "Rocky",
      votes: "12.9K",
      weeks: 9,
      yt: "#03",
      sp: "#05",
      bp: "#04",
      medal: "🥈",
      accent: "#C0C0C0",
      direction: "flat"
    },
    {
      song: "Spirit",
      artist: "Matitu",
      votes: "10.1K",
      weeks: 7,
      yt: "#06",
      sp: "#07",
      bp: "#08",
      medal: "🥉",
      accent: "#8a6d1a",
      direction: "down"
    }
  ];

  const rest: ChartItem[] = Array.from({ length: 17 }, (_, i) => {
    const rank = i + 4;

    const directions: ('up' | 'down' | 'flat')[] = ['up', 'down', 'flat'];

    return {
      rank,
      song: `Track ${rank}`,
      artist: "Underground Artist",
      votes: `${(Math.random() * 5 + 0.5).toFixed(1)}K`,
      weeks: Math.floor(Math.random() * 15),
      yt: `#${rank + 2}`,
      sp: `#${rank + 3}`,
      bp: `#${rank + 1}`,
      accent: "#1a1a1a",
      direction: directions[Math.floor(Math.random() * 3)]
    };
  });

  const data: ChartItem[] = [
    ...baseTop3.map((item, i) => ({ ...item, rank: i + 1 })),
    ...rest
  ];

  const Arrow = ({ dir }: { dir?: string }) => {
    if (dir === 'up') return <span className="text-[#D4AF37]">▲</span>;
    if (dir === 'down') return <span className="text-red-500">▼</span>;
    return <span className="text-white/20">•</span>;
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 mt-8 mb-24">

      <div className="flex flex-col gap-3">

        {data.map((item) => (
          <div
            key={item.rank}
            className="relative flex items-center justify-between px-5 py-5 bg-[#070707] border border-white/5 hover:border-white/15 transition-all overflow-hidden group"
          >

            {/* LEFT */}
            <div className="flex items-center gap-5 z-10">

              <div className="flex flex-col items-center w-10">
                <span className="text-white/20 text-xs font-mono">
                  {item.rank < 10 ? `0${item.rank}` : item.rank}
                </span>
                <Arrow dir={item.direction} />
              </div>

              <div>
                <h3 className="font-cinzel text-sm md:text-base font-black uppercase text-white group-hover:text-[#D4AF37] transition">
                  {item.song}
                </h3>
                <p className="text-[9px] text-white/40 tracking-[0.3em] uppercase">
                  {item.artist}
                </p>
              </div>

            </div>

            {/* CENTER */}
            <div className="hidden md:flex items-center gap-8 text-[10px] text-white/40 font-mono z-10">
              <span>{item.weeks}W</span>
              <span>YT {item.yt}</span>
              <span>SP {item.sp}</span>
              <span>BP {item.bp}</span>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-3 z-10">

              <button
                onClick={() => onVote(item.song, 'up')}
                className="w-10 h-10 flex items-center justify-center border border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition"
              >
                <span className="text-[#D4AF37]">▲</span>
              </button>

              <div className="min-w-[70px] text-center">
                <p className="text-white font-bold text-sm">{item.votes}</p>
                <p className="text-[7px] text-white/30 uppercase tracking-[0.4em]">
                  Pulse
                </p>
              </div>

              <button
                onClick={() => onVote(item.song, 'down')}
                className="w-10 h-10 flex items-center justify-center border border-white/10 hover:border-red-500 hover:bg-red-500/10 transition"
              >
                <span className="text-white/30">▼</span>
              </button>

            </div>

            {/* ACCENT STRIP */}
            <div
              className="absolute left-0 top-0 h-full w-[3px] opacity-60"
              style={{ backgroundColor: item.accent }}
            />

          </div>
        ))}

      </div>

    </section>
  );
}