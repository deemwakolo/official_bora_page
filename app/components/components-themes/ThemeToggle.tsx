'use client';

import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import { useMasterHaptics } from './haptics/MasterHaptics';

type ThemeName = 'black' | 'white';

interface ThemeToggleProps {
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  mounted?: boolean;
}

export default function ThemeToggle({
  theme,
  onThemeChange,
  mounted = true,
}: ThemeToggleProps) {
  const { toggleHaptic } = useMasterHaptics();

  const [active, setActive] = useState(true);
  const [clicked, setClicked] = useState(false);

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const clickRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const swipeStartX =
    useRef<number | null>(null);

  const swipeStartY =
    useRef<number | null>(null);

  const isSwiping =
    useRef(false);

  const startFadeTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setActive(false);
    }, 5000);
  };

  useEffect(() => {
    if (!mounted) return;

    startFadeTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (clickRef.current) {
        clearTimeout(clickRef.current);
      }
    };
  }, [mounted, theme]);

  const wakeToggle = () => {
    setActive(true);
    startFadeTimer();
  };

  /*
   * Hide the toggle and dock it
   * on the RIGHT side.
   */
  const sendToRight = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setActive(false);
  };

  /*
   * Pointer starts.
   */
  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    swipeStartX.current = event.clientX;
    swipeStartY.current = event.clientY;
    isSwiping.current = false;
  };

  /*
   * Detect a horizontal swipe.
   */
  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (
      swipeStartX.current === null ||
      swipeStartY.current === null
    ) {
      return;
    }

    const deltaX =
      event.clientX - swipeStartX.current;

    const deltaY =
      event.clientY - swipeStartY.current;

    /*
     * Horizontal movement must clearly
     * dominate vertical movement.
     */
    if (
      Math.abs(deltaX) > 12 &&
      Math.abs(deltaX) >
        Math.abs(deltaY) * 1.2
    ) {
      isSwiping.current = true;
    }

    /*
     * SWIPE / PUSH RIGHT
     */
    if (
      deltaX > 50 &&
      isSwiping.current
    ) {
      sendToRight();

      swipeStartX.current = null;
      swipeStartY.current = null;
    }
  };

  /*
   * Pointer ends.
   */
  const handlePointerUp = () => {
    swipeStartX.current = null;
    swipeStartY.current = null;

    setTimeout(() => {
      isSwiping.current = false;
    }, 50);
  };

  /*
   * Pointer cancelled.
   */
  const handlePointerCancel = () => {
    swipeStartX.current = null;
    swipeStartY.current = null;
    isSwiping.current = false;
  };

  /*
   * Theme selection.
   */
  const changeTheme = (
    nextTheme: ThemeName
  ) => {
    /*
     * Don't interpret a swipe as
     * a theme button click.
     */
    if (isSwiping.current) {
      return;
    }

    /*
     * Same theme.
     */
    if (nextTheme === theme) {
      wakeToggle();
      return;
    }

    /*
     * MASTER HAPTIC FEEDBACK
     * Fires immediately on theme change.
     */
    toggleHaptic();

    setClicked(true);

    onThemeChange(nextTheme);

    wakeToggle();

    if (clickRef.current) {
      clearTimeout(clickRef.current);
    }

    clickRef.current = setTimeout(() => {
      setClicked(false);
    }, 450);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`
        fixed bottom-4 z-[100]
        sm:bottom-5
        transition-all duration-700
        ease-[cubic-bezier(0.22,1,0.36,1)]
        ${
          active
            ? 'left-1/2 -translate-x-1/2 translate-y-0 opacity-100'
            : 'right-4 translate-x-0 translate-y-2 opacity-40'
        }
        sm:${
          active
            ? 'left-1/2 -translate-x-1/2'
            : 'right-5'
        }
      `}
      onPointerEnter={wakeToggle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onFocus={wakeToggle}
      style={{
        touchAction: 'pan-y',
      }}
    >
      <div
        className={`
          relative flex items-center
          rounded-[22px]
          border
          p-[3px]
          backdrop-blur-2xl
          transition-all duration-500
          ease-[cubic-bezier(0.22,1,0.36,1)]
          ${
            active
              ? 'gap-[3px] scale-100'
              : 'gap-0 scale-[0.92]'
          }
          ${
            clicked
              ? 'scale-[0.88]'
              : ''
          }
        `}
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--bora-surface) 72%, transparent)',
          borderColor:
            'color-mix(in srgb, var(--bora-text) 12%, transparent)',
          boxShadow:
            '0 10px 35px color-mix(in srgb, var(--bora-background-deep) 55%, transparent), inset 0 1px 0 color-mix(in srgb, var(--bora-text) 10%, transparent), inset 0 -1px 0 color-mix(in srgb, var(--bora-background-deep) 30%, transparent)',
        }}
      >
        {/* INNER GLASS */}
        <span
          className="
            pointer-events-none
            absolute
            inset-[1px]
            rounded-[20px]
            opacity-60
          "
          style={{
            boxShadow:
              'inset 0 0 0 1px color-mix(in srgb, var(--bora-text) 4%, transparent)',
          }}
        />

        {/* BLACK */}
        <button
          type="button"
          onClick={() => changeTheme('black')}
          aria-label="Switch to black theme"
          className={`
            group relative
            flex items-center justify-center
            overflow-hidden
            rounded-[19px]
            transition-all duration-500
            ${
              active
                ? 'h-10 min-w-[61px] px-3'
                : 'h-9 w-9'
            }
          `}
          style={{
            backgroundColor:
              theme === 'black'
                ? 'color-mix(in srgb, var(--bora-text) 8%, transparent)'
                : 'transparent',
            boxShadow:
              theme === 'black'
                ? 'inset 0 0 0 1px color-mix(in srgb, var(--bora-text) 5%, transparent)'
                : 'none',
          }}
        >
          <span
            className={`
              relative z-10
              text-[17px]
              leading-none
              transition-all duration-300
              ${
                clicked &&
                theme === 'black'
                  ? 'scale-[1.35] rotate-[-12deg]'
                  : 'scale-100 rotate-0'
              }
              group-hover:scale-125
            `}
          >
            🌙
          </span>

          <span
            className={`
              relative z-10
              overflow-hidden
              whitespace-nowrap
              text-[7px]
              font-black
              tracking-[0.18em]
              transition-all duration-500
              ${
                active
                  ? 'ml-1.5 max-w-[50px] opacity-100'
                  : 'ml-0 max-w-0 opacity-0'
              }
            `}
          >
            BLACK
          </span>

          {theme === 'black' && (
            <span
              className={`
                pointer-events-none
                absolute inset-0
                rounded-[19px]
                blur-xl
                transition-all duration-300
                ${
                  clicked
                    ? 'scale-125 opacity-100'
                    : 'scale-100 opacity-70'
                }
              `}
              style={{
                backgroundColor:
                  'var(--bora-gold-glow)',
              }}
            />
          )}
        </button>

        {/* WHITE */}
        <button
          type="button"
          onClick={() => changeTheme('white')}
          aria-label="Switch to white theme"
          className={`
            group relative
            flex items-center justify-center
            overflow-hidden
            rounded-[19px]
            transition-all duration-500
            ${
              active
                ? 'h-10 min-w-[61px] px-3'
                : 'h-9 w-9'
            }
          `}
          style={{
            backgroundColor:
              theme === 'white'
                ? 'color-mix(in srgb, var(--bora-text) 8%, transparent)'
                : 'transparent',
            boxShadow:
              theme === 'white'
                ? 'inset 0 0 0 1px color-mix(in srgb, var(--bora-text) 5%, transparent)'
                : 'none',
          }}
        >
          <span
            className={`
              relative z-10
              text-[17px]
              leading-none
              transition-all duration-300
              ${
                clicked &&
                theme === 'white'
                  ? 'scale-[1.35] rotate-[12deg]'
                  : 'scale-100 rotate-0'
              }
              group-hover:scale-125
            `}
          >
            ☀️
          </span>

          <span
            className={`
              relative z-10
              overflow-hidden
              whitespace-nowrap
              text-[7px]
              font-black
              tracking-[0.18em]
              transition-all duration-500
              ${
                active
                  ? 'ml-1.5 max-w-[50px] opacity-100'
                  : 'ml-0 max-w-0 opacity-0'
              }
            `}
          >
            WHITE
          </span>

          {theme === 'white' && (
            <span
              className={`
                pointer-events-none
                absolute inset-0
                rounded-[19px]
                blur-xl
                transition-all duration-300
                ${
                  clicked
                    ? 'scale-125 opacity-100'
                    : 'scale-100 opacity-70'
                }
              `}
              style={{
                backgroundColor:
                  'var(--bora-gold-glow)',
              }}
            />
          )}
        </button>
      </div>
    </div>
  );
}