'use client';

import Header from './components/Header';
import HotThree from './components/HotThree';
import Chart from './components/Chart';

export default function Home() {

  const handleVote = (song: string, type: 'up' | 'down') => {
    // This logs the vote action—ready to be connected to your DB
    console.log(`BORA PULSE ACTION: ${type.toUpperCase()} | TARGET: ${song}`);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased flex flex-col relative overflow-x-hidden selection:bg-[#D4AF37] selection:text-black">
      
      {/* AMBIENT BACKGROUND GLOW - Optimized for performance */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-[#D4AF37]/5 blur-[140px] rounded-full" />
      </div>

      <Header />

      <div className="relative z-10 flex flex-col gap-12 md:gap-20 pb-32">
        
        {/* DISCOVERY LAYER */}
        <section className="mt-8">
          <HotThree />
        </section>

        {/* THE UNIFIED PULSE ENGINE */}
        <section className="w-full relative">
          {/* Section Divider Architecture */}
          <div className="flex items-center gap-6 px-6 max-w-6xl mx-auto mb-12">
            <div className="h-[1px] flex-grow bg-gradient-to-r from-transparent via-white/10 to-white/10" />
            <div className="flex flex-col items-center">
              <span className="font-cinzel text-[10px] text-[#D4AF37] uppercase tracking-[0.5em] font-black">
                The Throne
              </span>
              <span className="text-[7px] text-white/20 font-mono uppercase tracking-[0.3em] mt-1">
                Live Pulse Monitoring
              </span>
            </div>
            <div className="h-[1px] flex-grow bg-gradient-to-l from-transparent via-white/10 to-white/10" />
          </div>

          {/* Unified Chart Component */}
          <Chart onVote={handleVote} />
          
        </section>

      </div>

      {/* FOOTER STRIP */}
      <footer className="mt-auto py-10 border-t border-white/5 bg-black/80 backdrop-blur-xl relative z-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start opacity-30">
             <p className="font-mono text-[8px] uppercase tracking-[0.4em]">© 2026 MATITU NATION ARCHITECTURE</p>
             <p className="font-mono text-[7px] uppercase tracking-[0.2em] mt-1">Designed in Dar Es Salaam // Iringa</p>
          </div>
          
          <div className="flex gap-6 opacity-20 hover:opacity-50 transition-opacity">
             <div className="h-4 w-[1px] bg-white" />
             <div className="h-4 w-[1px] bg-white" />
             <div className="h-4 w-[1px] bg-white" />
          </div>
        </div>
      </footer>

    </main>
  );
}