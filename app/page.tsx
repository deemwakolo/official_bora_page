'use client';

import Header from './components/Header';
import HotThree from './components/HotThree';
import Throne from './components/Throne';
import Podium from './components/Podium';

export default function Home() {

  const handleVote = (song: string, type: 'up' | 'down') => {
    console.log(`${type} vote on ${song}`);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased flex flex-col">

      {/* HEADER */}
      <Header />

      {/* STAGE WRAPPER */}
      <div className="flex flex-col gap-14 pb-24">

        {/* HOT THREE — DISCOVERY LAYER */}
        <section className="mt-4">
          <HotThree />
        </section>

        {/* THRONE — AUTHORITY CENTER */}
        <section className="relative">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

          <Throne
            song="Bongo Anthem"
            artist="Davieh G ft Matitu"
            votes="12.4K"
            weeksInChart={12}
            weeksAtNo1={5}
            ytRank="#01"
            spRank="#02"
            bpRank="#01"
            onVote={handleVote}
          />

          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        {/* PODIUM — CONFIRMATION LAYER */}
        <section className="mt-2">
          <Podium onVote={handleVote} />
        </section>

      </div>

    </main>
  );
}