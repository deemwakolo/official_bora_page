'use client';

import Header from './components/header'; 
import HotThree from './components/HotThree';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased flex flex-col font-cinzel">
      
      {/* 1. HEADER COMPONENT 
          Now safe from hydration mismatches.
      */}
      <Header />

      {/* 2. CONTENT AREA 
          The 'flex-grow' ensures the obsidian background fills the viewport.
      */}
      <div className="flex-grow bg-[#050505] pt-10 pb-20">
        
        {/* THE "HOT THREE" HORIZONTAL DECK */}
        <HotThree />

      </div>

    </main>
  );
}