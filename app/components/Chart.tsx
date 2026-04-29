'use client';

import React, { useState } from 'react';

export default function Chart({ songs = [], onVote }) {
  const [alert, setAlert] = useState(null);

  const handleVote = (id, title, type) => {
    onVote(id.toString(), type);
    setAlert({
      id: title,
      type,
      msg: type === 'up' ? 'SIGNAL_BOOSTED' : 'SIGNAL_DROPPED'
    });
    setTimeout(() => setAlert(null), 1500);
  };

  return (
    <section className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-20">

      {/* ALERT */}
      {alert && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none p-6">
          <div className={`w-full max-w-lg backdrop-blur-xl border p-8 shadow-2xl
            ${alert.type === 'up'
              ? 'border-[#D4AF37] bg-[#D4AF37]/10'
              : 'border-red-600 bg-red-600/10'}
          `}>
            <h2 className="text-3xl font-black italic uppercase">
              {alert.msg}
            </h2>
            <p className="text-xs opacity-60 mt-2">{alert.id}</p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto flex flex-col gap-24">

        {songs.map((item, i) => {
          const isTop = i === 0;

          return (
            <div
              key={item.slot_number}
              className="relative flex flex-col items-center 
              bg-[#111] border border-white/10 
              hover:border-[#D4AF37]/40 
              transition-all duration-500 
              p-10 md:p-16 group rounded-sm"
            >

              {/* RANK BACKDROP */}
              <span className="absolute text-[8rem] md:text-[12rem] font-black italic opacity-[0.05] -top-6 left-4">
                {(i + 1).toString().padStart(2, '0')}
              </span>

              {/* VINYL + COVER */}
              <div className="relative flex items-center justify-center mb-14">

                {/* 💿 VINYL (VISIBLE NOW) */}
                <div className={`
                  absolute transition-all duration-700
                  ${isTop ? 'w-72 h-72 md:w-[420px] md:h-[420px]' : 'w-52 h-52 md:w-72 md:h-72'}
                  group-hover:translate-x-16 md:group-hover:translate-x-24
                `}>

                  <div className="relative w-full h-full rounded-full bg-black border border-white/20 shadow-[0_30px_80px_rgba(0,0,0,0.9)] overflow-hidden">

                    {/* grooves */}
                    <div className="absolute inset-0 opacity-40"
                      style={{
                        background: `
                          repeating-radial-gradient(
                            circle,
                            rgba(255,255,255,0.06) 0px,
                            rgba(255,255,255,0.06) 1px,
                            transparent 2px,
                            transparent 4px
                          )
                        `
                      }}
                    />

                    {/* highlight */}
                    <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent,rgba(255,255,255,0.12),transparent)]" />

                    {/* center label */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`
                        rounded-full overflow-hidden border border-white/20
                        ${isTop ? 'w-28 h-28 md:w-40 md:h-40' : 'w-20 h-20 md:w-28 md:h-28'}
                      `}>
                        <img
                          src={item.cover_url || '/placeholder.jpg'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* hole */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-black rounded-full" />
                    </div>

                  </div>
                </div>

                {/* COVER */}
                <div className={`
                  relative z-10 overflow-hidden bg-black
                  shadow-[0_20px_60px_rgba(0,0,0,0.8)]
                  ${isTop
                    ? 'w-72 h-72 md:w-[440px] md:h-[440px] border border-[#D4AF37]'
                    : 'w-60 h-60 md:w-[320px] md:h-[320px] border border-white/10'}
                `}>
                  <img
                    src={item.cover_url || '/placeholder.jpg'}
                    className="w-full h-full object-cover brightness-75 group-hover:brightness-100 transition"
                  />
                </div>

              </div>

              {/* TEXT */}
              <div className="text-center max-w-2xl">

                <p className="text-xs tracking-[0.4em] text-gray-400 uppercase mb-2">
                  {item.artist}
                </p>

                <h3 className={`
                  font-black uppercase leading-tight
                  ${isTop ? 'text-5xl md:text-7xl italic text-white' : 'text-3xl md:text-5xl'}
                `}>
                  {item.title}
                </h3>

                <div className="mt-6 flex justify-center gap-6 text-xs text-gray-400 font-mono">
                  <span>YT {item.yt_views}</span>
                  <span>SP {item.sp_plays}</span>
                  <span className="text-[#D4AF37]">MS {item.momentum_score}</span>
                </div>

              </div>

              {/* ACTIONS */}
              <div className="mt-12 flex gap-6">

                <button
                  onClick={() => handleVote(item.slot_number, item.title, 'up')}
                  className="px-5 py-2 border border-white/20 hover:border-[#D4AF37] hover:text-[#D4AF37] transition"
                >
                  ▲
                </button>

                <button
                  onClick={() => handleVote(item.slot_number, item.title, 'down')}
                  className="px-5 py-2 border border-white/20 hover:border-red-500 hover:text-red-400 transition"
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