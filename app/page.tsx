'use client';

// Matching your lowercase file name
import Header from './components/header'; 

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased flex flex-col font-sans">
      
      {/* 1. CINZEL FONT IMPORT */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}} />

      {/* 2. THE HEADER COMPONENT */}
      <Header />

      {/* 3. PURE OBSIDIAN CONTENT AREA 
          All junk, footers, and grids removed. 
          Ready for the store content.
      */}
      <div className="flex-grow bg-[#050505]" />

    </main>
  );
}