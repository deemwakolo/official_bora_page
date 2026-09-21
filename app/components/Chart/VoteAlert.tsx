'use client';

import React from 'react';

interface VoteAlertProps {
  // Taarifa za popup ya kura
  alert: {
    id: string;
    type: 'up' | 'down';
    msg: string;
  } | null;
}

export default function VoteAlert({
  alert,
}: VoteAlertProps) {
  if (!alert) return null;

  // Kuamua kama kura ni ya kupandisha au kushusha
  const isUp = alert.type === 'up';

  return (
    <div className="pointer-events-auto fixed inset-0 z-[1000] flex items-center justify-center">
      {/* BACKDROP — Inablur screen yote wakati popup iko */}
      <div className="animate-vote-screen pointer-events-none absolute inset-0 bg-black/25 backdrop-blur-md" />

      {/* GLOW — Mwanga wa katikati kulingana na aina ya kura */}
      <div
        className={`
          pointer-events-none
          absolute
          h-[260px]
          w-[500px]
          rounded-full
          blur-[110px]
          animate-vote-glow
          ${
            isUp
              ? 'bg-[#D4AF37]/20'
              : 'bg-red-600/20'
          }
        `}
      />

      {/* GLASS — Hiki ndicho kisanduku kinachobeba ujumbe wa kura */}
      <div
        className="
          relative
          w-fit
          max-w-[90vw]
          rounded-2xl
          bg-white/[0.3]
          px-1
          py-8
          backdrop-blur-2xl
          shadow-[0_20px_100px_rgba(0,0,0,0.45)]
          animate-vote-in
          md:px-16
          md:py-10
        "
      >
        <div className="relative flex flex-col items-center text-center">
          {/* ICON */}
          <div
            className="
              mb-4
              text-5xl
              leading-none
              drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]
              animate-vote-icon
              md:text-6xl
            "
          >
            {isUp ? '👍' : '👎'}
          </div>

          {/* LABEL */}
          <span
            className={`
              mb-3
              text-[8px]
              font-mono
              font-bold
              uppercase
              tracking-[0.55em]
              md:text-[9px]
              ${
                isUp
                  ? 'text-[#D4AF37]/60'
                  : 'text-red-500/60'
              }
            `}
          >
            BORA SIGNAL
          </span>

          {/* MESSAGE */}
          <h2
            className={`
              text-4xl
              font-black
              italic
              uppercase
              leading-none
              tracking-[-0.05em]
              md:text-6xl
              ${
                isUp
                  ? 'text-[#D4AF37]'
                  : 'text-red-500'
              }
            `}
          >
            {alert.msg}
          </h2>

          {/* ID */}
          <span
            className="
              mt-3
              max-w-[280px]
              truncate
              text-[9px]
              font-mono
              uppercase
              tracking-[0.3em]
              text-white/35
              md:text-[10px]
            "
          >
            {alert.id}
          </span>

          {/* 2 SECOND RETREATING TIMER */}
          <div className="relative mt-7 h-8 w-8">
            <svg
              className="h-8 w-8 -rotate-90"
              viewBox="0 0 32 32"
            >
              {/* TRACK */}
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="2"
              />

              {/* RETREATING CIRCLE */}
              <circle
                cx="16"
                cy="16"
                r="13"
                fill="none"
                stroke={
                  isUp
                    ? '#D4AF37'
                    : '#ef4444'
                }
                strokeWidth="2"
                strokeLinecap="round"
                pathLength="100"
                strokeDasharray="100"
                strokeDashoffset="100"
                className="animate-vote-countdown"
              />
            </svg>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* POPUP */
        @keyframes voteIn {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.96);
          }

          8% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }

          75% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }

          100% {
            opacity: 0;
            transform: translateY(0) scale(1.025);
          }
        }

        /* SCREEN */
        @keyframes voteScreen {
          0% {
            opacity: 0;
          }

          8% {
            opacity: 1;
          }

          75% {
            opacity: 1;
          }

          100% {
            opacity: 0;
          }
        }

        /* GLOW */
        @keyframes voteGlow {
          0% {
            opacity: 0;
            transform: scale(0.65);
          }

          20% {
            opacity: 1;
            transform: scale(1);
          }

          75% {
            opacity: 0.8;
            transform: scale(1.08);
          }

          100% {
            opacity: 0;
            transform: scale(1.2);
          }
        }

        /* ICON */
        @keyframes voteIcon {
          0% {
            opacity: 0;
            transform: scale(0.7);
          }

          20% {
            opacity: 1;
            transform: scale(1.08);
          }

          35% {
            transform: scale(1);
          }

          75% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform: scale(1.05);
          }
        }

        /* 2 SECOND COUNTDOWN */
        @keyframes voteCountdown {
          from {
            stroke-dashoffset: 0;
          }

          to {
            stroke-dashoffset: 100;
          }
        }

        .animate-vote-in {
          animation: voteIn 2s ease-out forwards;
        }

        .animate-vote-screen {
          animation: voteScreen 2s ease-out forwards;
        }

        .animate-vote-glow {
          animation: voteGlow 2s ease-out forwards;
        }

        .animate-vote-icon {
          animation: voteIcon 2s ease-out forwards;
        }

        .animate-vote-countdown {
          animation: voteCountdown 2s linear forwards;
        }
      `}</style>
    </div>
  );
}