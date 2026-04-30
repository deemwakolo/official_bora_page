'use client';

import React, { useState, useEffect } from 'react';
import { Youtube, Music } from 'lucide-react';

interface Song {
  id?: string | number;
  slot_number?: number;
  title: string;
  artist?: string;
  cover_url: string;
  youtube_id?: string;
  momentum_score?: number;
  yt_rank?: number;
  sp_rank?: number;
}

interface KuraProps {
  songs: Song[];
  onVote: (id: string, type: 'up' | 'down') => void;
}

export default function Kura({ songs: initialSongs = [], onVote }: KuraProps) {
  const [localSongs, setLocalSongs] = useState<Song[]>(initialSongs);
  const [alert, setAlert] = useState<{ id: string; type: 'up' | 'down'; msg: string } | null>(null);

  useEffect(() => {
    setLocalSongs(initialSongs);
  }, [initialSongs]);

  const handleVote = (id: string | number | undefined, title: string, type: 'up' | 'down') => {
    if (!id) return;

    setLocalSongs((currentSongs) =>
      currentSongs.map((song) => {
        if (song.id === id) {
          const currentScore = Number(song.momentum_score) || 0;
          return {
            ...song,
            // ⚡ RAW INTEGER UPDATE: Uncapped
            momentum_score: type === 'up' ? currentScore + 1 : currentScore - 1,
          };
        }
        return song;
      })
    );

    if (typeof onVote === 'function') {
      onVote(id.toString(), type);
    }

    setAlert({
      id: title,
      type,
      msg: type === 'up' ? 'SIGNAL BOOSTED' : 'SIGNAL DROPPED',
    });

    setTimeout(() => setAlert(null), 1200);
  };

  return (
    <section className="min-h-screen text-white p-4 md:p-12 relative overflow-hidden selection:bg-[#D4AF37] selection:text-black">
      
      {/* AMBIENT BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[#050505]" />
        <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.15),transparent_50%),radial-gradient(circle_at_bottom_right,rgba(185,28,28,0.1),transparent_50%)]" />
      </div>

      {/* GLOBAL NOTIFICATION */}
      {alert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />
          <div className={`relative px-12 py-10 border-l-4 ${
            alert.type === 'up' ? 'bg-[#0B1220] border-[#D4AF37] text-[#D4AF37]' : 'bg-[#120B0B] border-red-600 text-red-500'
          }`}>
            <p className="text-[10px] font-mono tracking-[0.6em] opacity-40 uppercase mb-2">BORA_SIGNAL_SYNC</p>
            <h2 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter">{alert.msg}</h2>
            <p className="text-xs opacity-60 mt-3 uppercase tracking-widest">{alert.id}</p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col gap-16">
        {localSongs.map((item, i) => {
          const rank = i + 1;
          const [displayTitle, displayArtist] = item.title.includes(' - ') 
            ? item.title.split(' - ') 
            : [item.title, item.artist || 'Bongo Flava Industry'];

          const finalCover = item.youtube_id
            ? `https://img.youtube.com/vi/${item.youtube_id}/maxresdefault.jpg`
            : (item.cover_url || '/placeholder.jpg');

          return (
            <div key={item.id} className="relative group">
              {/* RANK INDICATOR */}
              <div className="absolute -left-4 md:-left-8 top-0 z-20">
                <span className="text-5xl md:text-8xl font-black italic opacity-10 group-hover:opacity-25 transition-opacity text-white outline-text">
                  {String(rank).padStart(2, '0')}
                </span>
              </div>

              <div className={`relative flex flex-col md:flex-row items-center bg-[#0A0A0A] border border-white/5 p-6 md:p-10 transition-all duration-500 rounded-sm hover:border-white/20 ${rank === 1 ? 'shadow-[0_0_80px_rgba(212,175,55,0.05)] border-[#D4AF37]/20' : ''}`}>
                
                {/* VINYL ANIMATION RESTORED */}
                <div className="relative flex items-center justify-center mb-8 md:mb-0 md:mr-16 shrink-0">
                  {/* The sliding record */}
                  <div className="absolute w-52 h-52 md:w-[320px] md:h-[320px] group-hover:translate-x-16 transition-all duration-700 ease-out">
                    <div className="relative w-full h-full rounded-full bg-[#05070D] border border-[#F5EBD2]/20 overflow-hidden">
                      <div className="absolute inset-0 opacity-60"
                        style={{ background: `repeating-radial-gradient(circle, rgba(212,175,55,0.08) 0px, transparent 4px)` }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border border-[#F5EBD2]/20 bg-black">
                          <img src={finalCover} alt="" className="w-full h-full object-cover opacity-50" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* The Sleeve/Cover */}
                  <div className="relative z-10 w-56 h-56 md:w-[340px] md:h-[340px] border border-white/10 bg-black overflow-hidden shadow-2xl">
                    <img
                      src={finalCover}
                      alt={displayTitle}
                      className="w-full h-full object-cover brightness-75 group-hover:brightness-100 transition duration-500"
                    />
                  </div>
                </div>

                {/* CONTENT */}
                <div className="flex-1 text-center md:text-left">
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-6">
                    {item.yt_rank && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-red-600/10 border border-red-600/20 rounded-full">
                        <Youtube size={12} className="text-red-600" />
                        <span className="text-[10px] font-mono font-bold text-red-500">#{item.yt_rank} YT</span>
                      </div>
                    )}
                    {item.sp_rank && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-600/10 border border-green-600/20 rounded-full">
                        <Music size={12} className="text-green-600" />
                        <span className="text-[10px] font-mono font-bold text-green-600">#{item.sp_rank} SP</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs tracking-[0.4em] text-[#D4AF37] font-bold uppercase mb-2">{displayArtist}</p>
                  <h3 className="font-black text-3xl md:text-5xl uppercase tracking-tighter leading-none mb-8">{displayTitle}</h3>

                  <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
                    {/* POWER INDEX */}
                    <div className="flex flex-col items-center md:items-start">
                      <span className="text-[9px] font-mono text-white/30 uppercase tracking-[0.4em] mb-1 text-center md:text-left">Power Index</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl md:text-6xl font-black tabular-nums text-white">
                          {Math.floor(Number(item.momentum_score) || 0)}
                        </span>
                        <span className="text-xs font-mono text-[#D4AF37] font-bold tracking-widest">PTS</span>
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleVote(item.id, displayTitle, 'up')}
                        className="w-16 h-16 border border-white/10 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all flex items-center justify-center text-xl active:scale-90"
                      >
                        ▲
                      </button>
                      <button 
                        onClick={() => handleVote(item.id, displayTitle, 'down')}
                        className="w-16 h-16 border border-white/10 hover:border-red-600 hover:bg-red-600/10 transition-all flex items-center justify-center text-xl active:scale-90"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}