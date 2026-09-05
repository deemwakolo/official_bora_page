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

export default function VoteAlert({ alert }: VoteAlertProps) {
  if (!alert) return null;

  // Kuamua kama kura ni ya kupandisha au kushusha
  const isUp = alert.type === 'up';

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none flex items-center justify-center">

      {/* BACKDROP — Inablur screen yote wakati popup iko */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-md animate-vote-screen" />

      {/* GLOW — Mwanga wa katikati kulingana na aina ya kura */}
      <div
        className={`
          absolute
          w-[500px]
          h-[260px]
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
          px-1
          py-8
          md:px-16
          md:py-10
          rounded-2xl
          bg-white/[0.3]
          backdrop-blur-2xl
          shadow-[0_20px_100px_rgba(0,0,0,0.45)]
          animate-vote-in
        "
      >
        <div className="relative flex flex-col items-center text-center">

          {/* ICON — Alama ya 👍 au 👎 */}
          <div
            className="
              text-5xl
              md:text-6xl
              leading-none
              mb-4
              drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]
              animate-vote-icon
            "
          >
            {isUp ? '👍' : '👎'}
          </div>

          {/* LABEL — Utambulisho wa signal ya BORA */}
          <span
            className={`
              text-[8px]
              md:text-[9px]
              font-mono
              font-bold
              uppercase
              tracking-[0.55em]
              mb-3
              ${
                isUp
                  ? 'text-[#D4AF37]/60'
                  : 'text-red-500/60'
              }
            `}
          >
            BORA SIGNAL
          </span>

          {/* MESSAGE — Ujumbe mkuu wa popup */}
          <h2
            className={`
              text-4xl
              md:text-6xl
              font-black
              italic
              uppercase
              tracking-[-0.05em]
              leading-none
              ${
                isUp
                  ? 'text-[#D4AF37]'
                  : 'text-red-500'
              }
            `}
          >
            {alert.msg}
          </h2>

          {/* ID — Kitambulisho cha signal */}
          <span
            className="
              mt-3
              max-w-[280px]
              truncate
              text-[9px]
              md:text-[10px]
              font-mono
              uppercase
              tracking-[0.3em]
              text-white/35
            "
          >
            {alert.id}
          </span>
        </div>
      </div>

      <style jsx>{`

        /* POPUP — Inaingia karibu instantly na kubaki snappy */
        @keyframes voteIn {
          0% {
            opacity: 0;
            transform: translateY(-60px) scale(0.96);
          }

          8% {
            opacity: 1;
            transform: translateY(-60px) scale(1);
          }

          75% {
            opacity: 1;
            transform: translateY(-60px) scale(1);
          }

          100% {
            opacity: 0;
            transform: translateY(-60px) scale(1.025);
          }
        }

        /* SCREEN — Blur ya screen inaanza mara moja */
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

        /* GLOW — Mwanga unaingia haraka nyuma ya glass */
        @keyframes voteGlow {
          0% {
            opacity: 0;
            transform: scale(0.65) translateY(-45px);
          }

          20% {
            opacity: 1;
            transform: scale(1) translateY(-45px);
          }

          75% {
            opacity: 0.8;
            transform: scale(1.08) translateY(-45px);
          }

          100% {
            opacity: 0;
            transform: scale(1.2) translateY(-45px);
          }
        }

        /* ICON — Emoji ina-pop ndani ya popup */
        @keyframes voteIcon {
          0% {
            opacity: 0;
            transform: scale(0.7) translateY(8px);
          }

          20% {
            opacity: 1;
            transform: scale(1.08) translateY(0);
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

        /* TIMING — Popup yote inatumia sekunde 1.5 */
        .animate-vote-in {
          animation: voteIn 1.5s ease-out forwards;
        }

        .animate-vote-screen {
          animation: voteScreen 1.5s ease-out forwards;
        }

        .animate-vote-glow {
          animation: voteGlow 1.5s ease-out forwards;
        }

        .animate-vote-icon {
          animation: voteIcon 1.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}