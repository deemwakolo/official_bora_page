'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
} from 'react';

interface MasterSoundContextValue {
  playVotePing: () => void;
  playShushaPing: () => void;
}

const MasterSoundContext =
  createContext<MasterSoundContextValue | null>(null);

export function MasterSoundProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const voteAudioRef =
    useRef<HTMLAudioElement | null>(null);

  const shushaAudioRef =
    useRef<HTMLAudioElement | null>(null);

  const playVotePing = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!voteAudioRef.current) {
      voteAudioRef.current = new Audio(
        '/assets/bellup.mp3'
      );

      voteAudioRef.current.volume = 0.20;
    }

    const audio = voteAudioRef.current;

    // ALLOW RAPID REPEATED VOTES
    audio.currentTime = 0;

    void audio.play().catch((error) => {
      console.warn(
        'BORA_SOUND_PLAYBACK_BLOCKED:',
        error
      );
    });
  }, []);

  const playShushaPing = useCallback(() => {
    if (typeof window === 'undefined') return;

    if (!shushaAudioRef.current) {
      shushaAudioRef.current = new Audio(
        '/assets/belldown.mp3'
      );

      shushaAudioRef.current.volume = 0.20;
    }

    const audio = shushaAudioRef.current;

    // ALLOW RAPID REPEATED SHUSHA
    audio.currentTime = 0;

    void audio.play().catch((error) => {
      console.warn(
        'BORA_SHUSHA_SOUND_PLAYBACK_BLOCKED:',
        error
      );
    });
  }, []);

  return (
    <MasterSoundContext.Provider
      value={{
        playVotePing,
        playShushaPing,
      }}
    >
      {children}
    </MasterSoundContext.Provider>
  );
}

export function useMasterSound() {
  const context = useContext(
    MasterSoundContext
  );

  if (!context) {
    throw new Error(
      'useMasterSound must be used inside MasterSoundProvider'
    );
  }

  return context;
}