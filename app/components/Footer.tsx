'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white border-t border-white/5 py-8 relative overflow-hidden">
      
      {/* TACTICAL ASSET INJECTION: Tinga.png - Enhanced Presence */}
      <div 
        className="absolute bottom-0 left-0 right-0 w-full h-[300px] pointer-events-none z-0"
        style={{ 
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'bottom center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5, // Increased from 0.3 for better visibility
          // Smoother transition to keep the base strong
          WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0) 90%)',
          maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0) 90%)'
        }}
      />

      <div className="max-w-7xl mx-auto flex flex-col items-center md:items-stretch relative z-10 px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left w-full">
          
          {/* BRAND BLOCK */}
          <div className="flex flex-col items-center md:items-start space-y-1">
            <h3 className="text-xl font-black tracking-tighter uppercase italic">
              Matitu<span className="text-[#b91c1c]">Nation</span>
            </h3>
            <p className="text-[8px] text-white/30 uppercase tracking-[0.3em] font-mono leading-tight">
              Creative Strategy // Dar es Salaam
            </p>
          </div>

          {/* NAV LINKS */}
          <div className="flex flex-row gap-8 md:gap-12">
            <div className="flex flex-col items-center md:items-start gap-1.5">
              <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest">Social</span>
              <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                {['Instagram', 'YouTube'].map((link) => (
                  <a key={link} href="#" className="text-[10px] uppercase font-bold text-white/50 hover:text-[#b91c1c] transition-colors">
                    {link}
                  </a>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-start gap-1.5">
              <Link href="/Faq" className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest hover:opacity-70 transition-opacity">
                Explore
              </Link>
              <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                {['Charts', 'Intel'].map((item) => (
                  <Link 
                    key={item} 
                    href={item === 'Intel' ? '/Faq' : '#'} 
                    className="text-[10px] uppercase font-bold text-white/50 hover:text-[#b91c1c] transition-colors"
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* COMPACT DIVIDER */}
        <div className="w-12 md:w-full h-[1px] bg-white/5 mt-8 mb-4" />

        {/* COPYRIGHT STRIP */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-y-4 gap-x-8 w-full py-2">
          <span className="text-[8px] font-mono text-[#b91c1c] uppercase tracking-[0.2em] whitespace-nowrap glow-red">
            © 2026 Matitu Nation // Bora
          </span>
          
          <div className="flex items-center gap-2 opacity-60">
            <div className="w-1 h-1 bg-[#b91c1c] rounded-full animate-pulse" />
            <span className="text-[7px] font-mono text-white/40 uppercase tracking-widest">
              Active_Node
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}