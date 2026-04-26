'use client';

import React, { useState } from 'react';

const faqData = [
  {
    id: "01",
    question: "WHAT IS MATITU NATION?",
    answer: "Matitu Nation is an independent creative studio and asset house founded in Dar es Salaam. We specialize in creative strategy, music production (Bongo Flava, Afrobeat, Drill, Trap), and visual identity architecture for artists who want to turn their vision into ownership."
  },
  {
    id: "02",
    question: "WHAT IS THE BORA ENGINE?",
    answer: "Bora is our proprietary framework used to engineer sonic and visual identity. It powers our 'Bora Tanzanian Music Charts' and serves as the intelligence layer for all our strategic rollouts, ensuring that every asset we release has a data-driven purpose."
  },
  {
    id: "03",
    question: "WHO IS ZEKE.BXT?",
    answer: "Zeke.bxt is the urban-themed producer alter ego within the Matitu ecosystem. Known for the signature lime-green balaclava and heavy sonic textures, Zeke handles the experimental and high-energy production side of the studio."
  },
  {
    id: "04",
    question: "HOW CAN I COLLABORATE?",
    answer: "We operate on a 'Vision-to-Asset' model. Whether you need a full sonic identity, specialized mixing and mastering in FL Studio, or a visual brand rollout, you can reach out via our social data ports for a briefing."
  }
];

const credits = [
  { role: "Executive Architect", name: "Dee" },
  { role: "Production Node", name: "Matitu Audio Lab" },
  { role: "Systems Logic", name: "Bora Intel" },
  { role: "Location", name: "Dar es Salaam, TZ" },
  { role: "Build Version", name: "v2.0.26_STABLE" }
];

export default function FaqPage() {
  const [activeId, setActiveId] = useState<string | null>("01");

  return (
    // Reduced pt-32 to pt-16
    <main className="min-h-screen bg-[#050505] text-white pt-16 pb-20 px-6 overflow-hidden relative">
      {/* BACKGROUND ACCENT */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#b91c1c]/5 blur-[120px] rounded-full -z-10" />
      
      <div className="max-w-6xl mx-auto">
        
        {/* PAGE HEADER - Reduced mb-20 to mb-12 */}
        <div className="mb-12 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-12 bg-[#D4AF37]" />
            <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-[0.5em]">System_Information</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none">
            INTEL <span className="text-[#b91c1c] font-sans not-italic">&</span> FAQ
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          
          {/* LEFT: FAQ ACCORDION */}
          <div className="lg:col-span-7">
            <div className="space-y-2">
              {faqData.map((item) => (
                <div 
                  key={item.id}
                  className={`border-b border-white/5 transition-all duration-500 ${activeId === item.id ? 'bg-white/[0.02]' : ''}`}
                >
                  <button 
                    onClick={() => setActiveId(activeId === item.id ? null : item.id)}
                    className="w-full py-8 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-[10px] font-mono text-[#b91c1c] opacity-50">{item.id}</span>
                      <h3 className="text-sm md:text-lg font-bold tracking-widest uppercase text-left group-hover:text-[#D4AF37] transition-colors">
                        {item.question}
                      </h3>
                    </div>
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${activeId === item.id ? 'bg-[#D4AF37] scale-150 shadow-[0_0_10px_#D4AF37]' : 'bg-white/10'}`} />
                  </button>

                  <div className={`overflow-hidden transition-all duration-500 ease-in-out ${activeId === item.id ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <p className="pl-10 pr-6 pb-8 text-xs md:text-sm text-white/40 font-sans leading-relaxed italic border-l-2 border-[#b91c1c]/30 ml-[10px] mb-4">
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: CREDITS & STATS */}
          <div className="lg:col-span-5 space-y-12">
            
            {/* BRAND STATS CARD */}
            <div className="p-8 border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 text-[8px] font-mono text-white/10">BORA_SECURED</div>
              <h4 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.3em] mb-6">Studio_Credits</h4>
              
              <div className="space-y-4">
                {credits.map((credit, i) => (
                  <div key={i} className="flex justify-between items-baseline border-b border-white/5 pb-2 group-hover:border-white/10 transition-colors">
                    <span className="text-[9px] font-mono text-white/20 uppercase">{credit.role}</span>
                    <span className="text-[11px] font-black uppercase tracking-wider">{credit.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* STATUS MESSAGE */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-[#b91c1c] rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Global Node Active</span>
              </div>
              <p className="text-[10px] text-white/30 font-mono leading-relaxed">
                ESTABLISHED 2025 // MATITU NATION OPERATES AS A MULTIMODAL CREATIVE HUB. 
                ALL ASSETS ARCHITECTED FOR PERMANENCE.
              </p>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}