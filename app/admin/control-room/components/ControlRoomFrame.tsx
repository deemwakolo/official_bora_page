'use client';

import React from 'react';

import ControlRoomHeader from './ControlRoomHeader';

interface ControlRoomFrameProps {
  children: React.ReactNode;
}

// COPY YA BoraShell — frontend masthead header imebadilishwa na
// NORMAL header (ControlRoomHeader). Hakuna retraction/compact props
// kwa sababu header hii ni ya kawaida haibadiliki kwa scroll.
export default function ControlRoomFrame({
  children,
}: ControlRoomFrameProps) {
  return (
    <div
      className="w-full pb-[76px] md:pb-[86px]"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      {/* NORMAL HEADER */}
      <ControlRoomHeader />

      {/* ACTIVE SECTION CONTENT */}
      <section className="min-h-screen">
        <div>
          {children}
        </div>
      </section>
    </div>
  );
}
