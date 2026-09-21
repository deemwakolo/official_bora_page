'use client';

import React from 'react';

type ThemeName = 'black' | 'white';

interface ThemeToggleProps {
  theme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
  mounted?: boolean;
  inline?: boolean;
}

export default function ThemeToggle({
  theme,
  onThemeChange,
  mounted = true,
  inline = false,
}: ThemeToggleProps) {
  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`
        flex w-full
        ${inline ? 'relative' : 'fixed bottom-4 left-1/2 z-[100] -translate-x-1/2'}
      `}
    >
      <div
        className="
          flex w-full items-center
          rounded-xl
          border
          p-1
          backdrop-blur-xl
        "
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--bora-surface) 72%, transparent)',
          borderColor:
            'color-mix(in srgb, var(--bora-text) 12%, transparent)',
        }}
      >
        {/* BLACK */}
        <button
          type="button"
          onClick={() => onThemeChange('black')}
          aria-label="Switch to black theme"
          aria-pressed={theme === 'black'}
          className="
            flex h-9 flex-1
            items-center justify-center gap-2
            rounded-lg
            text-[8px]
            font-black
            uppercase
            tracking-[0.16em]
            transition-all duration-200
          "
          style={{
            backgroundColor:
              theme === 'black'
                ? 'color-mix(in srgb, var(--bora-text) 10%, transparent)'
                : 'transparent',
            color:
              theme === 'black'
                ? 'var(--bora-text)'
                : 'var(--bora-text-muted)',
          }}
        >
          <span className="text-[15px] leading-none">
            🌙
          </span>

          <span>Black</span>
        </button>

        {/* WHITE */}
        <button
          type="button"
          onClick={() => onThemeChange('white')}
          aria-label="Switch to white theme"
          aria-pressed={theme === 'white'}
          className="
            flex h-9 flex-1
            items-center justify-center gap-2
            rounded-lg
            text-[8px]
            font-black
            uppercase
            tracking-[0.16em]
            transition-all duration-200
          "
          style={{
            backgroundColor:
              theme === 'white'
                ? 'color-mix(in srgb, var(--bora-text) 10%, transparent)'
                : 'transparent',
            color:
              theme === 'white'
                ? 'var(--bora-text)'
                : 'var(--bora-text-muted)',
          }}
        >
          <span className="text-[15px] leading-none">
            ☀️
          </span>

          <span>White</span>
        </button>
      </div>
    </div>
  );
}