'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

// PROFILE CURTAIN: PAGE-BASED FROSTED GLASS
// FIXED TO THE VIEWPORT, BLURS THE ENTIRE PAGE BEHIND IT
export default function ProfileCurtain() {
  const router = useRouter();

  const openFaq = () => {
    router.push('/Faq');
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      {/* PAGE-BASED BLUR: FULL VIEWPORT */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backdropFilter: 'blur(9px)',
          WebkitBackdropFilter: 'blur(9px)',
          backgroundColor: 'rgba(8, 8, 8, 0.32)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.35)',
        }}
      />

      {/* PAGE-BASED FROST SHEEN */}
      <div className="pointer-events-none fixed inset-0 bg-white/[0.075]" />

      {/* CENTERED ACTION */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <button
          type="button"
          aria-label="Learn how BORA works"
          onClick={openFaq}
          className="pointer-events-auto flex h-36 w-36 cursor-pointer items-center justify-center rounded-full transition-transform duration-300 hover:scale-[1.05] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--bora-gold)]/60"
        >
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[var(--bora-gold)]/55 bg-[#080808] shadow-[0_0_30px_rgba(255,196,0,0.22)]">
            {/* CRIMSON AURA */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(220, 20, 60, 0.32) 0%, rgba(220, 20, 60, 0.10) 48%, transparent 72%)',
              }}
            />

            {/* GOLD RING */}
            <div className="bora-curtain-ring absolute inset-1 rounded-full border border-[var(--bora-gold)]/45" />

            <span className="relative z-10 font-cinzel text-6xl font-black leading-none text-[var(--bora-gold)]">
              ?
            </span>
          </div>
        </button>
      </div>

      <style jsx>{`
        .bora-curtain-ring {
          box-shadow: 0 0 18px rgba(255, 196, 0, 0.14);
          animation: boraCurtainBreath 3s ease-in-out infinite;
        }

        @keyframes boraCurtainBreath {
          0%,
          100% {
            box-shadow: 0 0 18px rgba(255, 196, 0, 0.14);
            border-color: color-mix(
              in srgb,
              var(--bora-gold) 45%,
              transparent
            );
          }

          50% {
            box-shadow: 0 0 30px rgba(255, 196, 0, 0.28);
            border-color: color-mix(
              in srgb,
              var(--bora-gold) 70%,
              transparent
            );
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .bora-curtain-ring {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}