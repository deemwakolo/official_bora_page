'use client';

import React, { useState } from 'react';

import ThroneControl from './ThroneControl';
import YouTubeControl from './YouTubeControl';
import SpotifyControl from './SpotifyControl';
import ArtistControl from './ArtistControl';

type TrendChild =
  | 'Throne'
  | 'YouTube'
  | 'Spotify'
  | 'Artist';

const children: {
  id: TrendChild;
  label: string;
  description: string;
  symbol: string;
}[] = [
  {
    id: 'Throne',
    label: 'Throne',
    description: 'Control the current throne position',
    symbol: '♛',
  },
  {
    id: 'YouTube',
    label: 'YouTube',
    description: 'Control YouTube performance',
    symbol: '▶',
  },
  {
    id: 'Spotify',
    label: 'Spotify',
    description: 'Control Spotify performance',
    symbol: '◉',
  },
  {
    id: 'Artist',
    label: 'Artist',
    description: 'Control artist movement',
    symbol: '●',
  },
];

export default function TrendsControl() {
  const [activeChild, setActiveChild] =
    useState<TrendChild>('Throne');

  const active =
    children.find(
      (child) => child.id === activeChild
    ) ?? children[0];

  const renderActiveControl = () => {
    switch (activeChild) {
      case 'Throne':
        return <ThroneControl />;

      case 'YouTube':
        return <YouTubeControl />;

      case 'Spotify':
        return <SpotifyControl />;

      case 'Artist':
        return <ArtistControl />;

      default:
        return null;
    }
  };

  return (
    <div className="w-full">

      {/* TRENDS CONTROL HEADER */}

      <div
        className="mb-6 flex items-center justify-between border-b pb-4"
        style={{
          borderColor: 'var(--bora-border)',
        }}
      >
        <div className="flex items-center gap-3">

          <span
            className="text-[18px]"
            style={{
              color: 'var(--bora-gold)',
            }}
          >
            {active.symbol}
          </span>

          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{
                color: 'var(--bora-text)',
              }}
            >
              {active.label}
            </p>

            <p
              className="mt-1 text-[8px] uppercase tracking-[0.12em]"
              style={{
                color: 'var(--bora-text-subtle)',
              }}
            >
              {active.description}
            </p>
          </div>

        </div>

        <span
          className="text-[8px] font-bold uppercase tracking-[0.15em]"
          style={{
            color: 'var(--bora-text-subtle)',
          }}
        >
          TRENDS_{activeChild.toUpperCase()}
        </span>
      </div>

      {/* CHILD NAVIGATION */}

      <div
        className="mb-3 grid grid-cols-2 border"
        style={{
          borderColor: 'var(--bora-border)',
        }}
      >
        {children.map((child, index) => {
          const isActive =
            activeChild === child.id;

          return (
            <button
              key={child.id}
              type="button"
              onClick={() =>
                setActiveChild(child.id)
              }
              className="relative flex items-center gap-3 border-b p-4 text-left transition-all duration-300 md:p-5"
              style={{
                borderColor:
                  'var(--bora-border)',

                backgroundColor:
                  isActive
                    ? 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))'
                    : 'var(--bora-surface)',
              }}
            >

              <span
                className="text-[8px] font-black"
                style={{
                  color: isActive
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text-subtle)',
                }}
              >
                {String(index + 1).padStart(
                  2,
                  '0'
                )}
              </span>

              <span
                className="flex h-6 w-6 items-center justify-center text-[13px]"
                style={{
                  color: isActive
                    ? 'var(--bora-gold)'
                    : 'var(--bora-text-subtle)',
                }}
              >
                {child.symbol}
              </span>

              <div>
                <p
                  className="text-[9px] font-black uppercase tracking-[0.14em]"
                  style={{
                    color:
                      'var(--bora-text)',
                  }}
                >
                  {child.label}
                </p>

                <p
                  className="mt-1 text-[7px] uppercase tracking-[0.1em]"
                  style={{
                    color:
                      'var(--bora-text-subtle)',
                  }}
                >
                  Open control
                </p>
              </div>

              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px]"
                  style={{
                    backgroundColor:
                      'var(--bora-gold)',

                    boxShadow:
                      '0 0 10px var(--bora-gold-glow)',
                  }}
                />
              )}

            </button>
          );
        })}
      </div>

      {/* ACTIVE CONTROL */}

      <div
        className="border"
        style={{
          borderColor:
            'var(--bora-border)',

          backgroundColor:
            'var(--bora-surface)',
        }}
      >
        {renderActiveControl()}
      </div>

    </div>
  );
}