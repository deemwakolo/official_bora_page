'use client';

import React, { useState } from 'react';

// Data strictly typed for stability
interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface CreditItem {
  role: string;
  name: string;
}

const faqData: FaqItem[] = [
  {
    id: "01",
    question: "WHAT IS MATITU NATION?",
    answer:
      "Matitu Nation is an independent creative studio and asset house founded in Dar es Salaam. We specialize in creative strategy, music production (Bongo Flava, Afrobeat, Drill, Trap), and visual identity architecture for artists who want to turn their vision into ownership."
  },
  {
    id: "02",
    question: "WHAT IS THE BORA ENGINE?",
    answer:
      "Bora is our proprietary framework used to engineer sonic and visual identity. It powers our charts and acts as the intelligence layer for all strategic creative rollouts."
  },
  {
    id: "03",
    question: "WHO IS ZEKE.BXT?",
    answer:
      "Zeke.bxt is the experimental production identity inside Matitu Nation, responsible for heavy textures, dark sonic design, and visual-led sound branding."
  },
  {
    id: "04",
    question: "HOW CAN I COLLABORATE?",
    answer:
      "We operate on a Vision-to-Asset model. You submit intent, we translate it into structured creative output across sound, visuals, and strategy."
  }
];

const credits: CreditItem[] = [
  { role: "Executive Architect", name: "Dee" },
  { role: "Production Node", name: "Matitu Audio Lab" },
  { role: "Systems Logic", name: "Bora Intel" },
  { role: "Location", name: "Dar es Salaam, TZ" },
  { role: "Build Version", name: "v2.0.26_STABLE" }
];

export default function FaqPage() {
  const [activeId, setActiveId] = useState<string | null>("01");

  const toggle = (id: string): void => {
    setActiveId(prev => (prev === id ? null : id));
  };

  // Logic block before return (Ensure this stays clean)
  const sortedFaq = [...faqData]; 

  return (
    <main className="min-h-screen bg-[#050505] text-white pt-16 pb-20 px-6 relative overflow-hidden selection:bg-[#D4AF37] selection:text-black antialiased">
      
      {/* BACKGROUND DEPTH */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#b91c1c]/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#D4AF37]/5 blur-[100px] rounded-full -z-10" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* HEADER SECTION */}
        <header className="mb-16 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-[1px] w-12 bg-[#D4AF37]" />
            <span className="text-[10px] font-mono text-[#D4AF37] uppercase tracking-[0.5em] font-bold">
              System_Information
            </span>
          </div>

          <h1 className="text-5xl md:text-8xl font-black italic tracking-tighter uppercase leading-none">
            INTEL <span className="text-[#b91c1c]"> & </span> FAQ
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

          {/* FAQ INTERFACE */}
          <div className="lg:col-span-7 space-y-2">
            {sortedFaq.map((item) => {
              const isOpen = activeId === item.id;

              return (
                <div key={item.id} className="border-b border-white/5">
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-full py-8 flex items-center justify-between group outline-none"
                  >
                    <div className="flex items-center gap-6">
                      <span className="text-[10px] font-mono text-[#b91c1c]/60 font-bold">
                        {item.id}
                      </span>

                      <h3 className="text-sm md:text-lg font-bold tracking-widest uppercase group-hover:text-[#D4AF37] transition-all duration-300 text-left">
                        {item.question}
                      </h3>
                    </div>

                    <div
                      className={`w-2 h-2 rounded-full transition-all duration-500 ${
                        isOpen
                          ? "bg-[#D4AF37] scale-150 shadow-[0_0_15px_#D4AF37]"
                          : "bg-white/10"
                      }`}
                    />
                  </button>

                  {/* ACCORDION CONTENT */}
                  <div
                    className={`grid transition-all duration-500 ease-in-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100 mb-8"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pl-10 pr-6 border-l-2 border-[#b91c1c]/30 ml-[10px]">
                        <p className="text-xs md:text-sm text-white/50 leading-relaxed italic">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* STUDIO CREDITS SIDEBAR */}
          <aside className="lg:col-span-5 space-y-12">
            <div className="p-8 border border-white/10 bg-white/[0.02] backdrop-blur-sm relative overflow-hidden group">
              {/* Decorative corner */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t border-r border-[#D4AF37]/30" />
              
              <h4 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.3em] mb-8">
                Studio_Credits
              </h4>

              <div className="space-y-5">
                {credits.map((c, i) => (
                  <div key={i} className="flex justify-between items-end border-b border-white/5 pb-2">
                    <span className="text-[9px] font-mono text-white/30 uppercase font-bold">
                      {c.role}
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider">
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 px-2">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-[#b91c1c] rounded-full animate-pulse shadow-[0_0_10px_#b91c1c]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/80">
                  Global Node Active
                </span>
              </div>

              <div className="p-4 border-l border-white/10">
                <p className="text-[10px] text-white/40 font-mono leading-relaxed uppercase italic">
                  Matitu Nation operates as a multimodal creative hub. <br /> 
                  All systems operating within defined parameters.
                </p>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </main>
  );
}