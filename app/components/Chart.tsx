'use client';

import React, { useState } from 'react';

interface ChartItem {
  slot_number: number;
  title: string;
  artist: string;
  yt_views: number;
  sp_plays: number;
  momentum_score: number;
  cover_url: string;
  rank: number;
}

export default function Chart({
  songs = [], 
  onVote
}: {
  songs: ChartItem[];
  onVote: (songId: string, type: 'up' | 'down') => void;
}) {
  const [alert, setAlert] = useState<{ id: string; msg: string; type: 'up' | 'down' } | null>(null);

  const handleInternalVote = (slot: number, title: string, type: 'up' | 'down') => {
    onVote(slot.toString(), type);
    setAlert(null);
    setTimeout(() => {
      setAlert({ 
        id: title === 'Empty Slot' ? `ID_${slot}` : title, 
        msg: type === 'up' ? 'SIGNAL_BOOST' : 'SIGNAL_DAMP', 
        type 
      });
    }, 10);
    setTimeout(() => setAlert(null), 1200);
  };

  if (!songs || songs.length === 0) return null;

  return (
    <section className="w-full min-h-screen bg-[#050505] text-white p-4 md:p-12 font-cinzel selection:bg-[#b91c1c]">
      
      {/* 📡 SYSTEM HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 border-b border-white/10 pb-8">
        <div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter italic leading-none">THE_REGISTRY</h1>
          <p className="font-mono text-[10px] tracking-[0.6em] text-[#b91c1c] mt-4 uppercase">Matitu Nation // Tanzanian Sound Authority</p>
        </div>
        <div className="hidden md:block font-mono text-[10px] text-white/20 text-right uppercase">
          <p>Status: Active_Stream</p>
          <p>Engine: Bora_V4.0</p>
        </div>
      </div>

      {/* ⚠️ HUD ALERT */}
      <div className="fixed top-10 right-10 z-[500] pointer-events-none">
        {alert && (
          <div className="bg-white text-black p-4 skew-x-[-12deg] shadow-[8px_8px_0px_#b91c1c] border-l-8 border-black">
            <p className="font-mono font-black text-[10px] tracking-tighter italic">UPDATE_LOG //</p>
            <p className="font-bold uppercase text-xs italic">{alert.id}: {alert.msg}</p>
          </div>
        )}
      </div>

      {/* 🛠️ LIST SYSTEM */}
      <div className="space-y-1">
        {songs.map((item, index) => {
          const isTopTier = index < 3;
          
          return (
            <div 
              key={item.slot_number}
              className="group relative flex items-center gap-6 p-4 md:p-8 bg-zinc-950/40 border border-white/5 hover:bg-zinc-900/80 hover:border-[#b91c1c]/50 transition-all duration-300"
            >
              {/* RANK */}
              <div className="flex-shrink-0 w-12 md:w-20">
                <span className={`text-2xl md:text-5xl font-black italic transition-colors ${isTopTier ? 'text-[#D4AF37]' : 'text-white/10 group-hover:text-white'}`}>
                  {(index + 1).toString().padStart(2, '0')}
                </span>
              </div>

              {/* COVER ART (COMPACT) */}
              <div className="hidden md:block w-20 h-20 overflow-hidden border border-white/10 grayscale group-hover:grayscale-0 transition-all">
                {item.cover_url ? (
                  <img src={item.cover_url} className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-black flex items-center justify-center text-[8px] font-mono opacity-20">NO_IMG</div>
                )}
              </div>

              {/* IDENTITY */}
              <div className="flex-grow min-w-0">
                <p className="font-mono text-[8px] md:text-[10px] tracking-[0.4em] text-white/30 uppercase mb-1">
                  {item.artist === 'Empty Slot' ? 'DEE_DAVIEH' : item.artist}
                </p>
                <h2 className={`font-black uppercase tracking-tight truncate leading-none transition-all
                  ${isTopTier ? 'text-2xl md:text-5xl' : 'text-xl md:text-3xl'}
                `}>
                  {item.title === 'Empty Slot' ? 'RESERVED_SLOT' : item.title}
                </h2>
              </div>

              {/* STATS AREA */}
              <div className="hidden lg:flex items-center gap-12 px-8 border-x border-white/5">
                <div className="text-right">
                  <span className="block font-mono text-[7px] text-white/20 uppercase tracking-widest">Impact</span>
                  <span className="text-lg font-black italic tracking-tighter leading-none">
                    {(item.yt_views + item.sp_plays).toLocaleString()}
                  </span>
                </div>
                <div className="text-right w-24">
                  <span className="block font-mono text-[7px] text-white/20 uppercase tracking-widest">Momentum</span>
                  <div className="h-1 bg-white/5 mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-[#b91c1c] transition-all duration-1000" 
                      style={{ width: `${item.momentum_score}%` }} 
                    />
                  </div>
                </div>
              </div>

              {/* VOTE TRIGGER */}
              <div className="flex-shrink-0">
                <button 
                  onClick={() => handleInternalVote(item.slot_number, item.title, 'up')}
                  className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center border border-white/10 group/btn hover:bg-white transition-all"
                >
                  <svg 
                    width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" 
                    className="group-hover/btn:text-black group-hover/btn:-translate-y-1 transition-all"
                  >
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                </button>
              </div>

              {/* GHOST DETAIL */}
              <div className="absolute right-0 top-0 h-full w-24 overflow-hidden opacity-0 group-hover:opacity-10 pointer-events-none">
                <span className="text-8xl font-black italic rotate-90 inline-block translate-y-10 uppercase tracking-tighter">
                  MATITU
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER METADATA */}
      <div className="mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-8 font-mono text-[8px] tracking-[0.5em] text-white/20 uppercase">
          <span>Tanzania_District_Audio</span>
          <span>// Local_Time: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="px-4 py-1 border border-white/10">
          <span className="font-mono text-[8px] tracking-[0.2em] text-[#D4AF37] uppercase animate-pulse">Recording_Signal_Stable</span>
        </div>
      </div>

    </section>
  );
}