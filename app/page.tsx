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

      {/* HOT THREE (DISCOVERY ZONE - FIRST IMPACT) */}
      <div className="pt-6">
        <HotThree />
      </div>

      {/* THRONE (MAIN AUTHORITY CENTER) */}
      <div className="mt-8">
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
      </div>

      {/* PODIUM (ELITE CONFIRMATION LAYER) */}
      <div className="mt-8 pb-20">
        <Podium onVote={handleVote} />
      </div>

    </main>
  );
}