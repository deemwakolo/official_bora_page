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
          backgroundImage: `linear-gradient(to right, rgba(255, 0, 0, 0.2) 0%, #050505 40%, #050505 60%, rgba(255, 0, 0, 0.2) 100%), url('/assets/kitenge.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'luminosity',
        }}
      />

      {/* 3. LAYER 2: LOGO BEHIND TEXT (Reduced for mobile) */}
      <div className="absolute inset-0 flex items-center justify-center z-0 select-none pointer-events-none opacity-[0.2]">
        <div className="w-[120px] h-[120px] md:w-[160px] md:h-[160px] relative">
          <Image 
            src="/assets/logo.png" 
            alt="Bora Logo Watermark" 
            fill
            priority
            className="object-contain"
          />
        </div>
      </div>

      {/* 4. MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 flex flex-col items-center relative z-10">
        
        {/* THE TYPOGRAPHY (Responsive Sizes) */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-3xl md:text-6xl font-black tracking-[0.15em] md:tracking-[0.25em] font-cinzel text-white leading-none drop-shadow-[0_8px_12px_rgba(0,0,0,1)]">
            BORA <span className="text-[#D4AF37]">CHARTS</span>
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-[1px] w-8 md:w-10 bg-gradient-to-r from-transparent to-[#D4AF37]" />
            <p className="text-[8px] md:text-[9px] font-cinzel tracking-[0.3em] md:tracking-[0.4em] text-[#C0C0C0] uppercase font-bold">
              The Gold Standard
            </p>
            <div className="h-[1px] w-8 md:w-10 bg-gradient-to-l from-transparent to-[#D4AF37]" />
          </div>
        </div>

        {/* 5. SYMMETRICAL NAVIGATION (Fixed for Mobile)
            - Changed 'flex-row' to 'flex-wrap'
            - Changed 'justify-around' to 'justify-center'
            - Added 'gap' for consistent spacing on small screens
        */}
        <nav className="w-full max-w-xl border-t border-white/10 pt-6">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 md:justify-around font-cinzel">
            {['Top 20', 'Drops', 'News'].map((item) => (
              <li key={item} className="text-center">
                <a 
                  href="#" 
                  className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] text-white/60 hover:text-[#D4AF37] transition-all duration-300 whitespace-nowrap"
                >
                  {item === 'Official Top 20' ? 'Top 20' : item === 'Fresh Drops' ? 'Drops' : item === 'News Bulletin' ? 'News' : item}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* 6. BOTTOM ACCENT LINE */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF0000]/70 to-transparent" />
    </header>
  );
}