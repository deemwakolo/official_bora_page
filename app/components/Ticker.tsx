'use client';

import React from 'react';

export default function Ticker() {
  const newsItems = [
    { label: "PULSE", text: "Sielewi official rollout active — Stream on all platforms" },
    { label: "ACTION", text: "Vote for the Apex spot: SMS [Song Name] to 15700" },
    { label: "RECORD", text: "Diamond Platnumz 'Enjoy' maintains a 4-week dominance" },
    { label: "NOTICE", text: "Chart window closes Friday 23:59 EAT" },
    { label: "SYSTEM", text: "Bora Charts: Tanzania's verified musical metric" },
  ];

  const stream = [...newsItems, ...newsItems]; // clean infinite loop dataset

  return (
    <div className="w-full bg-[#0a0a0a] border-y border-white/10 py-2 overflow-hidden relative flex items-center">

      {/* BACKGROUND GRID */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      {/* SYSTEM TAG */}
      <div className="relative z-20 bg-[#b91c1c] px-4 py-2 flex items-center gap-2 shadow-[5px_0_15px_rgba(185,28,28,0.4)]">
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
          Registry
        </span>
      </div>

      {/* STREAM */}
      <div className="flex whitespace-nowrap animate-stream hover:[animation-play-state:paused]">
        {stream.map((item, index) => (
          <div key={index} className="flex items-center px-8 gap-4">

            {/* LABEL */}
            <span className="text-[#D4AF37] text-[9px] font-mono font-bold tracking-[0.25em] uppercase border-b border-[#D4AF37]/40">
              [{item.label}]
            </span>

            {/* TEXT */}
            <span className="text-[12px] md:text-[13px] font-medium uppercase tracking-[0.12em] text-white/80">
              {item.text}
            </span>

            {/* DIVIDER */}
            <div className="flex gap-1 ml-2">
              <div className="w-1 h-1 bg-white/20 rotate-45" />
              <div className="w-1 h-1 bg-[#b91c1c] rotate-45" />
              <div className="w-1 h-1 bg-white/20 rotate-45" />
            </div>

          </div>
        ))}
      </div>

      {/* ANIMATION */}
      <style jsx global>{`
        @keyframes stream {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-stream {
          display: flex;
          width: max-content;
          animation: stream 45s linear infinite;
        }
      `}</style>
    </div>
  );
}