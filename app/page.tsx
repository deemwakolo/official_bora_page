'use client';

import Header from './components/Header';
import HotThree from './components/HotThree';
import Throne from './components/Throne';

export default function Home() {

  const handleVote = (song: string, type: 'up' | 'down') => {
    console.log(`${type} vote on ${song}`);
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased flex flex-col">

      {/* HEADER */}
      <Header />

      {/* THRONE (MAIN AUTHORITY LAYER) */}
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

      {/* CONTENT */}
      <div className="flex-grow pt-10 pb-20">

        {/* HOT THREE */}
        <HotThree />

      </div>

    </main>
  );
}