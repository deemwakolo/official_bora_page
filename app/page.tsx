import Image from 'next/image';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 md:p-24 bg-[#050505] text-white font-sans antialiased">
      
      {/* Top Navigation / Header Area */}
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-white/10 bg-black/50 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-white/5 lg:p-4">
          BORA CHARTS&nbsp;
          <code className="font-mono font-bold text-[#ff3e00]">v1.0.0_ALPHA</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-black via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <span className="flex place-items-center gap-2 p-8 lg:p-0 uppercase tracking-widest text-[10px] text-gray-500">
            Powered by <strong className="text-white">Matitu Nation</strong>
          </span>
        </div>
      </div>

      {/* Main Hero / Brand Identity */}
      <div className="relative flex flex-col items-center place-items-center">
        <div className="absolute -z-20 h-[300px] w-[300px] md:w-[600px] bg-[#ff3e00]/20 blur-[120px] rounded-full" />
        
        <h1 className="text-7xl md:text-[12rem] font-black tracking-tighter italic uppercase leading-none select-none">
          BORA
        </h1>
        <p className="text-[#ff3e00] font-mono text-xs tracking-[0.5em] uppercase -mt-4 md:-mt-8 mb-12">
          The Pulse of TZ Music
        </p>
      </div>

      {/* Navigation Grid / Future Features */}
      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left gap-4">
        
        {/* Release Feature */}
        <div className="group rounded-lg border border-white/5 px-5 py-4 transition-all hover:border-[#ff3e00]/50 hover:bg-white/5">
          <h2 className="mb-3 text-2xl font-black uppercase italic text-[#ff3e00]">
            Sielewi{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1">-&gt;</span>
          </h2>
          <p className="m-0 max-w-[30ch] text-xs opacity-50 uppercase tracking-wider leading-relaxed">
            The New Drill Anthem by Zeke.bxt. Dropping 26.04.2026.
          </p>
        </div>

        {/* Chart Feature */}
        <div className="group rounded-lg border border-white/5 px-5 py-4 transition-all hover:border-white/20 hover:bg-white/5">
          <h2 className="mb-3 text-2xl font-black uppercase italic">
            Top 20{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1">-&gt;</span>
          </h2>
          <p className="m-0 max-w-[30ch] text-xs opacity-50 uppercase tracking-wider leading-relaxed">
            Real-time Tanzanian music rankings. Pulses verified.
          </p>
        </div>

        {/* Submit Feature */}
        <div className="group rounded-lg border border-white/5 px-5 py-4 transition-all hover:border-white/20 hover:bg-white/5">
          <h2 className="mb-3 text-2xl font-black uppercase italic">
            Submit{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1">-&gt;</span>
          </h2>
          <p className="m-0 max-w-[30ch] text-xs opacity-50 uppercase tracking-wider leading-relaxed">
            Are you underground? Send your heat to the lab.
          </p>
        </div>

        {/* Studio Feature */}
        <div className="group rounded-lg border border-white/5 px-5 py-4 transition-all hover:border-white/20 hover:bg-white/5">
          <h2 className="mb-3 text-2xl font-black uppercase italic text-gray-500">
            Lab{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1">-&gt;</span>
          </h2>
          <p className="m-0 max-w-[30ch] text-xs opacity-50 uppercase tracking-wider leading-relaxed">
            Exclusive BTS from the Matitu Nation studio.
          </p>
        </div>

      </div>
    </main>
  );
}