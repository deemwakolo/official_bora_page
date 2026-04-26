// app/components/Chart.tsx
'use client';

import React, { useEffect, useState } from 'react';
// Corrected path: Up two levels (../../) to find the lib folder
import { getRegistry } from '../../lib/admin-actions'; 

interface ChartItem {
  id: string;
  title: string;
  artist: string;
  yt_views: number;
  sp_plays: number;
  momentum_score: number;
  cover_url: string;
  rank: number;
}

export default function Chart({
  onVote
}: {
  onVote: (songId: string, type: 'up' | 'down') => void;
}) {
  const [hasMounted, setHasMounted] = useState(false);
  const [songs, setSongs] = useState<ChartItem[]>([]);
  const [alert, setAlert] = useState<{ id: string; msg: string; type: 'up' | 'down' } | null>(null);

  useEffect(() => {
    setHasMounted(true);
    fetchLiveChart();
  }, []);

  // FETCH THE REAL REGISTRY DATA
  const fetchLiveChart = async () => {
    const data = await getRegistry();
    if (data) {
      // Map the data to include the visual rank (index + 1)
      const rankedData = data.map((item: any, index: number) => ({
        ...item,
        rank: index + 1
      }));
      setSongs(rankedData);
    }
  };

  const handleInternalVote = (songId: string, title: string, type: 'up' | 'down') => {
    onVote(songId, type);
    setAlert(null);
    setTimeout(() => {
      setAlert({ 
        id: title, 
        msg: type === 'up' ? 'SIGNAL BOOST' : 'SIGNAL DAMP', 
        type 
      });
    }, 10);
    setTimeout(() => setAlert(null), 2500);
  };

  if (!hasMounted) return null;

  return (
    <section className="w-full max-w-5xl mx-auto px-4 md:px-6 pt-2 pb-0 bg-transparent text-[#f0f0f0] font-cinzel relative">
      
      {/* TACTICAL NOTIFICATION */}
      <div className="fixed bottom-12 right-6 z-[100] pointer-events-none">
        {alert && (
            <div className={`p-3 min-w-[200px] bg-[#0a0a0a] border-l-4 ${alert.type === 'up' ? 'border-[#D4AF37]' : 'border-[#b91c1c]'} transition-all shadow-2xl`}>
              <span className={`text-[8px] font-black tracking-[0.3em] font-mono ${alert.type === 'up' ? 'text-[#D4AF37]' : 'text-[#b91c1c]'}`}>
                {alert.msg}
              </span>
              <h4 className="text-white text-[11px] font-bold uppercase truncate max-w-[180px]">{alert.id}</h4>
            </div>
        )}
      </div>

      <div className="flex flex-col gap-2 md:gap-px">
        {songs.map((item) => {
          const isTop3 = item.rank <= 3;
          // Calculate Volume based on real Cockpit numbers
          const totalReach = (item.yt_views || 0) + (item.sp_plays || 0);
          const volume = totalReach >= 1000 ? (totalReach / 1000).toFixed(1) + "K" : totalReach;

          return (
            <div
              key={item.id}
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
                    <img src={item.cover_url} alt="" className="w-full h-full object-cover grayscale transition-all group-hover:grayscale-0" />
                  </div>
                  <div className={`absolute -top-1 -left-1 font-black flex items-center justify-center rounded-sm 
                    ${isTop3 ? 'w-8 h-8 md:w-10 md:h-10 bg-[#b91c1c] text-white border-[#D4AF37]' : 'w-6 h-6 bg-[#222] text-[#e5e7eb] border-white/10 text-[9px]'}`}
                  >
                    {item.rank}
                  </div>
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[7px] md:text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm bg-[#b91c1c] text-white`}>
                      {item.momentum_score > 90 ? 'ASC' : 'STB'}
                    </span>
                    <p className={`font-mono uppercase tracking-widest truncate ${isTop3 ? 'text-[#D4AF37] text-[9px]' : 'text-white/40 text-[8px]'}`}>{item.artist}</p>
                  </div>
                  <h3 className={`font-bold uppercase tracking-tight truncate transition-all group-hover:text-[#D4AF37] ${isTop3 ? 'text-2xl md:text-4xl text-white' : 'text-lg md:text-2xl text-white/90'}`}>{item.title}</h3>
                </div>
              </div>

              <div className="flex items-center justify-between w-full md:w-auto md:ml-auto gap-4 md:gap-10">
                <div className="text-left md:text-right">
                  <span className="block font-mono uppercase tracking-[0.3em] text-[8px] opacity-40">Volume</span>
                  <span className={`font-black italic ${isTop3 ? 'text-2xl text-white' : 'text-lg text-white/90'}`}>{volume}</span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleInternalVote(item.id, item.title, 'up')} className={`flex items-center justify-center rounded-full border transition-all active:scale-90 ${isTop3 ? 'w-10 h-10 md:w-14 md:h-14 bg-[#b91c1c] border-[#D4AF37]' : 'w-8 h-8 md:w-10 md:h-10 border-white/10 hover:border-[#D4AF37]'}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {songs.length === 0 && (
          <div className="text-center py-20 border border-white/5 bg-zinc-900/10">
            <p className="text-white/20 font-mono text-xs uppercase tracking-widest">Awaiting Registry Injection from Cockpit...</p>
          </div>
        )}
      </div>
    </section>
  );
}