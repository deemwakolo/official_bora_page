'use client';

import Image from 'next/image';

export default function Header() {
  return (
    <header className="relative w-full bg-[#050505] overflow-hidden border-b border-[#D4AF37]/20">
      
      {/* 1. CINZEL FONT IMPORT */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}} />

      {/* 2. LAYER 1: KITENGE GRADIENT */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(255, 0, 0, 0.15) 0%, #050505 40%, #050505 60%, rgba(255, 0, 0, 0.15) 100%), url('/assets/kitenge.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'luminosity',
        }}
      />

      {/* 3. MAIN CONTENT (Forced Centering) */}
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6 flex flex-col items-center justify-center relative z-10">
        
        {/* THE TYPOGRAPHY (Perfectly Centered) */}
        <div className="flex flex-col items-center text-center mb-2 md:mb-4">
          <h1 className="text-4xl md:text-7xl font-black tracking-[0.25em] font-cinzel text-white leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,1)]">
            BORA <span className="text-[#D4AF37]">CHARTS</span>
          </h1>
          
          <div className="flex items-center justify-center gap-3 mt-1">
            <div className="h-[1px] w-10 md:w-16 bg-[#D4AF37]/60" />
            <p className="text-[10px] md:text-[12px] font-cinzel tracking-[0.5em] text-[#C0C0C0] uppercase font-bold">
              The Gold Standard
            </p>
            <div className="h-[1px] w-10 md:w-16 bg-[#D4AF37]/60" />
          </div>
        </div>

        {/* 4. NAVIGATION (Forced Centering) */}
        <nav className="w-full max-w-xl border-t border-white/10 pt-3">
          <ul className="flex items-center justify-center gap-x-10 md:gap-x-16 font-cinzel w-full">
            {['Top 20', 'Drops', 'News'].map((item) => (
              <li key={item}>
                <a 
                  href="#" 
                  className="text-[10px] md:text-[13px] font-black uppercase tracking-[0.2em] text-white/70 hover:text-[#D4AF37] transition-all duration-300"
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* 5. BOTTOM ACCENT LINE */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF0000]/70 to-transparent" />
    </header>
  );
}