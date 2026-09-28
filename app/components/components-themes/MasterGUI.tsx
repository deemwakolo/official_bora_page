'use client';

import React, { useEffect, useState } from 'react';

import type { BoraPaletteId } from './tokens/boraTokenSpec';
import {
  applyBoraTokensToElement,
  boraTokensForPalette,
} from './tokens/applyBoraTokens';

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

  // WEKA BORA TOKENS KWENYE CSS VARIABLES
  useEffect(() => {
    if (!mounted) return;

    // THEME NI PREFS YA MTUMIAJI — si chanzo cha thamani.
    // Thamani zote zinapatikana kwenye boraTokenSpec (single source
    // of truth); hapa tunachagua palette tu.
    const activePalette: BoraPaletteId =
      theme === 'black' ? 'bora-default' : 'bora-light';

    const root = document.documentElement;

    root.dataset.theme = theme;

    applyBoraTokensToElement(
      root,
      boraTokensForPalette(activePalette)
    );

    // UPDATE GLOBAL TOKENS ZILIZOKUWEPO (Tailwind legacy pair —
    // NOT part of the BORA token family, kept as-is)
    root.style.setProperty(
      '--foreground',
      activePalette === 'bora-light' ? '5 5 5' : '255 255 255'
    );

    root.style.setProperty(
      '--bg',
      activePalette === 'bora-light' ? '255 255 255' : '5 5 5'
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