'use client';

import React from 'react';

/**
 * BORA TICKER - "TACTICAL DATA" EDITION
 * Transitions from a solid red bar to a high-contrast black/dark-grey industrial look.
 * Features a sharp "Caution" yellow/gold accent with a technical grid background.
 */
export default function Ticker() {
  const newsItems = [
    { label: "PULSE", text: "Sielewi official rollout active — Stream on all platforms" },
    { label: "ACTION", text: "Vote for the Apex spot: SMS [Song Name] to 15700" },
    { label: "RECORD", text: "Diamond Platnumz 'Enjoy' maintains a 4-week dominance" },
    { label: "NOTICE", text: "Chart window closes Friday 23:59 EAT" },
    { label: "SYSTEM", text: "Bora Charts: Tanzania's verified musical metric" },
  ];

  return (
    <div className="w-full bg-[#0a0a0a] border-y border-white/10 py-1.5 overflow-hidden flex items-center relative">
      
      {/* 🏁 BACKGROUND TEXTURE */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      {/* 🚨 THE STATION ID (Fixed) */}
      <div className="relative z-20 bg-[#b91c1c] px-5 py-2 flex items-center gap-3 skew-x-[-12deg] -ml-2 shadow-[5px_0_15px_rgba(185,28,28,0.4)]">
        <div className="skew-x-[12deg] flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white font-cinzel">
            Registry
          </span>
        </div>
      </div>

      {/* 🚀 DATA STREAM */}
      <div className="flex whitespace-nowrap animate-data-stream items-center">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center">
            {newsItems.map((item, index) => (
              <div key={index} className="flex items-center px-10 gap-5 group">
                {/* TAG */}
                <span className="text-[#D4AF37] text-[9px] font-mono font-bold tracking-[0.2em] border-b border-[#D4AF37]/50 group-hover:text-white group-hover:border-white transition-colors duration-300">
                  [{item.label}]
                </span>
                
                {/* MESSAGE */}
                <span className="text-[11px] md:text-[13px] font-medium uppercase tracking-[0.15em] text-white/80 font-cinzel group-hover:text-white transition-colors">
                  {item.text}
                </span>

                {/* DIVIDER */}
                <div className="flex gap-1">
                   <div className="w-1 h-1 bg-white/20 rotate-45" />
                   <div className="w-1 h-1 bg-[#b91c1c] rotate-45" />
                   <div className="w-1 h-1 bg-white/20 rotate-45" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* STYLES */}
      <style jsx global>{`
        @keyframes data-stream {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }

        .animate-data-stream {
          display: flex;
          width: fit-content;
          animation: data-stream 50s linear infinite;
        }

        .animate-data-stream:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}