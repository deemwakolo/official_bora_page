'use client';

import React, { useState } from 'react';

export default function Chart({ songs = [], onVote }) {
  const [alert, setAlert] = useState(null);

  const handleVote = (id, title, type) => {
    onVote(id.toString(), type);
    setAlert({
      id: title,
      type,
      msg: type === 'up' ? 'SIGNAL BOOSTED' : 'SIGNAL DROPPED'
    });
    setTimeout(() => setAlert(null), 1200);
  };

  return (
    <section className="min-h-screen text-white p-4 md:p-12 relative overflow-hidden">

      {/* 🌌 BACKGROUND FIELD (ENHANCED GLOW DEPTH) */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[#070A12]" />

        <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.22),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(18,45,78,0.45),transparent_60%),radial-gradient(circle_at_center,rgba(245,235,210,0.10),transparent_70%)]" />

        {/* subtle moving glow layer */}
        <div className="absolute inset-0 opacity-20 blur-2xl bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15),transparent_60%)]" />
      </div>

      {/* 🔥 CINEMATIC SYSTEM POPUP (UPGRADED) */}
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

            {/* scanline effect */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.1),transparent)] animate-pulse" />

            <p className="text-[10px] font-mono tracking-[0.6em] opacity-40 uppercase mb-2">
              MATITU_SIGNAL_CORE
            </p>

            <h2 className="text-3xl md:text-5xl font-black italic tracking-tight">
              {alert.msg}
            </h2>

            <p className="text-xs opacity-60 mt-3">{alert.id}</p>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col gap-10">

        {songs.map((item, i) => {
          const rank = i + 1;

          const isTop3 = rank <= 3;
          const isGoldTier = rank >= 4 && rank <= 10;
          const isMidTier = rank >= 11 && rank <= 20;

          let borderGlow = "border-white/10";
          let glow = "";

          if (rank === 1) {
            borderGlow = "border-[#D4AF37]";
            glow = "shadow-[0_0_90px_rgba(212,175,55,0.28)]";
          } else if (isTop3) {
            borderGlow = "border-[#F5EBD2]/20";
            glow = "shadow-[0_0_60px_rgba(245,235,210,0.10)]";
          } else if (isGoldTier) {
            borderGlow = "border-[#D4AF37]/25";
            glow = "shadow-[0_0_50px_rgba(212,175,55,0.14)]";
          } else if (isMidTier) {
            borderGlow = "border-[#FF4D4D]/20";
            glow = "shadow-[0_0_40px_rgba(255,77,77,0.12)]";
          }

          const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "";

          return (
            <div
              key={item.slot_number}
              className={`
                relative flex flex-col items-center
                bg-[#0B1220]
                border transition-all duration-500
                p-6 md:p-10 group rounded-sm
                hover:scale-[1.01]
                ${borderGlow} ${glow}
              `}
            >

              {/* 🏷 FRONT RANK BADGE */}
              <div className="absolute top-4 left-4 z-30 bg-[#0A0F1A]/90 backdrop-blur px-3 py-2 border border-white/10">
                <span className="text-xs font-black tracking-widest text-[#F5EBD2]">
                  {medal || String(rank).padStart(2, '0')}
                </span>
              </div>

              {/* 🪶 BACKGROUND MEDAL */}
              {isTop3 && (
                <div className="absolute bottom-2 left-2 text-[7rem] opacity-[0.06] pointer-events-none select-none blur-[1px]">
                  {medal}
                </div>
              )}

              {/* VINYL */}
              <div className="relative flex items-center justify-center mb-8">

                <div className="absolute w-52 h-52 md:w-[320px] md:h-[320px] group-hover:translate-x-12 transition-all duration-700">

                  <div className="relative w-full h-full rounded-full bg-[#05070D] border border-[#F5EBD2]/20 overflow-hidden">

                    <div
                      className="absolute inset-0 opacity-60"
                      style={{
                        background: `
                          repeating-radial-gradient(
                            circle,
                            rgba(212,175,55,0.08) 0px,
                            transparent 4px
                          )
                        `
                      }}
                    />

                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(212,175,55,0.20),rgba(18,45,78,0.18),transparent)]" />

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border border-[#F5EBD2]/20">
                        <img src={item.cover_url || '/placeholder.jpg'} />
                      </div>
                    </div>

                  </div>
                </div>

                {/* COVER */}
                <div className="relative z-10 w-56 h-56 md:w-[340px] md:h-[340px] border border-white/10 bg-black overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.8)]">

                  <img
                    src={item.cover_url}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-100 transition"
                  />

                </div>

              </div>

              {/* TEXT */}
              <div className="text-center">

                <p className="text-[10px] tracking-[0.4em] text-[#F5EBD2]/60 uppercase">
                  {item.artist}
                </p>

                <h3 className="font-black text-2xl md:text-4xl uppercase text-white">
                  {item.title}
                </h3>

              </div>

              {/* 📊 VOTE SIGNAL COUNTS (RESTORED CLEANLY) */}
              <div className="mt-3 flex items-center gap-6 text-[10px] font-mono text-[#F5EBD2]/60">
                <span>▲ {item.upvotes ?? 0}</span>
                <span>▼ {item.downvotes ?? 0}</span>
                <span className="text-[#D4AF37]">MS {item.momentum_score}</span>
              </div>

              {/* ACTIONS */}
              <div className="mt-6 flex gap-6">

                <button
                  onClick={() => handleVote(item.slot_number, item.title, 'up')}
                  className="w-14 h-14 border border-[#F5EBD2]/20 hover:border-[#D4AF37] hover:text-[#D4AF37] transition text-xl hover:shadow-[0_0_25px_rgba(212,175,55,0.4)]"
                >
                  ▲
                </button>

                <button
                  onClick={() => handleVote(item.slot_number, item.title, 'down')}
                  className="w-14 h-14 border border-[#F5EBD2]/20 hover:border-red-500 hover:text-red-400 transition text-xl hover:shadow-[0_0_25px_rgba(255,0,0,0.25)]"
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