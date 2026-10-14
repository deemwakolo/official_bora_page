'use client';

import React, { useState, useEffect, useRef } from 'react';

import VoteAlert from './VoteAlert';
import ChartGUI from './ChartGUI';

interface Song {
  id?: string | number;
  slot_number?: number;
  title: string;
  artist?: string;
  cover_url: string;
  youtube_id?: string;
  momentum_score?: number;
  yt_rank?: number;
  sp_rank?: number;
  previous_rank?: number | null;
}

interface KuraProps {
  songs: Song[];
  onVote: (
    id: string,
    type: 'up' | 'down'
  ) => boolean | Promise<boolean>;
}

type VoteType = 'up' | 'down';
type VotePhase = 'counting' | 'waiting' | 'success' | 'failed';

interface VoteAlertState {
  token: number;
  title: string;
  type: VoteType;
  phase: VotePhase;
  msg: string;
}

interface VoteTransaction {
  token: number;
  songId: string;
  originalSongs: Song[];
  countdownFinished: boolean;
  result: boolean | null;
}

const COUNTDOWN_MS = 2000;
const RESULT_HOLD_MS = 1600;
const FAIL_HOLD_MS = 2600;

export default function Kura({
  songs: initialSongs = [],
  onVote,
}: KuraProps) {
  const [localSongs, setLocalSongs] = useState<Song[]>(initialSongs);
  const [alert, setAlert] = useState<VoteAlertState | null>(null);

  const tokenRef = useRef(0);
  const activeVoteRef = useRef<VoteTransaction | null>(null);

  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCountdownTimer = () => {
    if (countdownTimerRef.current !== null) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  };

  const clearDismissTimer = () => {
    if (dismissTimerRef.current !== null) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  };

  const clearTimers = () => {
    clearCountdownTimer();
    clearDismissTimer();
  };

  const dismissVoteAlert = (token: number) => {
    if (activeVoteRef.current?.token !== token) return;

    setAlert((current) =>
      current?.token === token ? null : current
    );

    activeVoteRef.current = null;
    clearTimers();
  };

  const showFinalResult = (transaction: VoteTransaction) => {
    if (activeVoteRef.current?.token !== transaction.token) return;
    if (transaction.result === null) return;

    clearDismissTimer();

    const success = transaction.result;

    setAlert((current) => {
      if (current?.token !== transaction.token) return current;

      return {
        ...current,
        phase: success ? 'success' : 'failed',
        msg: success
          ? 'VOTE REGISTERED'
          : 'VOTE NOT REGISTERED',
      };
    });

    dismissTimerRef.current = setTimeout(() => {
      dismissVoteAlert(transaction.token);
    }, success ? RESULT_HOLD_MS : FAIL_HOLD_MS);
  };

  const resolveVote = (
    transaction: VoteTransaction,
    success: boolean
  ) => {
    // An older vote must never overwrite a newer popup.
    if (activeVoteRef.current?.token !== transaction.token) return;

    transaction.result = success;

    if (transaction.countdownFinished) {
      showFinalResult(transaction);
    }
  };

  // Keep the chart data synchronized with updated props.
  useEffect(() => {
    setLocalSongs(initialSongs);
  }, [initialSongs]);

  // Clear timers when this component unmounts.
  useEffect(() => {
    return () => {
      clearTimers();
      activeVoteRef.current = null;
    };
  }, []);

  const handleVote = async (
    id: string | number | undefined,
    title: string,
    type: VoteType
  ) => {
    if (id === undefined || id === null || id === '') return;

    const songId = String(id);
    const token = ++tokenRef.current;

    // Cancel timers from the previous popup, but do not allow
    // its delayed response to overwrite this new vote.
    clearTimers();

    const transaction: VoteTransaction = {
      token,
      songId,
      originalSongs: localSongs,
      countdownFinished: false,
      result: null,
    };

    activeVoteRef.current = transaction;

    // Immediate optimistic UI update.
    setLocalSongs((currentSongs) =>
      currentSongs.map((song) => {
        if (String(song.id) !== songId) return song;

        const currentScore = Number(song.momentum_score) || 0;

        return {
          ...song,
          momentum_score:
            type === 'up'
              ? currentScore + 1
              : currentScore - 1,
        };
      })
    );

    // Create the single popup immediately.
    setAlert({
      token,
      title,
      type,
      phase: 'counting',
      msg: type === 'up' ? 'SIGNAL BOOSTING' : 'SIGNAL DROPPING',
    });

    // Start the countdown immediately. The database request
    // runs independently and must not restart this timer.
    countdownTimerRef.current = setTimeout(() => {
      if (activeVoteRef.current?.token !== token) return;

      transaction.countdownFinished = true;
      countdownTimerRef.current = null;

      if (transaction.result !== null) {
        showFinalResult(transaction);
      } else {
        setAlert((current) =>
          current?.token === token
            ? {
                ...current,
                phase: 'waiting',
                msg: 'WAITING FOR VOTE RESULT',
              }
            : current
        );
      }
    }, COUNTDOWN_MS);

    // Register the vote in the parent/backend.
    try {
      const success =
        typeof onVote === 'function'
          ? await onVote(songId, type)
          : false;

      resolveVote(transaction, success === true);
    } catch {
      resolveVote(transaction, false);
    }
  };

  return (
    <>
      <VoteAlert alert={alert} />

      <ChartGUI
        songs={localSongs.slice(0, 10)}
        onVote={handleVote}
      />
    </>
  );
}