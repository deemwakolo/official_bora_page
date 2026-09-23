'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';

interface MasterHapticsContextValue {
  hapticsEnabled: boolean;
  setHapticsEnabled: (value: boolean) => void;
  voteHaptic: () => void;
  shushaHaptic: () => void;
  toggleHaptic: () => void;
}

const MasterHapticsContext =
  createContext<MasterHapticsContextValue | null>(null);

export function MasterHapticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hapticsEnabled, setHapticsEnabled] =
    useState(true);

  const vibrate = useCallback((pattern: number | number[]) => {
    if (!hapticsEnabled) return;

    if (typeof navigator === 'undefined') return;

    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, [hapticsEnabled]);

  const voteHaptic = useCallback(() => {
    vibrate(18);
  }, [vibrate]);

  const shushaHaptic = useCallback(() => {
    vibrate([12, 45, 12]);
  }, [vibrate]);

  const toggleHaptic = useCallback(() => {
    vibrate([10, 35, 10]);
  }, [vibrate]);

  return (
    <MasterHapticsContext.Provider
      value={{
        hapticsEnabled,
        setHapticsEnabled,
        voteHaptic,
        shushaHaptic,
        toggleHaptic,
      }}
    >
      {children}
    </MasterHapticsContext.Provider>
  );
}

export function useMasterHaptics() {
  const context = useContext(
    MasterHapticsContext
  );

  if (!context) {
    throw new Error(
      'useMasterHaptics must be used inside MasterHapticsProvider'
    );
  }

  return context;
}