'use client';

import { useEffect, useRef, useState } from 'react';

// Umbali wa scroll unaobadilisha header kutoka 0 (fully expanded)
// hadi 1 (fully retracted). Transformation ni CONTINUOUS — kila pixel
// ya scroll inasogeza elements, hakuna threshold jump.
export const HEADER_SCROLL_DISTANCE = 140;

export interface HeaderOP {
  progress: number;
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

export function useHeaderOP(
  lockHeaderAtFullRetraction = false
): HeaderOP {
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  // VOTE FULL-RETRACTION LATCH: in-memory tu, hakuna persistence.
  // Ref ndani ya scroll handler — haisumbuliwi na stale closures.
  const fullRetractionLocked = useRef(false);

  // Kutoka Vote (au refresh/section change): unlock mara moja.
  useEffect(() => {
    if (lockHeaderAtFullRetraction) return;

    fullRetractionLocked.current = false;
  }, [lockHeaderAtFullRetraction]);

  useEffect(() => {
    let raf = 0;
    let last = -1;

    const update = () => {
      raf = 0;

      // Latch iko active: progress inabaki 1, hata kama
      // mtumiaji anarudi juu (scroll upward).
      if (fullRetractionLocked.current) {
        if (last !== 1) {
          last = 1;
          setProgress(1);
        }
        return;
      }

      const raw =
        window.scrollY / HEADER_SCROLL_DISTANCE;

      const clamped = Math.min(
        Math.max(raw, 0),
        1
      );

      // Rounding 3 decimals: enough resolution for a smooth
      // 0 -> 1 sweep, but haipigi render kwa kila sub-pixel.
      const next = Math.round(clamped * 1000) / 1000;

      // Vote: ukifika full retraction, funga hapa — scrolling
      // upward hairudishi header hadi mtumiaji atoke Vote.
      if (lockHeaderAtFullRetraction && next >= 1) {
        fullRetractionLocked.current = true;
      }

      if (next === last) return;

      last = next;
      setProgress(next);
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();

    window.addEventListener('scroll', onScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('scroll', onScroll);

      if (raf) cancelAnimationFrame(raf);
    };
  }, [lockHeaderAtFullRetraction]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const openMenu = () => setMenuOpen(true);
  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  return {
    progress,
    menuOpen,
    openMenu,
    closeMenu,
    toggleMenu,
  };
}
