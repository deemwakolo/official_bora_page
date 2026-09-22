'use client';

import React, { useEffect, useRef } from 'react';

import { X } from 'lucide-react';

import ThemeToggle from '../components-themes/ThemeToggle';
import { useBoraTheme } from '../components-themes/MasterGUI';

interface SidebarProps {
menuOpen: boolean;
onClose: () => void;
}

const SWIPE_THRESHOLD = 60;

export default function Sidebar({
menuOpen,
onClose,
}: SidebarProps) {
const { theme, changeTheme, mounted } = useBoraTheme();

const touchStart = useRef<{ x: number; y: number } | null>(
null
);
const swipeHandled = useRef(false);

/* LOCK PAGE SCROLL WHILE MENU IS OPEN */
useEffect(() => {
if (!menuOpen) return;


const previousOverflow = document.body.style.overflow;

document.body.style.overflow = 'hidden';

return () => {
  document.body.style.overflow = previousOverflow;
};


}, [menuOpen]);

const onTouchStart = (event: React.TouchEvent) => {
if (!menuOpen) return;


const touch = event.touches[0];

touchStart.current = {
  x: touch.clientX,
  y: touch.clientY,
};

swipeHandled.current = false;


};

const onTouchMove = (event: React.TouchEvent) => {
if (
!menuOpen ||
!touchStart.current ||
swipeHandled.current
) {
return;
}


const touch = event.touches[0];

const deltaX =
  touch.clientX - touchStart.current.x;

const deltaY =
  touch.clientY - touchStart.current.y;

if (
  deltaX <= -SWIPE_THRESHOLD &&
  Math.abs(deltaX) > Math.abs(deltaY)
) {
  swipeHandled.current = true;
  onClose();
}


};

const onTouchEnd = () => {
touchStart.current = null;
};

return (
<>
{/* REVEAL BACKDROP */}
<button
type="button"
aria-label="Close menu"
onClick={onClose}
tabIndex={menuOpen ? 0 : -1}
className={`           fixed inset-0 z-[150]
          bg-black/60
          backdrop-blur-sm
          transition-opacity duration-[350ms]
          ease-[cubic-bezier(0.22,1,0.36,1)]
          ${
            menuOpen
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0'
          }
        `}
/>


  {/* REVEAL SLIDE-OUT MENU */}
  <aside
    aria-hidden={!menuOpen}
    onTouchStart={onTouchStart}
    onTouchMove={onTouchMove}
    onTouchEnd={onTouchEnd}
    className={`
      fixed bottom-0 left-0 top-0 z-[200]
      flex w-[240px] max-w-[85vw] flex-col
      overflow-hidden
      border-r
      transition-transform duration-[350ms]
      ease-[cubic-bezier(0.22,1,0.36,1)]
      ${
        menuOpen
          ? 'translate-x-0'
          : '-translate-x-full'
      }
    `}
    style={{
      backgroundColor:
        'color-mix(in srgb, var(--bora-background-deep) 82%, transparent)',
      color: 'var(--bora-text)',
      borderRightColor: 'var(--bora-border)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '8px 0 40px rgba(0,0,0,0.35)',
      touchAction: 'pan-y',
    }}
  >
    {/* MENU CONTENT */}
    <div
      className={`
        flex h-full flex-col
        transition-opacity duration-[220ms]
        ${
          menuOpen
            ? 'opacity-100'
            : 'opacity-0'
        }
      `}
    >
      {/* MENU HEADER */}
      <div className="flex h-[56px] shrink-0 items-center justify-between px-4">
        <span className="font-cinzel text-[18px] font-black uppercase tracking-[-0.045em]">
          BORA
          <span style={{ color: 'var(--bora-gold)' }}>
            .
          </span>
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="
            flex h-10 w-10
            items-center justify-center
            rounded-full
            transition-all duration-200
            active:scale-90
          "
          style={{
            color: 'var(--bora-text-muted)',
          }}
        >
          <X size={20} strokeWidth={2} />
        </button>
      </div>

      {/* MENU THEME */}
      <div className="shrink-0 px-7 pb-4">
        <ThemeToggle
          theme={theme}
          onThemeChange={changeTheme}
          mounted={mounted}
          inline
        />
      </div>

      {/* MENU NAVIGATION */}
      <nav className="flex flex-col gap-1 px-3">
        {[
          { id: 'faq', label: 'FAQ' },
          { id: 'about', label: 'About Us' },
          { id: 'contact', label: 'Contact Us' },
        ].map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={onClose}
            aria-label={item.label}
            className={`
              rounded-xl px-4 py-3
              text-left text-[13px]
              font-bold uppercase
              tracking-[0.14em]
              transition-all duration-200
              ${
                menuOpen
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-3 opacity-0'
              }
            `}
            style={{
              color: 'var(--bora-text-muted)',
              transitionDelay: menuOpen
                ? `${70 + index * 35}ms`
                : '0ms',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color =
                'var(--bora-gold)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color =
                'var(--bora-text-muted)';
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  </aside>
</>

);
}
