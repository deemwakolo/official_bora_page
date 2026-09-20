'use client';

import React from 'react';

import { Menu } from 'lucide-react';

interface HamProps {
  retracted: boolean;
  menuOpen: boolean;
  onOpen: () => void;
}

export default function Ham({
  retracted,
  menuOpen,
  onOpen,
}: HamProps) {
  return (
    <div
      className={`
        pointer-events-none absolute left-4 top-0 z-20 transition-all duration-500 ease-out md:left-8
        ${
          retracted
            ? 'h-[56px]'
            : 'h-[105px] md:h-[125px]'
        }
      `}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        className="pointer-events-auto absolute left-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full"
        style={{ color: 'var(--bora-text)' }}
      >
        <Menu size={22} strokeWidth={2} />
      </button>
    </div>
  );
}
