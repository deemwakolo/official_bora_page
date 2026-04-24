'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="relative w-full py-6 px-4 md:px-8 border-b border-white/5 overflow-hidden">
      {/* 1. SUBTLE KITENGE TEXTURE
          This gives it that Tanzanian cultural edge without being distracting.
      */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url('https://www.transparenttextures.com/patterns/p6.png')`, // Subtle pattern placeholder
          backgroundRepeat: 'repeat',
        }}
      />

      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center relative">
        
        {/* 2. THE WATERMARK LOGO
            Large 'B' positioned behind the text for that layered, architectural look.
        */}
        <div className="absolute -z-10 text-[120px] md:text-[160px] font-black text-white/[0.03] select-none leading-none -top-10 italic">
          BORA
        </div>

        {/* 3. CENTERED TYPOGRAPHY */}
        <div className="text-center mb-6">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-[0.4em] text-white">
            Bora <span className="text-[#ff3e00]">Music</span> Charts
          </h1>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mt-1">
            Official Matitu Nation Hub
          </p>
        </div>

        {/* 4. STREAMLINED NAVIGATION */}
        <nav className="flex items-center gap-6 md:gap-12">
          <Link 
            href="#" 
            className="text-[10px] font-bold uppercase tracking-widest text-white hover:text-[#ff3e00] transition-colors"
          >
            Official Top 20
          </Link>
          <Link 
            href="#" 
            className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            Fresh Drops
          </Link>
          <Link 
            href="#" 
            className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            News Bulletin
          </Link>
        </nav>
      </div>
    </header>
  );
}