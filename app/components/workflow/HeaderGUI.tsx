'use client';

import React from 'react';

import Ham from './Ham';
import TopBarHeader from './TopBarHeader';
import Sidebar from './Sidebar';

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
  return (
    <>
      {/* HEADER FLOW RESERVATION */}
      <div
        aria-hidden
        className="h-[125px] w-full md:h-[145px]"
      />

      {/* FIXED HEADER */}
      <header
        className="fixed left-0 right-0 top-0 z-50 w-full"
        style={{
          color: 'var(--bora-text)',
        }}
      >
        {/* VISUAL HEADER */}
        <div
          className={`
            relative w-full overflow-hidden
            will-change-[height]
            transition-[height]
            duration-[450ms]
            ease-[cubic-bezier(0.16,1,0.3,1)]
            ${
              retracted
                ? 'h-[56px]'
                : 'h-[125px] md:h-[145px]'
            }
          `}
          style={{
            backgroundColor:
              'var(--bora-background-deep)',
            borderBottom: retracted
              ? '1px solid var(--bora-border)'
              : '1px solid transparent',
            boxShadow: retracted
              ? '0 8px 30px rgba(0,0,0,0.45)'
              : 'none',
          }}
        >
          {/* MAST VISUAL */}
          <div className="absolute inset-0 z-10">
            <TopBarHeader retracted={retracted} />
          </div>

          {/* HAMBURGER */}
          <div className="relative z-[200]">
            <Ham
              retracted={retracted}
              menuOpen={menuOpen}
              onOpen={onOpenMenu}
            />
          </div>

          {/* RED LIVE FLICKER */}
          <div
            className="
              pointer-events-none
              absolute right-4 top-1/2 z-[150]
              flex -translate-y-1/2
              items-center gap-2
              md:right-8
            "
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="
                  absolute inset-0
                  animate-ping
                  rounded-full
                  opacity-60
                "
                style={{
                  backgroundColor:
                    'var(--bora-red)',
                }}
              />

              <span
                className="
                  relative
                  h-2.5 w-2.5
                  rounded-full
                "
                style={{
                  backgroundColor:
                    'var(--bora-red)',
                  boxShadow:
                    '0 0 10px var(--bora-red)',
                }}
              />
            </span>

            <span
              className="
                hidden
                font-mono
                text-[8px]
                font-bold
                uppercase
                tracking-[0.2em]
                sm:block
              "
              style={{
                color:
                  'var(--bora-text-muted)',
              }}
            >
              LIVE
            </span>
          </div>
        </div>
      </header>

      {/* SIDEBAR */}
      <Sidebar
        menuOpen={menuOpen}
        onClose={onCloseMenu}
      />
    </>
  );
}