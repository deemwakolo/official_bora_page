'use client';

import React, { useEffect, useState } from 'react';

import blackTheme from './themes/black';
import whiteTheme from './themes/white';

import ThemeToggle from './ThemeToggle';

import { MasterSoundProvider } from './haptics/MasterSound';
import { MasterHapticsProvider } from './haptics/MasterHaptics';

type ThemeName = 'black' | 'white';

const THEME_STORAGE_KEY = 'bora-theme';

/*
 * THEME CONTEXT — INARUHUSU HEADER KUFIKIA
 * THEME ILIYOPO BILA KUTENGENEZA STATE YA PILI.
 */
interface ThemeContextValue {
  theme: ThemeName;
  changeTheme: (theme: ThemeName) => void;
  mounted: boolean;
}

const BoraThemeContext =
  React.createContext<ThemeContextValue>({
    theme: 'black',
    changeTheme: () => {},
    mounted: false,
  });

export function useBoraTheme() {
  return React.useContext(BoraThemeContext);
}

export default function MasterGUI({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] =
    useState<ThemeName>('black');

  const [mounted, setMounted] =
    useState(false);

  // HIFADHI NA KUREJESHA THEME ILIYOCHAGULIWA
  useEffect(() => {
    const savedTheme = localStorage.getItem(
      THEME_STORAGE_KEY
    ) as ThemeName | null;

    if (
      savedTheme === 'black' ||
      savedTheme === 'white'
    ) {
      setTheme(savedTheme);
    }

    setMounted(true);
  }, []);

  // WEKA THEME TOKENS KWENYE CSS VARIABLES
  useEffect(() => {
    if (!mounted) return;

    const activeTheme =
      theme === 'black'
        ? blackTheme
        : whiteTheme;

    const root = document.documentElement;

    root.dataset.theme = theme;

    root.style.setProperty(
      '--bora-background',
      activeTheme.background
    );

    root.style.setProperty(
      '--bora-background-deep',
      activeTheme.backgroundDeep
    );

    root.style.setProperty(
      '--bora-surface',
      activeTheme.surface
    );

    root.style.setProperty(
      '--bora-surface-elevated',
      activeTheme.surfaceElevated
    );

    root.style.setProperty(
      '--bora-text',
      activeTheme.text
    );

    root.style.setProperty(
      '--bora-text-muted',
      activeTheme.textMuted
    );

    root.style.setProperty(
      '--bora-text-subtle',
      activeTheme.textSubtle
    );

    root.style.setProperty(
      '--bora-border',
      activeTheme.border
    );

    root.style.setProperty(
      '--bora-border-strong',
      activeTheme.borderStrong
    );

    root.style.setProperty(
      '--bora-gold',
      activeTheme.gold
    );

    root.style.setProperty(
      '--bora-red',
      activeTheme.red
    );

    root.style.setProperty(
      '--bora-green',
      activeTheme.green
    );

    root.style.setProperty(
      '--bora-selection-background',
      activeTheme.selectionBackground
    );

    root.style.setProperty(
      '--bora-selection-text',
      activeTheme.selectionText
    );

    root.style.setProperty(
      '--bora-gold-glow',
      activeTheme.goldGlow
    );

    root.style.setProperty(
      '--bora-red-glow',
      activeTheme.redGlow
    );

    // UPDATE GLOBAL TOKENS ZILIZOKUWEPO
    root.style.setProperty(
      '--foreground',
      activeTheme.text === '#ffffff'
        ? '255 255 255'
        : '5 5 5'
    );

    root.style.setProperty(
      '--bg',
      activeTheme.background === '#ffffff'
        ? '255 255 255'
        : '5 5 5'
    );

    localStorage.setItem(
      THEME_STORAGE_KEY,
      theme
    );
  }, [theme, mounted]);

  // BADILI THEME
  const changeTheme = (
    nextTheme: ThemeName
  ) => {
    setTheme(nextTheme);
  };

  return (
    <BoraThemeContext.Provider
      value={{ theme, changeTheme, mounted }}
    >
      <MasterSoundProvider>
        <MasterHapticsProvider>
          {children}

          {/* THEME TOGGLE IMEHAMISHWA KWENYE HEADER */}
          {/* <ThemeToggle
            theme={theme}
            onThemeChange={changeTheme}
            mounted={mounted}
          /> */}
        </MasterHapticsProvider>
      </MasterSoundProvider>
    </BoraThemeContext.Provider>
  );
}