'use client';

import React, {
  createContext,
  useCallback,
  useContext,
} from 'react';

interface MasterHapticsContextValue {
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
  const voteHaptic = useCallback(() => {
    if (typeof navigator === 'undefined') return;

    if ('vibrate' in navigator) {
      navigator.vibrate(18);
    }
  }, []);

  const shushaHaptic = useCallback(() => {
    if (typeof navigator === 'undefined') return;

    if ('vibrate' in navigator) {
      navigator.vibrate([12, 45, 12]);
    }
  }, []);

  const toggleHaptic = useCallback(() => {
    if (typeof navigator === 'undefined') return;

    if ('vibrate' in navigator) {
      navigator.vibrate([10, 35, 10]);
    }
  }, []);

  return (
    <MasterHapticsContext.Provider
      value={{
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