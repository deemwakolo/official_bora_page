'use client';

import React, { useState } from 'react';
import { Youtube, Music } from 'lucide-react'; // 🔥 added icons

export default function Kura({ songs = [], onVote }) {
  const [alert, setAlert] = useState(null);

  const handleVote = (id, title, type) => {
    if (typeof onVote === 'function') {
      onVote(id.toString(), type);
    } else {
      console.error("MATITU_SYSTEM_ERROR: onVote signal not connected to Kura.");
    }

    setAlert({
      id: title,
      type,
      msg: type === 'up' ? 'SIGNAL BOOSTED' : 'SIGNAL DROPPED'
    });

    setTimeout(() => setAlert(null), 1200);
  };

  return (
    <section className="min-h-screen text-white p-4 md:p-12 relative overflow-hidden selection:bg-[#D4AF37] selection:text-black">

      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[#070A12]" />
        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(18,45,78,0.45),transparent_60%),radial-gradient(circle_at_center,rgba(245,235,210,0.10),transparent_70%)]" />
        <div className="absolute inset-0 opacity-20 blur-2xl bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15),transparent_60%)]" />
      </div>

      {/* ALERT */}
      {alert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          <div className={`
            relative px-12 py-10 border-l-4 overflow-hidden
            animate-in fade-in zoom-in duration-300
            shadow-[0_0_120px_rgba(0,0,0,1)]
            ${alert.type === 'up'
              ? 'bg-[#0B1220] border-[#D4AF37] text-[#D4AF37]'
              : 'bg-[#120B0B] border-red-500 text-red-300'}
          `}>
            <p className="text-[10px] font-mono tracking-[0.6em] opacity-40 uppercase mb-2">
              MATITU_SIGNAL_CORE
            </p>
            <h2 className="text-3xl md:text-5xl font-black italic uppercase">
              {alert.msg}
            </h2>
            <p className="text-xs opacity-60 mt-3 uppercase tracking-widest">
              {alert.id}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        {songs.map((item, i) => {
          const rank = i + 1;

          let borderGlow = "border-white/10";
          let glow = "";

          if (rank === 1) {
            borderGlow = "border-[#D4AF37]";
            glow = "shadow-[0_0_90px_rgba(212,175,55,0.28)]";
          }

          const medal =
            rank === 1 ? "🥇" :
            rank === 2 ? "🥈" :
            rank === 3 ? "🥉" : "";

          return (
            <div
              key={item.id || item.slot_number}
              className={`relative flex flex-col items-center bg-[#0B1220] border transition-all duration-500 p-6 md:p-10 group rounded-sm hover:scale-[1.01] ${borderGlow} ${glow}`}
            >

              {/* RANK */}
              <div className="absolute top-4 left-4 z-30 bg-[#0A0F1A]/90 px-3 py-2 border border-white/10">
                <span className="text-xs font-black text-[#F5EBD2]">
                  {medal || String(rank).padStart(2, '0')}
                </span>
              </div>

              {/* PLATFORM INDICATORS (🔥 NEW) */}
              <div className="absolute top-4 right-4 flex gap-3 opacity-60">
                {item.yt_views && (
                  <div className="flex items-center gap-1 text-red-400">
                    <Youtube size={14} />
                    <span className="text-[9px] font-mono">{item.yt_views}</span>
                  </div>
                )}

                {item.sp_plays && (
                  <div className="flex items-center gap-1 text-green-400">
                    <Music size={14} />
                    <span className="text-[9px] font-mono">{item.sp_plays}</span>
                  </div>
                )}
              </div>

              {/* VINYL (UNCHANGED) */}
              <div className="relative flex items-center justify-center mb-8">
                <div className="absolute w-52 h-52 md:w-[320px] md:h-[320px] group-hover:translate-x-12 transition-all duration-700">
                  <div className="relative w-full h-full rounded-full bg-[#05070D] border border-[#F5EBD2]/20 overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{
                        background: `repeating-radial-gradient(circle, rgba(212,175,55,0.08) 0px, transparent 4px)`
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border border-[#F5EBD2]/20">
                        <img src={item.cover_url || '/placeholder.jpg'} alt="label" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 w-56 h-56 md:w-[340px] md:h-[340px] border border-white/10 bg-black overflow-hidden">
                  <img
                    src={item.cover_url}
                    alt={item.title}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-100 transition"
                  />
                </div>
              </div>

              {/* TEXT */}
              <div className="text-center">
                <p className="text-[10px] tracking-[0.4em] text-[#F5EBD2]/60 uppercase">
                  {item.artist}
                </p>
                <h3 className="font-black text-2xl md:text-4xl uppercase text-white tracking-tighter">
                  {item.title}
                </h3>
              </div>

              {/* STATS (UNCHANGED LOGIC) */}
              <div className="mt-3 flex items-center gap-6 text-[10px] font-mono text-[#F5EBD2]/60 uppercase">
                <span>▲ {item.upvotes ?? 0}</span>
                <span>▼ {item.downvotes ?? 0}</span>
                <span className="text-[#D4AF37] font-bold tracking-widest">
                  KURA SCORE {item.momentum_score || '0.00'}
                </span>
              </div>

              {/* ACTIONS */}
              <div className="mt-6 flex gap-6">
                <button
                  onClick={() => handleVote(item.id || item.slot_number, item.title, 'up')}
                  className="w-14 h-14 border border-[#F5EBD2]/20 hover:border-[#D4AF37] transition"
                >
                  ▲
                </button>
                <button
                  onClick={() => handleVote(item.id || item.slot_number, item.title, 'down')}
                  className="w-14 h-14 border border-[#F5EBD2]/20 hover:border-red-500 transition"
                >
                  ▼
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
}