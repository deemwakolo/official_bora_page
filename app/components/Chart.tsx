'use client';

import React, { useEffect, useState } from 'react';

interface ChartItem {
  song: string;
  artist: string;
  votes: string;
  rank: number;
  direction?: 'up' | 'down' | 'flat';
  cover?: string;
}

export default function Chart({
  onVote
}: {
  onVote: (song: string, type: 'up' | 'down') => void;
}) {
  const [hasMounted, setHasMounted] = useState(false);
  const [alert, setAlert] = useState<{ id: string; msg: string; type: 'up' | 'down' } | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleInternalVote = (song: string, type: 'up' | 'down') => {
    onVote(song, type);
    setAlert(null);
    setTimeout(() => {
      setAlert({ 
        id: song, 
        msg: type === 'up' ? 'SIGNAL BOOST' : 'SIGNAL DAMP', 
        type 
      });
    }, 10);
    setTimeout(() => setAlert(null), 2500);
  };

  const baseData: ChartItem[] = [
    { rank: 1, song: "Sielewi", artist: "Matitu Nation", votes: "15.4K", direction: "up", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80" },
    { rank: 2, song: "The Rock", artist: "Rocky", votes: "12.9K", direction: "flat", cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=800&q=80" },
    { rank: 3, song: "Spirit", artist: "Matitu", votes: "10.1K", direction: "down", cover: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=800&q=80" }
  ];

  const fullData = hasMounted
    ? [
        ...baseData,
        ...Array.from({ length: 17 }, (_, i) => ({
          rank: i + 4,
          song: `Pulse Track ${i + 4}`,
          artist: "Matitu Nation",
          votes: `${(Math.random() * 5 + 0.5).toFixed(1)}K`,
          direction: ['up', 'down', 'flat'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'flat',
          cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80"
        }))
      ]
    : baseData;

  if (!hasMounted) return null;

  return (
    <section className="w-full max-w-5xl mx-auto px-4 md:px-6 pt-2 pb-0 bg-transparent text-[#f0f0f0] font-cinzel relative">
      
      {/* 🚀 COMPACT TACTICAL NOTIFICATION */}
      <div className="fixed bottom-12 right-6 z-[100] pointer-events-none perspective-1000">
        <div className={`
          relative transition-all duration-400 ease-out transform
          ${alert ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-4 opacity-0 scale-95'}
        `}>
          {alert && (
            <div className={`
              relative p-3 min-w-[200px] bg-[#0a0a0a] backdrop-blur-xl border-l-4
              ${alert.type === 'up' ? 'border-[#D4AF37]' : 'border-[#b91c1c]'}
              clip-path-module shadow-[0_10px_30px_rgba(0,0,0,0.8)]
            `}>
              {/* Scanline Effect */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent h-full w-full animate-scan-v" />
              
              <div className="relative z-10 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${alert.type === 'up' ? 'bg-[#D4AF37]' : 'bg-[#b91c1c]'} animate-pulse`} />
                  <span className={`text-[8px] font-black tracking-[0.3em] font-mono ${alert.type === 'up' ? 'text-[#D4AF37]' : 'text-[#b91c1c]'}`}>
                    {alert.msg}
                  </span>
                </div>
                
                <h4 className="text-white text-[11px] font-bold uppercase truncate max-w-[160px]">
                  {alert.id}
                </h4>

                <div className="flex gap-1 mt-1">
                   {[...Array(6)].map((_, i) => (
                     <div key={i} className={`h-1 w-3 bg-white/10 overflow-hidden`}>
                        <div className={`h-full w-full ${alert.type === 'up' ? 'bg-[#D4AF37]' : 'bg-[#b91c1c]'} animate-binary-step`} style={{ animationDelay: `${i * 0.1}s` }} />
                     </div>
                   ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chart List */}
      <div className="flex flex-col gap-2 md:gap-px">
        {fullData.map((item) => {
          const isTop3 = item.rank <= 3;
          return (
            <div
              key={item.rank}
              className={`group relative flex flex-col md:flex-row items-start md:items-center transition-all duration-500 
                ${isTop3 
                  ? 'bg-gradient-to-r from-[#1a0000] to-[#080000] py-6 md:py-8 border-2 border-[#D4AF37]/30 mb-2' 
                  : 'bg-[#080000] py-4 md:py-5 border-b border-white/5 md:border-none'
                } px-4 md:px-6 hover:bg-[#120000]`}
            >
              <div className="flex items-center w-full md:w-auto mb-3 md:mb-0">
                <div className="relative flex-shrink-0 mr-4 md:mr-8">
                  <div className={`relative overflow-hidden rounded-full border-2 transition-all duration-700 
                    ${isTop3 ? 'w-20 h-20 md:w-28 md:h-28 border-[#D4AF37]' : 'w-14 h-14 md:w-16 md:h-16 border-[#e5e7eb]/10'}`}
                  >
                    <img src={item.cover} alt="" className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0" />
                  </div>
                  <div className={`absolute -top-1 -left-1 font-black flex items-center justify-center rounded-sm transform -rotate-12 group-hover:rotate-0 transition-transform shadow-md border
                    ${isTop3 ? 'w-8 h-8 md:w-10 md:h-10 bg-[#b91c1c] text-white border-[#D4AF37]' : 'w-6 h-6 bg-[#222] text-[#e5e7eb] border-white/10 text-[9px]'}`}
                  >
                    {item.rank}
                  </div>
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1 overflow-hidden">
                    <span className={`text-[7px] md:text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${item.direction === 'up' ? 'bg-[#b91c1c] text-white' : 'bg-white/20 text-[#e5e7eb]'}`}>
                      {item.direction === 'up' ? 'ASC' : item.direction === 'down' ? 'DSC' : 'STB'}
                    </span>
                    <p className={`font-mono uppercase tracking-widest truncate ${isTop3 ? 'text-[#D4AF37] text-[9px]' : 'text-white/40 text-[8px]'}`}>{item.artist}</p>
                  </div>
                  <h3 className={`font-bold uppercase tracking-tight truncate transition-all group-hover:text-[#D4AF37] ${isTop3 ? 'text-2xl md:text-4xl text-white' : 'text-lg md:text-2xl text-white/90'}`}>{item.song}</h3>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto md:ml-auto gap-4 md:gap-10">
                <div className="text-left md:text-right">
                  <span className="block font-mono uppercase tracking-[0.3em] text-[8px] opacity-40">Volume</span>
                  <span className={`font-black italic ${isTop3 ? 'text-2xl text-white' : 'text-lg text-white/90'}`}>{item.votes}</span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleInternalVote(item.song, 'up')} className={`flex items-center justify-center rounded-full border transition-all active:scale-90 ${isTop3 ? 'w-10 h-10 md:w-14 md:h-14 bg-[#b91c1c] border-[#D4AF37]' : 'w-8 h-8 md:w-10 md:h-10 border-white/10 hover:border-[#D4AF37]'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  </button>
                  <button onClick={() => handleInternalVote(item.song, 'down')} className={`flex items-center justify-center rounded-full border transition-all active:scale-90 ${isTop3 ? 'w-10 h-10 md:w-14 md:h-14 bg-transparent border-[#b91c1c] text-[#b91c1c]' : 'w-8 h-8 md:w-10 md:h-10 border-white/10 hover:border-white'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
        
        .clip-path-module {
          clip-path: polygon(0 0, 90% 0, 100% 20%, 100% 100%, 10% 100%, 0 80%);
        }

        @keyframes scan-v {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes binary-step {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        .animate-scan-v {
          animation: scan-v 1.5s linear infinite;
        }

        .animate-binary-step {
          animation: binary-step 0.4s ease-in-out forwards;
        }
      `}</style>
    </section>
  );
}