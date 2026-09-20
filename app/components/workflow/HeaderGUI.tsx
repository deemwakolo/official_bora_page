'use client';

import React from 'react';

import { X } from 'lucide-react';

import Ham from './Ham';

import TopBarHeader from './TopBarHeader';

import ThemeToggle from '../components-themes/ThemeToggle';
import { useBoraTheme } from '../components-themes/MasterGUI';

const MENU_ITEMS = [
  { id: 'charts', label: 'Charts' },
  { id: 'trending', label: 'Trending' },
  { id: 'vote', label: 'Vote' },
  { id: 'updates', label: 'Updates' },
  { id: 'profile', label: 'Profile' },
];

interface HeaderGUIProps {
  retracted: boolean;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
}

export default function HeaderGUI({
  retracted,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
}: HeaderGUIProps) {
  const { theme, changeTheme, mounted } = useBoraTheme();

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
          ${retracted ? 'h-[56px]' : 'h-[125px] md:h-[145px]'}
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
        {/* TOP BAR — RETRACTING HEADER CONTENT */}
        <TopBarHeader retracted={retracted} />

        {/* HAMBURGER */}
          <Ham
            retracted={retracted}
            menuOpen={menuOpen}
            onOpen={onOpenMenu}
          />

      </div>

      {/* SIDE MENU — BACKDROP */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={() => onCloseMenu()}
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
            onClick={() => onCloseMenu()}
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
              onClick={() => onCloseMenu()}
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