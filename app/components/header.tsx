'use client';

import Image from 'next/image';

export default function Header() {
  return (
    <header className="relative w-full py-14 px-6 md:px-12 overflow-hidden border-b border-white/5 bg-[#050505]">
      
      {/* CINZEL FONT IMPORT */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}} />

      {/* BACKGROUND LAYER: KITENGE GRADIENT */}
      <div 
        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(5, 5, 5, 0) 0%, #050505 80%), url('/assets/kitenge.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* LOGO WATERMARK ADJUSTED: 
          - Size reduced to 320px
          - Opacity increased to 15% (0.15) to make it obvious
      */}
      <div className="absolute inset-0 flex items-center justify-center z-0 select-none pointer-events-none opacity-[0.15]">
        <Image 
          src="/assets/logo.png" 
          alt="Bora Logo Watermark" 
          width={320} 
          height={320}
          priority
          className="grayscale brightness-125"
        />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
        
        {/* BRANDING AREA */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-[0.15em] font-cinzel text-white drop-shadow-[0_4px_4px_rgba(0,0,0,1)]">
            Bora <span className="text-[#D4AF37]">Music</span> Store
          </h1>
          <div className="flex items-center gap-3 mt-3">
            <span className="h-[1px] w-8 bg-[#D4AF37]" />
            <p className="text-[10px] font-mono text-[#C0C0C0] uppercase tracking-[0.4em] font-bold">
              Matitu Nation Hub • <span className="text-[#FF0000]">v1.0 Alpha</span>
            </p>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="flex items-center gap-8 md:gap-12 font-cinzel">
          {['Official Top 20', 'Fresh Drops', 'News'].map((item) => (
            <a 
              key={item} 
              href="#" 
              className="text-[11px] font-bold uppercase tracking-widest text-white/70 hover:text-[#D4AF37] transition-all duration-300"
            >
              {item}
            </a>
          ))}
          
          <div className="hidden md:block h-5 w-[1px] bg-[#C0C0C0]/20" />

          <a 
            href="#" 
            className="text-[11px] font-black uppercase tracking-widest text-[#FF0000] border border-[#FF0000]/30 px-6 py-2 hover:bg-[#FF0000] hover:text-white transition-all duration-300"
          >
            Submit
          </a>
        </nav>
      </div>
    </header>
  );
}