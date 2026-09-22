'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

// CURTAIN YA PROFILE: INAFUNIKA PROFILE KWA BLUR
// HAIFUNGI SCROLLING, SI MODAL, ? INAISHIA KWA FAQ PAGE
export default function ProfileCurtain() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const openFaq = () => {
    router.push('/Faq');
  };

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {/* FROST LAYER: CONTENT INAONEKANA ILA IMEBLUR — INAENDELEA KUSOGEA CHINI YAKE */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-lg" />

      {/* FROST SHEEN */}
      <div className="absolute inset-0 bg-white/[0.03]" />

      {/* ? FIXED KATIKATI YA VIEWPORT */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        {/* HIT TARGET KUBWA: 144px */}
        <button
          type="button"
          aria-label="Learn how BORA works"
          onClick={openFaq}
          className="pointer-events-auto flex h-36 w-36 cursor-pointer items-center justify-center rounded-full transition-transform duration-300 hover:scale-[1.05] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--bora-gold)]/60"
        >
          {/* SEALED GRAPHIC: ~80px */}
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full">
            <div className="bora-curtain-ring absolute inset-0 rounded-full border border-[var(--bora-gold)]/40" />

            {/* CRIMSON AURA NDANI YA RADIUS, NYUMA YA ? */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundImage:
                  'radial-gradient(circle, rgba(220, 20, 60, 0.45) 0%, rgba(220, 20, 60, 0.15) 45%, transparent 72%)',
              }}
            />

            <span className="relative font-cinzel text-5xl font-black text-[var(--bora-gold)]">
              ?
            </span>
          </div>
        </button>
      </div>

      <style jsx>{`
        .bora-curtain-ring {
          background-color: color-mix(
            in srgb,
            var(--bora-surface) 40%,
            transparent
          );
          box-shadow: 0 0 24px rgba(255, 196, 0, 0.18);
          animation: boraCurtainBreath 3s ease-in-out
            infinite;
        }

        @keyframes boraCurtainBreath {
          0%,
          100% {
            box-shadow: 0 0 18px rgba(255, 196, 0, 0.14);
            border-color: color-mix(
              in srgb,
              var(--bora-gold) 40%,
              transparent
            );
          }

          50% {
            box-shadow: 0 0 30px rgba(255, 196, 0, 0.3);
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
    </div>,
    document.body
  );
}
