'use client';

import React from 'react';

import Header from './Header';

interface BoraShellProps {
  children: React.ReactNode;
  forceCompactHeader?: boolean;
}

export default function BoraShell({
  children,
  forceCompactHeader = false,
}: BoraShellProps) {
  return (
    <div
      className="w-full pb-[76px] md:pb-[86px]"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      {/* HEADER */}
      <Header forceCompact={forceCompactHeader} />

      {/* ACTIVE SECTION CONTENT */}
      <section className="min-h-screen">
        <div>
          {children}
        </div>
      </section>
    </div>
  );
}