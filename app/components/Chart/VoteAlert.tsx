'use client';

import React, { useEffect, useRef, useState } from 'react';

// BORA vote popup: one instance, one countdown, one final outcome.
export interface VoteAlertData {
  token: number;
  title: string;
  type: 'up' | 'down';
  phase: 'counting' | 'waiting' | 'success' | 'failed';
  msg: string;
}

interface VoteAlertProps {
  alert: VoteAlertData | null;
}

// The countdown starts immediately when this vote alert is created.
const COUNTDOWN_MS = 2000;

// Keep the result visible briefly before the parent dismisses this alert.
const RESULT_DISPLAY_MS = 1400;

export default function VoteAlert({ alert }: VoteAlertProps) {
  const [countdownFinished, setCountdownFinished] = useState(false);
  const [ringProgress, setRingProgress] = useState(0);

  const previousTokenRef = useRef<number | null>(null);

  // Reset the countdown only when a NEW vote token arrives.
  // Phase changes for the same token must never restart the countdown.
  useEffect(() => {
    if (!alert) {
      previousTokenRef.current = null;
      setCountdownFinished(false);
      setRingProgress(0);
      return;
    }

    if (previousTokenRef.current === alert.token) {
      return;
    }

    previousTokenRef.current = alert.token;
    setCountdownFinished(false);
    setRingProgress(0);

    let frame = 0;
    let timeout = 0;
    const startedAt = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / COUNTDOWN_MS, 1);

      setRingProgress(progress);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    timeout = window.setTimeout(() => {
      setRingProgress(1);
      setCountdownFinished(true);
    }, COUNTDOWN_MS);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [alert?.token, alert]);

  if (!alert) return null;

  const isFailed = alert.phase === 'failed';
  const isSuccess = alert.phase === 'success';
  const isResolved = isFailed || isSuccess;
  const isWaiting = alert.phase === 'waiting' || (
    countdownFinished && !isResolved
  );

  const accent = isFailed ? '#ff3b30' : '#22e06a';
  const circumference = 2 * Math.PI * 18;
  const ringOffset = circumference * ringProgress;

  const message = isResolved
    ? alert.msg
    : isWaiting
      ? 'WAITING FOR VOTE RESULT'
      : alert.msg;

  return (
    <>
      <style>{`
        @keyframes va-pop {
          0% { transform: translate(-50%, 16px) scale(.96); opacity: 0; }
          100% { transform: translate(-50%, 0) scale(1); opacity: 1; }
        }

        @keyframes va-check {
          from { stroke-dashoffset: 48; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes va-x {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }

        @keyframes va-result-pop {
          0% { transform: scale(.72); opacity: .3; }
          70% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes va-pulse {
          0%, 100% { opacity: .65; }
          50% { opacity: 1; }
        }

        .va-card {
          position: fixed;
          left: 50%;
          bottom: 28px;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 20px;
          border-radius: 16px;
          background: rgba(12, 14, 20, .96);
          border: 1px solid rgba(255, 255, 255, .08);
          box-shadow: 0 12px 40px rgba(0, 0, 0, .5);
          color: #fff;
          font-family: inherit;
          animation: va-pop .18s ease-out both;
          min-width: 240px;
          max-width: calc(100vw - 32px);
          box-sizing: border-box;
          backdrop-filter: blur(12px);
        }

        .va-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: grid;
          place-items: center;
        }

        .va-ring {
          transform: rotate(-90deg);
          overflow: visible;
        }

        .va-ring circle {
          fill: none;
          stroke-width: 4;
          stroke-linecap: round;
        }

        .va-ring .track {
          stroke: rgba(255, 255, 255, .12);
        }

        .va-msg {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: .35px;
          overflow-wrap: anywhere;
        }

        .va-title {
          font-size: 11px;
          opacity: .65;
          margin-top: 4px;
          max-width: 260px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .va-result {
          animation: va-result-pop .42s cubic-bezier(.2, .8, .2, 1) both;
          transform-origin: center;
        }

        .va-waiting {
          animation: va-pulse 1s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .va-card,
          .va-result,
          .va-waiting {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="va-card"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-vote-token={alert.token}
        data-vote-type={alert.type}
        data-vote-phase={isResolved ? alert.phase : isWaiting ? 'waiting' : 'counting'}
      >
        <div className="va-icon">
          {!isResolved && !countdownFinished && (
            <svg
              className="va-ring"
              width="44"
              height="44"
              viewBox="0 0 44 44"
              aria-hidden="true"
            >
              <circle className="track" cx="22" cy="22" r="18" />
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={ringOffset}
              />
            </svg>
          )}

          {isWaiting && (
            <svg
              className="va-waiting"
              width="44"
              height="44"
              viewBox="0 0 44 44"
              aria-hidden="true"
            >
              <circle
                cx="22"
                cy="22"
                r="18"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="5 6"
              />
              <circle cx="22" cy="22" r="4" fill="#38bdf8" />
            </svg>
          )}

          {isSuccess && (
            <svg
              className="va-result"
              width="44"
              height="44"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <circle
                cx="24"
                cy="24"
                r="21"
                fill="rgba(34, 224, 106, .08)"
                stroke={accent}
                strokeWidth="2"
              />
              <path
                d="M14 25 l7 7 l13 -15"
                fill="none"
                stroke={accent}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 48,
                  animation: 'va-check .4s ease-out both',
                }}
              />
            </svg>
          )}

          {isFailed && (
            <svg
              className="va-result"
              width="44"
              height="44"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <circle
                cx="24"
                cy="24"
                r="21"
                fill="rgba(255, 59, 48, .08)"
                stroke={accent}
                strokeWidth="2"
              />
              <path
                d="M16 16 L32 32"
                fill="none"
                stroke={accent}
                strokeWidth="4"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 24,
                  animation: 'va-x .25s ease-out both',
                }}
              />
              <path
                d="M32 16 L16 32"
                fill="none"
                stroke={accent}
                strokeWidth="4"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 24,
                  animation: 'va-x .25s .12s ease-out both',
                }}
              />
            </svg>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            className="va-msg"
            style={{
              color: isResolved ? accent : '#fff',
            }}
          >
            {message}
          </div>
          <div className="va-title">
            {alert.type === 'up' ? 'UPVOTE' : 'DOWNVOTE'} · {alert.title}
          </div>
        </div>
      </div>
    </>
  );
}