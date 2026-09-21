'use client';

import React from 'react';

import { Menu } from 'lucide-react';

interface HamProps {
  menuOpen: boolean;
  onOpen: () => void;
}

export default function Ham({
  menuOpen,
  onOpen,
}: HamProps) {
  return (
    // inset-y-0 = kitufe kinakaa katikati ya surface ya header.
    // Surface inapungua continuously kwa scroll progress, hivyo
    // hamburger inasafiri kutoka masthead center hadi compact center
    // kwa mwendo ule ule — si kuruka kati ya coordinates mbili.
    <div className="pointer-events-none absolute inset-y-0 left-4 z-[200] flex items-center md:left-8">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full"
        style={{ color: 'var(--bora-text)' }}
      >
        <Menu size={22} strokeWidth={2} />
      </button>
    </div>
  );
}
