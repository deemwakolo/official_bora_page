'use client';

import Header from './components/Header';
import HotThree from './components/HotThree';
import Chart from './components/Chart'; // Your new fused component

export default function Home() {

  const handleVote = (song: string, type: 'up' | 'down') => {
    // Logic for updating the Bora Pulse network
    console.log(`Action: ${type.toUpperCase()} | Target: ${song}`);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased flex flex-col relative overflow-x-hidden">
      
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#D4AF37]/5 blur-[120px] rounded-full opacity-50" />
      </div>

      <Header />

      <div className="relative z-10 flex flex-col gap-16 pb-32">
        
        {/* DISCOVERY LAYER (SLIDER/HIGHLIGHTS) */}
        <section className="mt-6">
          <HotThree />
        </section>

        {/* THE UNIFIED PULSE ENGINE */}
        <section className="w-full relative">
          {/* Section Divider */}
          <div className="flex items-center gap-4 px-6 max-w-6xl mx-auto mb-8">
            <span className="h-[1px] flex-grow bg-gradient-to-r from-transparent to-white/10" />
            <span className="font-mono text-[10px] text-[#D4AF37] uppercase tracking-[0.4em] whitespace-nowrap">
              Bora Pulse Live Ranking
            </span>
            <span className="h-[1px] flex-grow bg-gradient-to-l from-transparent to-white/10" />
          </div>

          {/* This now contains both the Throne and the Podium fused together */}
          <Chart onVote={handleVote} />
          
        </section>

      </div>

      {/* FOOTER STRIP */}
      <footer className="mt-auto py-8 border-t border-white/5 bg-black/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center opacity-30 font-mono text-[8px] uppercase tracking-widest">
          <p>© 2026 MATITU NATION ARCHITECTURE</p>
          <p>DAR ES SALAAM // IRINGA</p>
        </div>
      </footer>

    </main>
  );
}