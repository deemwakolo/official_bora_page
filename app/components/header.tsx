'use client';

import Image from 'next/image';

export default function Header() {
  return (
    <header className="relative w-full py-12 px-6 md:px-12 overflow-hidden border-b border-white/5 bg-[#050505]">
      
      {/* 1. CINZEL FONT IMPORT */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}} />

      {/* 2. DUAL BACKGROUND LAYER
          Layer A: The Kitenge Pattern (Limited and low opacity)
          Layer B: The Gradient (Fades the pattern into Obsidian)
      */}
      <div className="absolute inset-0 z-[-20] flex">
        {/* The Kitenge pattern, gradienting beautifully on the left */}
        <div 
          className="w-1/2 h-full opacity-[0.04]"
          style={{
            backgroundImage: `url('/public-assets/kitenge.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)', // Fades pattern
            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)', // Webkit support
          }}
        />
        {/* The solid Obsidian fill on the right */}
        <div className="w-1/2 h-full bg-[#050505]" />
      </div>

      {/* 3. LOGO BEHIND TEXT WATERMARK
          Using the specific 'logo.png' provided, layered ghost-style.
      */}
      <div className="absolute inset-0 flex items-center justify-center z-[-10] select-none pointer-events-none opacity-[0.03]">
        <Image 
          src="/public-assets/logo.png" 
          alt="Bora Watermark" 
          width={400} // Large for watermark feel
          height={400}
          className="grayscale" // Optional: makes logo match silver/gold theme
        />
      </div>

      {/* 4. MAIN HEADER CONTENT */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative">
        
        {/* A. BRANDING AREA */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="text-3xl font-black uppercase tracking-[0.2em] font-cinzel text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            Bora <span className="text-[#D4AF37]">Gold</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-[1px] w-4 bg-[#D4AF37]" />
            <p className="text-[9px] font-mono text-[#C0C0C0] uppercase tracking-[0.5em]">
              Matitu Nation • Strategic Hub • <span className="text-[#FF0000]">ALPHA 1.0</span>
            </p>
          </div>
        </div>

        {/* B. NAVIGATION (Silver & Gold Accents) */}
        <nav className="flex items-center gap-10 font-cinzel relative z-10">
          {['Official Top 20', 'Fresh Drops', 'News Bulletin'].map((item) => (
            <a 
              key={item} 
              href="#" 
              className="text-[11px] font-bold uppercase tracking-widest text-white hover:text-[#D4AF37] transition-all duration-300"
            >
              {item}
            </a>
          ))}
          
          <div className="h-4 w-[1px] bg-[#C0C0C0]/20 mx-2" />

          <a 
            href="#" 
            className="text-[11px] font-black uppercase tracking-widest text-[#FF0000] hover:text-white transition-all duration-300 border border-[#FF0000] px-4 py-1.5 hover:bg-[#FF0000] hover:border-transparent"
          >
            Submit
          </a>
        </nav>
      </div>
    </header>
  );
}