import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#050505] text-white antialiased selection:bg-[#D4AF37] selection:text-black">
      
      {/* 1. GOOGLE FONTS LINK (Cinzel) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}} />

      {/* 2. TOP STATUS BAR (Silver Accent) */}
      <div className="w-full bg-[#C0C0C0] py-1 text-black text-[10px] font-bold uppercase tracking-[0.4em] text-center font-cinzel">
        Official Bora Music Charts • Matitu Nation Premium
      </div>

      {/* 3. THE LUXURY HEADER */}
      <header className="w-full max-w-7xl px-8 py-12 flex flex-col md:flex-row items-center justify-between border-b border-white/5">
        <div className="flex flex-col items-center md:items-start mb-8 md:mb-0">
          <h1 className="text-3xl font-black uppercase tracking-widest font-cinzel">
            BORA <span className="text-[#D4AF37]">GOLD</span>
          </h1>
          <p className="text-[9px] font-mono text-[#C0C0C0] uppercase tracking-[0.5em] mt-2">
            Matitu Nation Strategic Division
          </p>
        </div>

        <nav className="flex gap-10 items-center font-cinzel">
          <a href="#" className="text-[11px] font-bold uppercase tracking-widest hover:text-[#D4AF37] transition-all">Rankings</a>
          <a href="#" className="text-[11px] font-bold uppercase tracking-widest hover:text-[#FF0000] transition-all">Submit</a>
          <button className="border border-[#D4AF37] text-[#D4AF37] px-6 py-2 text-[10px] font-bold uppercase hover:bg-[#D4AF37] hover:text-black transition-all">
            Enter Lab
          </button>
        </nav>
      </header>

      {/* 4. HERO SECTION (Gold & Red Aura) */}
      <section className="relative flex flex-col items-center justify-center py-32 md:py-52 w-full overflow-hidden">
        {/* Layered Glimmer Effect */}
        <div className="absolute -z-10 h-[400px] w-[400px] bg-[#D4AF37]/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute -z-10 h-[200px] w-[600px] bg-[#FF0000]/5 blur-[100px] rounded-full translate-y-20" />
        
        <h2 className="text-8xl md:text-[16rem] font-black tracking-tighter uppercase leading-none select-none font-cinzel text-white drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">
          BORA
        </h2>
        <p className="text-[#D4AF37] font-cinzel text-sm tracking-[0.8em] uppercase -mt-4 md:-mt-12 mb-16 font-bold">
          The Pulse <span className="text-white">of</span> TZ Music
        </p>
      </section>

      {/* 5. ELITE CONTENT GRID */}
      <div className="grid w-full max-w-7xl grid-cols-1 md:grid-cols-3 gap-[1px] bg-white/5 border-y border-white/5">
        
        {/* Red Accent Card */}
        <div className="group relative bg-[#080808] p-12 transition-all hover:bg-black cursor-pointer">
          <span className="text-[#FF0000] font-cinzel text-[10px] font-bold tracking-widest">01 / CURRENT HEAT</span>
          <h3 className="mt-6 text-4xl font-black uppercase font-cinzel text-white group-hover:text-[#D4AF37] transition-colors">SIELEWI</h3>
          <p className="mt-4 text-[10px] text-[#C0C0C0] uppercase tracking-widest leading-loose font-sans">
            The masterpiece by Zeke.bxt. <br />Engineered for supremacy.
          </p>
          <div className="mt-8 h-[2px] w-0 bg-[#FF0000] transition-all group-hover:w-full" />
        </div>

        {/* Gold Accent Card */}
        <div className="group relative bg-[#080808] p-12 transition-all hover:bg-black cursor-pointer">
          <span className="text-[#D4AF37] font-cinzel text-[10px] font-bold tracking-widest">02 / THE RANKINGS</span>
          <h3 className="mt-6 text-4xl font-black uppercase font-cinzel text-white group-hover:text-[#D4AF37] transition-colors">TOP 20</h3>
          <p className="mt-4 text-[10px] text-[#C0C0C0] uppercase tracking-widest leading-loose font-sans">
            Curated metrics. <br />The definitive industry standard.
          </p>
          <div className="mt-8 h-[2px] w-0 bg-[#D4AF37] transition-all group-hover:w-full" />
        </div>

        {/* Silver Accent Card */}
        <div className="group relative bg-[#080808] p-12 transition-all hover:bg-black cursor-pointer">
          <span className="text-[#C0C0C0] font-cinzel text-[10px] font-bold tracking-widest">03 / THE FOUNDATION</span>
          <h3 className="mt-6 text-4xl font-black uppercase font-cinzel text-white group-hover:text-[#D4AF37] transition-colors">LAB</h3>
          <p className="mt-4 text-[10px] text-[#C0C0C0] uppercase tracking-widest leading-loose font-sans">
            Matitu Nation Studios. <br />Where the brand becomes sound.
          </p>
          <div className="mt-8 h-[2px] w-0 bg-[#C0C0C0] transition-all group-hover:w-full" />
        </div>

      </div>

      {/* 6. FOOTER (Cinematic) */}
      <footer className="w-full py-20 flex flex-col items-center">
        <div className="w-12 h-[1px] bg-[#D4AF37] mb-8" />
        <p className="text-[11px] font-bold uppercase tracking-[0.6em] text-[#C0C0C0] font-cinzel">
          Design <span className="text-white">by</span> Matitu Nation
        </p>
        <p className="mt-4 text-[8px] text-gray-700 tracking-widest font-mono uppercase">
          Obsidian Edition © 2026
        </p>
      </footer>

    </main>
  );
}