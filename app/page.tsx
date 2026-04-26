'use client';

import Header from './components/Header';
import HotThree from './components/HotThree';
import Chart from './components/Chart';
import Throne from './components/Throne';
import Ticker from './components/Ticker';
import Fresh from './components/Fresh';

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

      {/* ⚡ SYSTEM TICKER */}
      <div className="sticky top-[64px] md:top-[80px] z-40">
        <Ticker />
      </div>

      {/* 👑 THE KING OF THE CHART */}
      <section className="relative z-10 pt-4">
        <Throne />
      </section>

      {/* REMOVED BOTTOM GAPS AND FOOTER FOR A CLEAN INFINITE LOOK */}
      <div className="relative z-10 flex flex-col gap-0 pb-10">
        
        {/* DISCOVERY LAYER */}
        <section className="pt-8 md:pt-12">
          <HotThree />
        </section>

        {/* THE UNIFIED PULSE ENGINE */}
        <section className="w-full relative pt-8 md:pt-12">
          <Chart onVote={handleVote} />
        </section>

        {/* 💎 FRESH PRESS - FINAL SECTION BEFORE FADE OUT */}
        <section className="w-full border-t border-white/5 mt-8 md:mt-12">
          <Fresh />
        </section>

      </div>

    </main>
  );
}