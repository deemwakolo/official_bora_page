'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import { Menu, X } from 'lucide-react';

import ThemeToggle from '../components-themes/ThemeToggle';
import { useBoraTheme } from '../components-themes/MasterGUI';

const MENU_ITEMS = [
  { id: 'charts', label: 'Charts' },
  { id: 'trending', label: 'Trending' },
  { id: 'vote', label: 'Vote' },
  { id: 'updates', label: 'Updates' },
  { id: 'profile', label: 'Profile' },
];

export default function Header() {
  const { theme, changeTheme, mounted } = useBoraTheme();

  const [retracted, setRetracted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const next = window.scrollY > 40;
      setRetracted((prev) => (prev === next ? prev : next));
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

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        backgroundColor: 'var(--bora-background-deep)',
        color: 'var(--bora-text)',
      }}
    >
      {/* UNIFIED HEADER SURFACE — SEHEMU MOJA INAYOBADILIKA */}
      <div
        className={`
          relative w-full overflow-hidden
          transition-all duration-500 ease-out
          ${retracted ? 'h-[56px]' : 'h-auto'}
          ${
            retracted
              ? 'shadow-[0_8px_30px_rgba(0,0,0,0.45)]'
              : 'shadow-none'
          }
        `}
        style={{
          backgroundColor: 'var(--bora-background-deep)',
          borderBottom: retracted
            ? '1px solid var(--bora-border)'
            : '1px solid transparent',
        }}
      >
        {/* TINGA TEXTURE */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.70]"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          maskImage:
            'linear-gradient(to bottom, black 0%, black 35%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 35%, transparent 100%)',
        }}
      />

      {/* DARK FADE */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, color-mix(in srgb, var(--bora-background) 20%, transparent), color-mix(in srgb, var(--bora-background-deep) 65%, transparent), var(--bora-background-deep))',
        }}
      />

      {/* SUBTLE GOLD GLOW */}
      <div
        className="pointer-events-none absolute left-1/2 top-[-90px] h-[220px] w-[650px] -translate-x-1/2 rounded-full blur-[120px]"
        style={{
          backgroundColor: 'var(--bora-gold-glow)',
        }}
      />

        {/* FULL MASTHEAD CONTENT */}
        <div
          className={`
            pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto flex max-w-7xl items-center
            justify-center px-4 transition-all duration-500 ease-out md:px-8
            ${
              retracted
                ? '-translate-y-3 opacity-0'
                : 'h-[105px] translate-y-0 opacity-100 md:h-[125px]'
            }
          `}
        >
          {/* CENTERED BRAND */}
          <Link
            href="/"
            aria-label="BORA home"
            aria-hidden={retracted}
            tabIndex={retracted ? -1 : 0}
            className="group flex flex-col items-center justify-center"
          >
            <h1
              className="
                font-cinzel
                text-[40px]
                font-black
                uppercase
                leading-none
                tracking-[-0.045em]
                transition-all
                duration-300
                sm:text-[46px]
                md:text-[60px]
              "
              style={{
                color: 'var(--bora-text)',
              }}
            >
              BORA
              <span style={{ color: 'var(--bora-gold)' }}>
                .
              </span>
            </h1>

            {/* TAGLINE */}
            <p
              className="
                mt-2
                whitespace-nowrap
                text-[7px]
                font-bold
                uppercase
                tracking-[0.30em]
                sm:text-[8px]
                sm:tracking-[0.36em]
                md:text-[10px]
                md:tracking-[0.42em]
              "
              style={{
                color: 'var(--bora-gold)',
                opacity: 0.75,
              }}
            >
              TANZANIA MUSIC CHART
            </p>
          </Link>

          {/* LIVE */}
          <div
            aria-hidden={retracted}
            className={`
              absolute
              right-4
              top-1/2
              z-10
              flex
              -translate-y-1/2
              items-center
              gap-2
              font-mono
              transition-all duration-500 ease-out
              md:right-8
              ${
                retracted
                  ? 'pointer-events-none translate-x-2 opacity-0'
                  : 'translate-x-0 opacity-100'
              }
            `}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
                style={{
                  backgroundColor: 'var(--bora-red)',
                }}
              />

              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: 'var(--bora-red)',
                }}
              />
            </span>

            <span
              className="hidden text-[8px] font-bold uppercase tracking-[0.2em] sm:block"
              style={{
                color: 'var(--bora-text-muted)',
              }}
            >
              LIVE
            </span>
          </div>

          {/* HAMBURGER — KITUFE KIMOJA KINACHOHAMA */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className={`
              absolute z-20 flex h-10 w-10 items-center justify-center rounded-full
              transition-all duration-500 ease-out
              ${
                retracted
                  ? 'left-4 top-1/2 -translate-y-1/2 md:left-8'
                  : 'left-4 top-6 md:left-8 md:top-8'
              }
            `}
            style={{ color: 'var(--bora-text)' }}
          >
            <Menu size={22} strokeWidth={2} />
          </button>

          {/* COMPACT BRAND — INAONEKANA TU BAADA YA KURETRACT */}
          <Link
            href="/"
            aria-label="BORA home"
            aria-hidden={!retracted}
            tabIndex={retracted ? 0 : -1}
            className={`
              absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 font-cinzel
              text-[22px] font-black uppercase leading-none tracking-[-0.045em]
              transition-all duration-500 ease-out
              ${
                retracted
                  ? 'translate-y-[-50%] opacity-100'
                  : 'pointer-events-none translate-y-[-30%] opacity-0'
              }
            `}
            style={{ color: 'var(--bora-text)' }}
          >
            BORA
            <span style={{ color: 'var(--bora-gold)' }}>.</span>
          </Link>
        </div>
      </div>

      {/* SIDE MENU — BACKDROP */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => setMenuOpen(false)}
        tabIndex={menuOpen ? 0 : -1}
        className={`
          fixed inset-0 z-40 bg-black/60 transition-opacity duration-300
          ${menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}
        `}
      />

      {/* SIDE MENU — PANEL */}
      <aside
        aria-hidden={!menuOpen}
        className={`
          fixed bottom-0 left-0 top-0 z-50 flex w-[280px] max-w-[85vw] flex-col
          transition-transform duration-300 ease-out
          ${menuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{
          backgroundColor: 'var(--bora-background-deep)',
          color: 'var(--bora-text)',
          borderRight: '1px solid var(--bora-border)',
        }}
      >
        {/* MENU HEADER */}
        <div className="flex h-[56px] items-center justify-between px-4">
          <span className="font-cinzel text-[18px] font-black uppercase tracking-[-0.045em]">
            BORA
            <span style={{ color: 'var(--bora-gold)' }}>.</span>
          </span>

          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* MENU NAVIGATION */}
        <nav className="flex flex-col gap-1 px-3">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label={item.label}
              className="rounded-xl px-4 py-3 text-left text-[13px] font-bold uppercase tracking-[0.14em] transition-colors"
              style={{ color: 'var(--bora-text-muted)' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color = 'var(--bora-gold)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = 'var(--bora-text-muted)';
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* MENU THEME */}
        <div className="px-7 pb-2">
          <ThemeToggle
            theme={theme}
            onThemeChange={changeTheme}
            mounted={mounted}
            inline
          />
        </div>

        {/* MENU FOOTER */}
        <div
          className="mt-auto px-7 pb-6 font-mono text-[8px] uppercase tracking-[0.3em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          Tanzania Music Chart
        </div>
      </aside>
    </header>
  );
}