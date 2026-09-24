'use client';

import Glow from '../../login/graphics/Glow';
import Particles from '../../login/graphics/Particles';

/*
 * BORA ROOM SELECTOR BACKGROUND LAYER
 * Z-0 Tinga, Z-1 atmosphere, Z-2 central light.
 * Zote pointer-events-none.
 *
 * TUNARUDIA GLOW + PARTICLES ZA LOGIN — hakuna particle
 * system ya pili, ili lugha ya macho ibaki moja.
 */
export default function RoomSelectorBackground() {
  return (
    <>
      {/* TINGA — Z-0 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 mx-auto h-[72vh] w-full max-w-6xl"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.48,
          maskImage:
            'linear-gradient(to bottom, black 0%, black 38%, transparent 92%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 38%, transparent 92%)',
        }}
      />

      {/* DARK ATMOSPHERIC FADE — Z-1 */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, var(--bora-background) 68%, var(--bora-background) 100%)',
        }}
      />

      {/* ATMOSPHERIC GLOWS — Z-1 */}
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <Glow />
      </div>

      {/* TECHNICAL GRID — Z-1 */}
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <Particles />
      </div>

      {/* CENTRAL LIGHT — Z-2 */}
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] z-[2] h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--bora-gold-glow), transparent 68%)',
          opacity: 0.16,
        }}
      />
    </>
  );
}
