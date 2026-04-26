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
      
      {/* AMBIENT BACKGROUND GLOW */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-[#D4AF37]/5 blur-[140px] rounded-full" />
      </div>

      <Header />

      <div className="relative z-10 flex flex-col gap-12 md:gap-20 pb-32">
        
        {/* DISCOVERY LAYER (SLIDER) */}
        <section className="mt-8">
          <HotThree />
        </section>

        {/* THE UNIFIED PULSE ENGINE (CHART ONLY) */}
        <section className="w-full relative">
          {/* The heading and divider architecture have been removed 
              to allow the Chart to speak for itself.
          */}
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