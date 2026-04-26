'use client';

import Header from './components/Header';
import HotThree from './components/HotThree';
import Chart from './components/Chart';
import Throne from './components/Throne'; // Assuming you named the new component Throne

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

      {/* 👑 THE KING OF THE CHART */}
      <section className="relative z-10 pt-8">
        <Throne />
      </section>

      <div className="relative z-10 flex flex-col gap-12 md:gap-20 pb-32">
        
        {/* DISCOVERY LAYER (SLIDER) */}
        <section>
          <HotThree />
        </section>

        {/* THE UNIFIED PULSE ENGINE (CHART ONLY) */}
        <section className="w-full relative">
          <Chart onVote={handleVote} />
        </section>

      </div>

    </main>
  );
}