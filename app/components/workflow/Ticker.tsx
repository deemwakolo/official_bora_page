'use client';

import React from 'react';

type Section = 'top10' | 'trends' | 'discover' | 'news';

interface TickerProps {
  activeSection: Section;
}

export default function Ticker({
  activeSection,
}: TickerProps) {
  // UJUMBE WA KILA SECTION YA BORA
  const sectionMessages = {
    top10: [
      {
        label: 'ACTION',
        text: 'PIGA KURA SASA — BONYEZA PANDISHA KUINUA WIMBO',
      },
      {
        label: 'MOVE',
        text: 'DIAMOND APANDA NAFASI NNE',
      },
      {
        label: 'SIGNAL',
        text: 'KURA YAKO INAWEZA KUBADILISHA CHART',
      },
    ],

    trends: [
      {
        label: 'PULSE',
        text: 'HAPA UTAONA TRENDS ZINAZOSONGA SASA',
      },
      {
        label: 'STREAK',
        text: 'SIELEWI YAKAA NAMBA MOJA WIKI MBILI',
      },
      {
        label: 'RISING',
        text: 'WASANII NA NYIMBO WANAOPANDA KWA KASI',
      },
    ],

    discover: [
      {
        label: 'DISCOVER',
        text: 'GUNDUA NYIMBO NA WASANII WANAOIBUKA',
      },
      {
        label: 'FRESH',
        text: 'RELEASE MPYA ZINAZOANZA KUVUTA ATTENTION',
      },
      {
        label: 'WATCH',
        text: 'KUNA KITU KIPYA KINACHOANZA KUSONGA',
      },
    ],

    news: [
      {
        label: 'BRIEFING',
        text: 'HAPA NDIPO UNAPOPATA KINACHOTOKEA KWENYE MUZIKI',
      },
      {
        label: 'ARTIST',
        text: 'HABARI NA MATUKIO YA WASANII',
      },
      {
        label: 'INDUSTRY',
        text: 'KINACHOTOKEA KWENYE SEKTA YA MUZIKI TANZANIA',
      },
    ],
  };

  // KUCHAGUA UJUMBE WA SECTION ILIYO ACTIVE
  const messages = sectionMessages[activeSection];

  // KURUDUFISHA DATA ILI TICKER IENDELEE BILA KUKATIKA
  const stream = [...messages, ...messages];

  return (
    <div
      className="relative flex h-[28px] w-full items-center overflow-hidden border-y"
      style={{
        backgroundColor: 'var(--bora-surface)',
        borderColor: 'var(--bora-border-strong)',
        color: 'var(--bora-text)',
      }}
    >
      {/* BACKGROUND YA TICKER */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url('https://www.transparenttextures.com/patterns/carbon-fibre.png')",
        }}
      />

      {/* TAG YA SECTION */}
      <div
        className="relative z-20 flex h-full shrink-0 items-center gap-1 px-2"
        style={{
          backgroundColor: 'var(--bora-red)',
          boxShadow:
            '3px 0 8px var(--bora-red-glow)',
        }}
      >
        <div
          className="h-[3px] w-[3px] animate-pulse rounded-full"
          style={{
            backgroundColor: 'var(--bora-text)',
          }}
        />

        <span
          className="text-[7px] font-black uppercase tracking-[0.16em]"
          style={{
            color: 'var(--bora-text)',
          }}
        >
          {activeSection === 'top10'
            ? 'ACTION'
            : activeSection === 'trends'
              ? 'PULSE'
              : activeSection === 'discover'
                ? 'DISCOVER'
                : 'BRIEFING'}
        </span>
      </div>

      {/* UJUMBE UNAOSOGEA */}
      <div className="flex whitespace-nowrap animate-stream hover:[animation-play-state:paused]">
        {stream.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2.5 px-4"
          >
            {/* LABEL YA UJUMBE */}
            <span
              className="border-b text-[7px] font-mono font-bold uppercase tracking-[0.16em]"
              style={{
                color: 'var(--bora-gold)',
                borderColor: 'var(--bora-gold)',
                opacity: 0.7,
              }}
            >
              [{item.label}]
            </span>

            {/* TAARIFA */}
            <span
              className="text-[9px] font-medium uppercase tracking-[0.07em] md:text-[10px]"
              style={{
                color: 'var(--bora-text-muted)',
              }}
            >
              {item.text}
            </span>

            {/* DIVIDER YA KATI */}
            <div className="ml-1 flex gap-[3px]">
              <div
                className="h-[2px] w-[2px] rotate-45"
                style={{
                  backgroundColor:
                    'var(--bora-text-subtle)',
                }}
              />

              <div
                className="h-[2px] w-[2px] rotate-45"
                style={{
                  backgroundColor: 'var(--bora-red)',
                }}
              />

              <div
                className="h-[2px] w-[2px] rotate-45"
                style={{
                  backgroundColor:
                    'var(--bora-text-subtle)',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ANIMATION YA TICKER */}
      <style jsx global>{`
        @keyframes stream {
          0% {
            transform: translateX(0);
          }

          100% {
            transform: translateX(-50%);
          }
        }

        .animate-stream {
          display: flex;
          width: max-content;
          animation: stream 45s linear infinite;
        }
      `}</style>
    </div>
  );
}