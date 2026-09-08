'use client';

import React from 'react';

export default function AdminLoginGraphics() {
  return (
    <>
      {/* TINGA */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[50vh] w-full max-w-6xl -translate-x-1/2 opacity-[0.55]"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          maskImage:
            'linear-gradient(to top, transparent 0%, black 45%, black 100%)',
          WebkitMaskImage:
            'linear-gradient(to top, transparent 0%, black 45%, black 100%)',
        }}
      />

      {/* DARK FADE */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, var(--bora-background) 58%, var(--bora-background) 100%)',
        }}
      />

      {/* TOP GOLD ATMOSPHERE */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-100px] h-[320px] w-[700px] -translate-x-1/2 rounded-full blur-[140px]"
        style={{
          background:
            'radial-gradient(circle, var(--bora-gold-glow) 0%, transparent 70%)',
          opacity: 1.5,
        }}
      />

      {/* CARD GRAPHICS */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[90%] w-[105%] -translate-x-1/2 -translate-y-1/2 rounded-[40px] blur-[100px]"
        style={{
          background:
            'radial-gradient(circle, var(--bora-gold-glow) 0%, transparent 68%)',
          opacity: 2,
        }}
      />

      <div
        className="pointer-events-none absolute bottom-[-80px] left-[-80px] h-[220px] w-[220px] rounded-full blur-[110px]"
        style={{
          background:
            'radial-gradient(circle, var(--bora-red-glow) 0%, transparent 70%)',
          opacity: 1.2,
        }}
      />

      {/* GLASS TOP REFLECTION */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[45%]"
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in srgb, var(--bora-text) 5%, transparent), transparent)',
          opacity: 0.8,
        }}
      />

      {/* INNER GOLD LIGHT */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[180px] w-[70%] -translate-x-1/2 rounded-full blur-[70px]"
        style={{
          backgroundColor: 'var(--bora-gold-glow)',
          opacity: 0.8,
        }}
      />

      {/* TECHNICAL GRID */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(var(--bora-text) 1px, transparent 1px), linear-gradient(90deg, var(--bora-text) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          maskImage:
            'linear-gradient(to bottom, black, transparent 80%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black, transparent 80%)',
        }}
      />

      {/* GOLD TOP EDGE */}
      <div
        className="absolute left-[8%] right-[8%] top-0 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent, var(--bora-gold), transparent)',
          boxShadow:
            '0 0 10px var(--bora-gold), 0 0 25px var(--bora-gold-glow)',
        }}
      />

      {/* CORNER LIGHTS */}
      <div
        className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l border-t"
        style={{
          borderColor: 'var(--bora-gold)',
          opacity: 0.7,
        }}
      />

      <div
        className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b border-r"
        style={{
          borderColor: 'var(--bora-gold)',
          opacity: 0.35,
        }}
      />

      {/* WATERMARK */}
      <div
        className="pointer-events-none absolute bottom-[-35px] right-[-10px] font-cinzel text-[110px] font-black"
        style={{
          color: 'var(--bora-gold)',
          opacity: 0.025,
        }}
      >
        B
      </div>
    </>
  );
}