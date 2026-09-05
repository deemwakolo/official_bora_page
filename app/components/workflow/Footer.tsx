'use client';

import React from 'react';
import {
  Instagram,
  Facebook,
  MessageCircle,
  Music2,
} from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full bg-black text-white border-t border-white/5 py-5 relative overflow-hidden">

      {/* TINGA TEXTURE */}
      <div
        className="absolute bottom-0 left-0 right-0 w-full h-[250px] pointer-events-none z-0"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'bottom center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5,
          WebkitMaskImage:
            'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0) 90%)',
          maskImage:
            'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0) 90%)',
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10 px-6">

        {/* BRAND */}
        <div className="flex flex-col items-center text-center">

          <h3 className="text-lg font-black tracking-tighter uppercase italic">
            BORA<span className="text-[#D4AF37]">.</span>
          </h3>

          <p className="mt-1 text-[8px] text-[#b91c1c] uppercase tracking-[0.3em] font-mono">
            BORA SOFTWARES
          </p>

        </div>

        {/* NAVIGATION */}
        <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2 mt-4">

          <a
            href="/"
            className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/50 hover:text-[#D4AF37] transition-colors"
          >
            Navigation
          </a>

          <span className="text-white/10">•</span>

          <a
            href="/Faq"
            className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/50 hover:text-[#D4AF37] transition-colors"
          >
            FAQs
          </a>

          <span className="text-white/10">•</span>

          <a
            href="/#top20"
            className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/50 hover:text-[#D4AF37] transition-colors"
          >
            Charts
          </a>

          <span className="text-white/10">•</span>

          <a
            href="/Faq"
            className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/50 hover:text-[#D4AF37] transition-colors"
          >
            Disclaimer
          </a>

        </div>

        {/* SOCIALS */}
        <div className="flex items-center justify-center gap-3 mt-4">

          <a
            href="#"
            aria-label="Instagram"
            className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] transition-all duration-200"
          >
            <Instagram size={19} strokeWidth={1.8} />
          </a>

          <a
            href="#"
            aria-label="TikTok"
            className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] transition-all duration-200"
          >
            <Music2 size={19} strokeWidth={1.8} />
          </a>

          <a
            href="#"
            aria-label="WhatsApp"
            className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] transition-all duration-200"
          >
            <MessageCircle size={19} strokeWidth={1.8} />
          </a>

          <a
            href="#"
            aria-label="Facebook"
            className="w-10 h-10 flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-white/55 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 hover:bg-[#D4AF37]/[0.06] transition-all duration-200"
          >
            <Facebook size={19} strokeWidth={1.8} />
          </a>

        </div>

        {/* DIVIDER */}
        <div className="w-16 md:w-full h-px bg-white/5 mt-5 mb-3 mx-auto" />

        {/* COPYRIGHT */}
        <div className="flex justify-center items-center">

          <span className="text-[8px] font-mono text-[#b91c1c] uppercase tracking-[0.2em] whitespace-nowrap glow-red">
            © 2026 BORA SOFTWARES
          </span>

        </div>

      </div>
    </footer>
  );
}