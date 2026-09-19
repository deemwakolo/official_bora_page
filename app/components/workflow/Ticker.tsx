'use client';

import React from 'react';

type Section =
  | 'charts'
  | 'trending'
  | 'vote'
  | 'updates'
  | 'profile';

interface TickerProps {
  activeSection: Section;
}

const sectionMessages: Record<
  Section,
  { label: string; text: string }[]
> = {
  charts: [
    {
      label: 'CHART',
      text: 'CHART YA BORA INASONGA KULINGANA NA SIGNAL ZA MUZIKI',
    },
    {
      label: 'RANK',
      text: 'ANGALIA NYIMBO ZINAZOONGOZA CHART',
    },
    {
      label: 'SIGNAL',
      text: 'BORA INAFUATILIA MWENDO WA NYIMBO',
    },
  ],

  trending: [
    {
      label: 'PULSE',
      text: 'HAPA UTAONA TRENDS ZINAZOSONGA SASA',
    },
    {
      label: 'RISING',
      text: 'WASANII NA NYIMBO WANAOPANDA KWA KASI',
    },
    {
      label: 'TREND',
      text: 'FUATILIA SIGNAL KUTOKA KWENYE PLATFORMS',
    },
  ],

  vote: [
    {
      label: 'ACTION',
      text: 'PIGA KURA SASA — BONYEZA PANDISHA KUINUA WIMBO',
    },
    {
      label: 'MOVE',
      text: 'KURA YAKO INAWEZA KUBADILISHA CHART',
    },
    {
      label: 'SIGNAL',
      text: 'KILA KURA INAONGEZA SIGNAL KWENYE REALTIME CHART',
    },
  ],

  updates: [
    {
      label: 'BRIEFING',
      text: 'HAPA NDIPO UNAPOPATA KINACHOTOKEA KWENYE MUZIKI',
    },
    {
      label: 'ARTIST',
      text: 'HABARI NA MATUKIO YA WASANII',
    },
    {
      label: 'FRESH',
      text: 'RELEASE MPYA NA MATUKIO YANAYOANZA KUSONGA',
    },
  ],

  profile: [
    {
      label: 'PROFILE',
      text: 'PROFILE YA BORA ITAKUJA BAADAYE',
    },
    {
      label: 'BORA',
      text: 'SEHEMU YAKO YA BORA INAJENGWA',
    },
    {
      label: 'NEXT',
      text: 'FEATURES ZA PROFILE ZITAFUNGULIWA BAADAYE',
    },
  ],
};

const sectionTags: Record<Section, string> = {
  charts: 'CHART',
  trending: 'PULSE',
  vote: 'ACTION',
  updates: 'BRIEFING',
  profile: 'PROFILE',
};

export default function Ticker({
  activeSection,
}: TickerProps) {
  // NORMALIZE SECTION ILI OLD / UNEXPECTED VALUES ZISIVUNJE TICKER
  const safeSection: Section =
    activeSection in sectionMessages
      ? activeSection
      : 'charts';

  // CHAGUA UJUMBE WA SECTION ILIYO ACTIVE
  const messages = sectionMessages[safeSection];

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
          boxShadow: '3px 0 8px var(--bora-red-glow)',
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
          {sectionTags[safeSection]}
        </span>
      </div>

      {/* UJUMBE UNAOSOGEA */}
      <div className="flex whitespace-nowrap animate-stream hover:[animation-play-state:paused]">
        {stream.map((item, index) => (
          <div
            key={`${safeSection}-${index}`}
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