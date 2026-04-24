import Header from './components/Header';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050505] text-white antialiased selection:bg-[#D4AF37] selection:text-black flex flex-col">
      {/* 1. CINZEL FONT IMPORT FOR PAGE LOGIC */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}} />

      {/* 2. SHARED HEADER */}
      <Header />

      <div className="flex-grow flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Luxury Background Glows */}
        <div className="absolute -z-10 h-[500px] w-[500px] bg-[#D4AF37]/5 blur-[120px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute -z-10 h-[300px] w-[800px] bg-[#FF0000]/5 blur-[100px] rounded-full bottom-0" />

        {/* 3. HERO IDENTITY */}
        <div className="relative flex flex-col items-center text-center mb-24">
          <h2 className="text-8xl md:text-[15rem] font-black tracking-tighter uppercase leading-none select-none font-cinzel text-white drop-shadow-2xl">
            BORA
          </h2>
          <div className="flex items-center gap-4 -mt-4 md:-mt-10">
            <span className="h-[1px] w-12 bg-[#D4AF37]" />
            <p className="text-[#D4AF37] font-cinzel text-sm tracking-[0.8em] uppercase font-bold">
              The Pulse <span className="text-white">of</span> TZ Music
            </p>
            <span className="h-[1px] w-12 bg-[#D4AF37]" />
          </div>
        </div>

        {/* 4. PREMIUM NAVIGATION GRID */}
        <div className="grid w-full max-w-7xl grid-cols-1 md:grid-cols-4 gap-px bg-white/5 border border-white/5">
          
          {/* Release Feature (Red/Gold Accent) */}
          <div className="group relative bg-[#080808] p-10 transition-all hover:bg-black cursor-pointer overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-0 bg-[#FF0000] transition-all group-hover:h-full" />
            <span className="text-[#FF0000] font-cinzel text-[10px] font-bold tracking-widest">01 / FEATURED</span>
            <h3 className="mt-6 text-2xl font-black uppercase font-cinzel text-white group-hover:text-[#D4AF37] transition-colors">
              SIELEWI
            </h3>
            <p className="mt-4 text-[10px] text-[#C0C0C0] uppercase tracking-[0.2em] leading-relaxed font-sans">
              Zeke.bxt Drill Evolution. <br />Dropping 26.04.2026.
            </p>
          </div>

          {/* Chart Feature (Gold Accent) */}
          <div className="group relative bg-[#080808] p-10 transition-all hover:bg-black cursor-pointer overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-0 bg-[#D4AF37] transition-all group-hover:h-full" />
            <span className="text-[#D4AF37] font-cinzel text-[10px] font-bold tracking-widest">02 / RANKINGS</span>
            <h3 className="mt-6 text-2xl font-black uppercase font-cinzel text-white group-hover:text-[#D4AF37] transition-colors">
              TOP 20
            </h3>
            <p className="mt-4 text-[10px] text-[#C0C0C0] uppercase tracking-[0.2em] leading-relaxed font-sans">
              The definitive standard <br />for Tanzanian sound.
            </p>
          </div>

          {/* Submit Feature (Silver Accent) */}
          <div className="group relative bg-[#080808] p-10 transition-all hover:bg-black cursor-pointer overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-0 bg-[#C0C0C0] transition-all group-hover:h-full" />
            <span className="text-[#C0C0C0] font-cinzel text-[10px] font-bold tracking-widest">03 / SUBMIT</span>
            <h3 className="mt-6 text-2xl font-black uppercase font-cinzel text-white group-hover:text-[#D4AF37] transition-colors">
              THE LAB
            </h3>
            <p className="mt-4 text-[10px] text-[#C0C0C0] uppercase tracking-[0.2em] leading-relaxed font-sans">
              Send your heat to <br />the Matitu Engineers.
            </p>
          </div>

          {/* Studio Feature (Industrial Accent) */}
          <div className="group relative bg-[#080808] p-10 transition-all hover:bg-black cursor-pointer overflow-hidden opacity-60 hover:opacity-100">
            <div className="absolute top-0 left-0 w-1 h-0 bg-white/20 transition-all group-hover:h-full" />
            <span className="text-gray-600 font-cinzel text-[10px] font-bold tracking-widest">04 / ARCHIVE</span>
            <h3 className="mt-6 text-2xl font-black uppercase font-cinzel text-gray-400 group-hover:text-white transition-colors">
              BEYOND
            </h3>
            <p className="mt-4 text-[10px] text-gray-600 uppercase tracking-[0.2em] leading-relaxed font-sans">
              Behind the scenes <br />of Matitu Nation.
            </p>
          </div>

        </div>
      </div>

      {/* 5. CINEMATIC FOOTER */}
      <footer className="w-full py-16 border-t border-white/5 flex flex-col items-center bg-black">
        <div className="w-16 h-[1px] bg-[#D4AF37] mb-8" />
        <p className="text-[10px] font-bold uppercase tracking-[0.6em] text-[#C0C0C0] font-cinzel italic">
          Designed by <span className="text-white">Matitu Nation</span>
        </p>
        <p className="mt-4 text-[8px] text-gray-800 tracking-[0.3em] font-mono uppercase">
          Obsidian Edition • Dar es Salaam • 2026
        </p>
      </footer>
    </main>
  );
}