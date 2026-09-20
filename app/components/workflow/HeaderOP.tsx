'use client';

import { useEffect, useState } from 'react';

export interface HeaderOP {
  retracted: boolean;
  menuOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

// Two thresholds instead of one, with a dead zone between them.
// A single "> 40" line flips back and forth on every micro-scroll
// near that point, restarting the CSS transition each time — that's
// the glitch/stuck feeling. This gives scroll a 60px buffer where
// nothing changes, so it only flips once per decisive direction.
const RETRACT_AT = 80; // must pass this (scrolling down) to shrink
const EXPAND_AT = 20;  // must come back under this (scrolling up) to expand

export function useHeaderOP(): HeaderOP {
  const [retracted, setRetracted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const y = window.scrollY;

      setRetracted((prev) => {
        if (!prev && y > RETRACT_AT) return true;
        if (prev && y < EXPAND_AT) return false;
        return prev;
      });
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();

    window.addEventListener('scroll', onScroll, { passive: true });

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
    retracted,
    menuOpen,
    openMenu,
    closeMenu,
    toggleMenu,
  };
}