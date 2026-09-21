'use client';

import React from 'react';

import Ham from './Ham';
import TopBarHeader from './TopBarHeader';
import Sidebar from './Sidebar';

interface HeaderGUIProps {
  progress: number;
  menuOpen: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
}

// Continuous transformation: --bora-hp (0 = expanded, 1 = retracted)
// inaendesha kila kitu kwa calc(). Native CSS Scroll-Driven Animation
// inachukua over pale browser inaposupport (animation-timeline),
// otherwise React progress (HeaderOP) inaradi hiyo var.
const HEADER_CSS = `
@property --bora-hp {
  syntax: '<number>';
  inherits: true;
  initial-value: 0;
}

.bora-hdr-surface {
  --bora-h-open: 125px;
  --bora-h-closed: 56px;
  height: calc(
    var(--bora-h-open) -
      (var(--bora-h-open) - var(--bora-h-closed)) *
      var(--bora-hp)
  );
}

@media (min-width: 768px) {
  .bora-hdr-surface {
    --bora-h-open: 145px;
  }
}

.bora-hdr-brand {
  --bora-fs-open: 40px;
  font-size: calc(
    var(--bora-fs-open) -
      (var(--bora-fs-open) - 22px) * var(--bora-hp)
  );
}

@media (min-width: 640px) {
  .bora-hdr-brand {
    --bora-fs-open: 46px;
  }
}

@media (min-width: 768px) {
  .bora-hdr-brand {
    --bora-fs-open: 60px;
  }
}

.bora-hdr-tagline {
  overflow: hidden;
  max-height: calc(16px - 16px * var(--bora-hp));
  margin-top: calc(8px - 8px * var(--bora-hp));
}

@supports (animation-timeline: scroll()) {
  .bora-hdr-surface {
    animation: bora-hdr-sweep linear both;
    animation-timeline: scroll(root block);
    animation-range: 0 140px;
  }
}

@keyframes bora-hdr-sweep {
  from {
    --bora-hp: 0;
  }
  to {
    --bora-hp: 1;
  }
}
`;

export default function HeaderGUI({
  progress,
  menuOpen,
  onOpenMenu,
  onCloseMenu,
}: HeaderGUIProps) {
  const p = Math.min(Math.max(progress, 0), 1);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{ __html: HEADER_CSS }}
      />

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
        {/* VISUAL HEADER — SURFACE MOJA INAYOBADILIKA */}
        <div
          className="bora-hdr-surface relative w-full overflow-hidden"
          style={
            {
              '--bora-hp': p,
              backgroundColor:
                'var(--bora-background-deep)',
              borderBottom: `1px solid color-mix(in srgb, var(--bora-border) ${Math.round(
                p * 100
              )}%, transparent)`,
              boxShadow:
                p <= 0.001
                  ? 'none'
                  : `0 ${(8 * p).toFixed(1)}px ${(
                      30 * p
                    ).toFixed(1)}px rgba(0,0,0,${(
                      0.45 * p
                    ).toFixed(2)})`,
            } as React.CSSProperties
          }
        >
          {/* MAST VISUAL */}
          <div className="absolute inset-0">
            <TopBarHeader />
          </div>

          {/* HAMBURGER */}
          <Ham
            menuOpen={menuOpen}
            onOpen={onOpenMenu}
          />

          {/* RED LIVE FLICKER */}
          <div
            className="
              pointer-events-none
              absolute right-4 top-1/2 z-[150]
              flex
              items-center gap-2
              md:right-8
            "
            style={{
              opacity: 1 - p,
              transform: `translateY(-50%) translateX(${(
                8 * p
              ).toFixed(1)}px)`,
            }}
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
