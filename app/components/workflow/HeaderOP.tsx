'use client';

import { useEffect, useState } from 'react';

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

export function useHeaderOP(): HeaderOP {
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let raf = 0;
    let last = -1;

    const update = () => {
      raf = 0;

      const raw =
        window.scrollY / HEADER_SCROLL_DISTANCE;

      const clamped = Math.min(
        Math.max(raw, 0),
        1
      );

      // Rounding 3 decimals: enough resolution for a smooth
      // 0 -> 1 sweep, but haipigi render kwa kila sub-pixel.
      const next = Math.round(clamped * 1000) / 1000;

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
  }, []);

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
