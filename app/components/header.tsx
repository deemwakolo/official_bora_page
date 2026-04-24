'use client';

export default function Header() {
  return (
    <header className="relative w-full py-12 px-6 overflow-hidden border-b border-white/5 bg-[#050505]">
      {/* 1. GOOGLE FONTS LINK (Cinzel) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}} />

      {/* 2. BACKGROUND WATERMARK LOGO
          Using a very low opacity Silver (#C0C0C0) for the layered look.
      */}
      <div className="absolute inset-0 flex items-center justify-center -z-10 select-none pointer-events-none">
        <span className="text-[12rem] md:text-[16rem] font-black text-[#C0C0C0]/[0.03] italic tracking-tighter font-cinzel">
          BORA
        </span>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative">
        
        {/* 3. BRANDING AREA */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="text-2xl font-black uppercase tracking-[0.2em] font-cinzel text-white">
            BORA <span className="text-[#D4AF37]">GOLD</span>
          </h1>
          <p className="text-[9px] font-mono text-[#C0C0C0] uppercase tracking-[0.5em] mt-2">
            Matitu Nation Strategic Hub • <span className="text-[#FF0000]">ALPHA 1.0</span>
          </p>
        </div>

        {/* 4. NAVIGATION
            Hover states use Gold and Red to distinguish importance.
        */}
        <nav className="flex items-center gap-10 font-cinzel">
          <a 
            href="#" 
            className="text-[11px] font-bold uppercase tracking-widest text-white hover:text-[#D4AF37] transition-all duration-300"
          >
            Rankings
          </a>
          <a 
            href="#" 
            className="text-[11px] font-bold uppercase tracking-widest text-white hover:text-[#D4AF37] transition-all duration-300"
          >
            Drops
          </a>
          
          <div className="h-4 w-[1px] bg-white/10 mx-2" />

          <a 
            href="#" 
            className="text-[11px] font-black uppercase tracking-widest text-[#FF0000] hover:text-white transition-all duration-300 border-b border-[#FF0000]/0 hover:border-[#FF0000]"
          >
            Submit
          </a>
        </nav>
      </div>
    </header>
  );
}