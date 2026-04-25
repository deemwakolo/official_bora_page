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
      song: `New Wave ${rank}`,
      artist: "Underground Artist",
      votes: `${(Math.random() * 5 + 0.5).toFixed(1)}K`,
      weeks: Math.floor(Math.random() * 15),
      yt: `#${rank + 2}`,
      sp: `#${rank + 3}`,
      bp: `#${rank + 1}`,
      accent: "#262626",
      direction: directions[Math.floor(Math.random() * 3)]
    };
  });

  const data: ChartItem[] = [
    ...baseTop3.map((item, i) => ({ ...item, rank: i + 1 })),
    ...rest
  ];

  // SVG Icons for Platforms
  const PlatformIcon = ({ type }: { type: 'yt' | 'sp' | 'bp' }) => {
    if (type === 'yt') return <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
    if (type === 'sp') return <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.508 17.304c-.216.354-.672.468-1.026.252-2.82-1.722-6.372-2.112-10.554-1.158-.402.096-.804-.156-.9-.558-.096-.402.156-.804.558-.9 4.584-1.05 8.52-.594 11.664 1.326.354.216.468.672.258 1.038zm1.476-3.258c-.276.45-.864.594-1.314.318-3.228-1.986-8.154-2.562-11.976-1.404-.51.156-1.05-.138-1.206-.648-.156-.51.138-1.05.648-1.206 4.38-1.326 9.816-.672 13.524 1.608.456.282.6.87.324 1.332zm.126-3.414c-3.87-2.304-10.248-2.508-13.944-1.386-.594.18-1.23-.156-1.41-.75-.18-.594.156-1.23.75-1.41 4.254-1.29 11.292-1.055 15.756 1.602.534.318.708 1.008.39 1.542-.318.534-1.008.708-1.542.402z"/></svg>;
    return <div className="w-3 h-3 bg-[#00E5FF] rounded-full flex items-center justify-center text-[6px] text-black font-bold">B</div>;
  };

  return (
    <section className="w-full max-w-5xl mx-auto px-4 mt-8 mb-24 relative">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-10 px-4">
        <h2 className="font-cinzel text-2xl font-black text-white tracking-widest uppercase">
          Bora <span className="text-[#D4AF37]">Pulse</span>
        </h2>
        <div className="text-right font-mono">
          <p className="text-[10px] text-[#D4AF37] uppercase tracking-widest">Sunday Edit</p>
          <p className="text-[8px] text-white/20 uppercase tracking-widest">26 . 04 . 26</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {data.map((item) => (
          <div
            key={item.rank}
            className={`group relative flex items-center justify-between px-6 py-6 bg-[#070707] border border-white/5 transition-all duration-500 overflow-hidden ${item.rank <= 3 ? 'hover:border-[#D4AF37]/60' : 'hover:border-white/20'}`}
          >
            
            {/* LARGE MEDAL BACKDROP (Top 3 Only) */}
            {item.medal && (
              <div className="absolute inset-0 flex items-center justify-end opacity-[0.05] group-hover:opacity-[0.08] transition-opacity pointer-events-none">
                <div className="text-[160px] rotate-12 translate-x-12 translate-y-4 select-none">
                  {item.medal}
                </div>
              </div>
            )}

            {/* RANK & TITLE */}
            <div className="relative z-10 flex items-center gap-8">
              <div className="flex flex-col items-center">
                <span className={`font-cinzel text-2xl font-black italic leading-none ${item.rank <= 3 ? 'text-[#D4AF37]' : 'text-white/10'}`}>
                  {item.rank < 10 ? `0${item.rank}` : item.rank}
                </span>
                {/* ICON ONLY DIRECTION */}
                <span className={`text-xs mt-2 ${
                  item.direction === 'up' ? 'text-[#D4AF37]' : item.direction === 'down' ? 'text-red-600' : 'text-white/10'
                }`}>
                  {item.direction === 'up' && '▲'}
                  {item.direction === 'down' && '▼'}
                  {item.direction === 'flat' && '—'}
                </span>
              </div>

              <div className="flex flex-col">
                <h3 className="font-cinzel text-base md:text-lg font-black uppercase text-white tracking-tight group-hover:text-[#D4AF37] transition-colors leading-tight">
                  {item.song}
                </h3>
                <p className="text-[9px] text-white/30 font-mono tracking-[0.3em] uppercase mt-1">
                  {item.artist}
                </p>
              </div>
            </div>

            {/* STATS / PLATFORMS */}
            <div className="hidden md:flex items-center gap-10 z-10">
               {item.rank <= 3 ? (
                 /* TOP 3 LOGO LAYOUT */
                 <div className="flex items-center gap-6">
                    <div className="flex flex-col items-center gap-1">
                      <PlatformIcon type="yt" />
                      <span className="font-mono text-[9px] text-white/80">{item.yt}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <PlatformIcon type="sp" />
                      <span className="font-mono text-[9px] text-white/80">{item.sp}</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-3 h-3 bg-[#00E5FF] rounded-full flex items-center justify-center text-[6px] text-black font-bold">B</div>
                      <span className="font-mono text-[9px] text-white/80">{item.bp}</span>
                    </div>
                 </div>
               ) : (
                 /* STANDARD LAYOUT */
                 <div className="flex items-center gap-8">
                   <div className="text-center">
                     <p className="text-[7px] text-white/20 uppercase tracking-widest mb-1">Tenure</p>
                     <p className="text-xs font-mono text-white/60">{item.weeks}W</p>
                   </div>
                   <div className="flex gap-4">
                     <span className="text-[9px] font-mono text-white/20">YT {item.yt}</span>
                     <span className="text-[9px] font-mono text-white/20">SP {item.sp}</span>
                   </div>
                 </div>
               )}
            </div>

            {/* OBVIOUS VOTING CONTROLS */}
            <div className="relative z-10 flex items-center gap-2">
              <button
                onClick={() => onVote(item.song, 'up')}
                className={`w-12 h-12 flex items-center justify-center border transition-all group/btn ${item.rank <= 3 ? 'bg-[#D4AF37]/5 border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
              >
                <span className={`text-xl transition-transform group-hover/btn:scale-125 ${item.rank <= 3 ? 'text-[#D4AF37]' : 'text-white/40'}`}>▲</span>
              </button>

              <div className={`flex flex-col items-center justify-center min-w-[70px] h-12 border-y ${item.rank <= 3 ? 'bg-[#D4AF37]/5 border-[#D4AF37]/10' : 'bg-white/[0.02] border-white/5'}`}>
                <span className={`text-sm font-mono font-black ${item.rank <= 3 ? 'text-[#D4AF37]' : 'text-white'}`}>{item.votes}</span>
                <span className="text-[6px] text-white/20 uppercase tracking-tighter">Pulse</span>
              </div>

              <button
                onClick={() => onVote(item.song, 'down')}
                className="w-12 h-12 flex items-center justify-center bg-white/5 border border-white/5 hover:border-red-600 hover:bg-red-600/10 transition-all group/btn"
              >
                <span className="text-xl text-white/20 group-hover/btn:text-red-600 group-hover/btn:scale-125 transition-transform">▼</span>
              </button>
            </div>

            {/* ACCENT STRIP */}
            <div
              className={`absolute left-0 top-0 h-full w-[4px] transition-all duration-700 ${item.rank <= 3 ? 'opacity-100 shadow-[2px_0_15px_rgba(212,175,55,0.4)]' : 'opacity-30'}`}
              style={{ backgroundColor: item.accent }}
            />
          </div>
        ))}
      </div>
      
    </section>
  );
}