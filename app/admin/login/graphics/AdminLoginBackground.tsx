'use client';

import Glow from './Glow';
import Particles from './Particles';

/**
 * BORA LOGIN BACKGROUND LAYER
 * Z-0: Tinga, Z-1: atmosphere. Zote pointer-events-none.
 */
export default function AdminLoginBackground() {
  return (
    <>
      {/* TINGA — Z-0 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[55vh] w-full max-w-6xl"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.55,
          maskImage:
            'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 45%, transparent 100%)',
        }}
      />

      {/* DARK ATMOSPHERIC FADE — Z-1 */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, var(--bora-background) 62%, var(--bora-background) 100%)',
        }}
      />

      {/* ATMOSPHERIC GLOWS */}
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <Glow />
      </div>

      {/* TECHNICAL GRID */}
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <Particles />
      </div>

      {/* GLASS TOP REFLECTION */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[45%]"
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in srgb, var(--bora-text) 5%, transparent), transparent)',
          opacity: 0.8,
        }}
      />

      {/* GOLD TOP EDGE */}
      <div
        className="absolute left-[8%] right-[8%] top-0 z-[1] h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent, var(--bora-gold), transparent)',
          boxShadow:
            '0 0 10px var(--bora-gold), 0 0 25px var(--bora-gold-glow)',
        }}
      />

      {/* CORNER LIGHTS */}
      <div
        className="absolute left-0 top-0 z-[1] h-8 w-8 rounded-tl-2xl border-l border-t"
        style={{
          borderColor: 'var(--bora-gold)',
          opacity: 0.7,
        }}
      />

      <div
        className="absolute bottom-0 right-0 z-[1] h-8 w-8 rounded-br-2xl border-b border-r"
        style={{
          borderColor: 'var(--bora-gold)',
          opacity: 0.35,
        }}
      />

      {/* B WATERMARK */}
      <div
        className="pointer-events-none absolute bottom-[-35px] right-[-10px] z-[1] font-cinzel text-[110px] font-black"
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
