'use client';

import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white border-t border-white/5 py-8 px-6">
      <div className="max-w-7xl mx-auto flex flex-col items-center md:items-stretch">
        
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
              {/* Linked the header to the capitalized folder path */}
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
        <div className="w-12 md:w-full h-[1px] bg-white/5 mt-8 mb-6" />

        {/* COPYRIGHT STRIP */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 w-full">
          <span className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em]">
            © 2026 Matitu Nation // Bora
          </span>
          
          <div className="flex items-center gap-2 opacity-60">
            <div className="w-1 h-1 bg-[#b91c1c] rounded-full animate-pulse" />
            <span className="text-[7px] font-mono text-white/40 uppercase tracking-widest">Active_Node</span>
          </div>
        </div>

      </div>
    </footer>
  );
}