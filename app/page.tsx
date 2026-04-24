'use client';

export default function Header() {
  return (
    <header className="relative w-full py-10 px-6 overflow-hidden border-b border-white/5">
      {/* Background Watermark Logo */}
      <div className="absolute inset-0 flex items-center justify-center -z-10 select-none pointer-events-none">
        <span className="text-[12rem] font-black text-white/[0.02] italic tracking-tighter">
          BORA
        </span>
      </div>

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h1 className="text-xl font-black uppercase tracking-[0.3em]">
            Bora <span className="text-[#ff3e00]">Music</span> Charts
          </h1>
          <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mt-1">
            Official Matitu Nation Hub • v1.0.0
          </p>
        </div>

        <nav className="flex gap-8">
          {['Official Top 20', 'Fresh Drops', 'News'].map((item) => (
            <a 
              key={item} 
              href="#" 
              className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-[#ff3e00] transition-colors"
            >
              {item}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}