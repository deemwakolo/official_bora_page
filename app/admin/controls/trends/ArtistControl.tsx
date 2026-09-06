'use client';

import React from 'react';

export default function ArtistControl() {
  return (
    <div className="w-full">

      {/* ARTIST HEADER */}

      <div
        className="mb-6 flex items-center justify-between border-b pb-4"
        style={{
          borderColor: 'var(--bora-border)',
        }}
      >
        <div>
          <p
            className="text-[10px] font-black uppercase tracking-[0.2em]"
            style={{
              color: 'var(--bora-text)',
            }}
          >
            ARTIST
          </p>

          <p
            className="mt-1 text-[8px] uppercase tracking-[0.12em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Control artist movement
          </p>
        </div>

        <span
          className="text-[8px] font-bold uppercase tracking-[0.15em]"
          style={{
            color: 'var(--bora-text-subtle)',
          }}
        >
          TRENDS_ARTIST
        </span>
      </div>

      {/* STATUS */}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

        {/* SYSTEM */}

        <div
          className="border p-5"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
          }}
        >
          <p
            className="text-[8px] font-black uppercase tracking-[0.2em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            System
          </p>

          <p
            className="mt-4 text-2xl font-black uppercase"
            style={{
              color: 'var(--bora-text)',
            }}
          >
            READY
          </p>

          <p
            className="mt-2 text-[8px] uppercase tracking-[0.12em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Artist control awaiting input
          </p>
        </div>

        {/* ARTISTS */}

        <div
          className="border p-5"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
          }}
        >
          <p
            className="text-[8px] font-black uppercase tracking-[0.2em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Artists
          </p>

          <p
            className="mt-4 text-2xl font-black"
            style={{
              color: 'var(--bora-gold)',
            }}
          >
            --
          </p>

          <p
            className="mt-2 text-[8px] uppercase tracking-[0.12em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Active artist count
          </p>
        </div>

        {/* DATA */}

        <div
          className="border p-5"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
          }}
        >
          <p
            className="text-[8px] font-black uppercase tracking-[0.2em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Data
          </p>

          <p
            className="mt-4 text-2xl font-black uppercase"
            style={{
              color: 'var(--bora-text)',
            }}
          >
            STANDBY
          </p>

          <p
            className="mt-2 text-[8px] uppercase tracking-[0.12em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Data connection comes later
          </p>
        </div>

      </div>

      {/* MAIN CONTROL WORKSPACE */}

      <div
        className="mt-3 border p-6"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >

        <div
          className="mb-6 border-b pb-4"
          style={{
            borderColor: 'var(--bora-border)',
          }}
        >
          <p
            className="text-[8px] font-black uppercase tracking-[0.2em]"
            style={{
              color: 'var(--bora-gold)',
            }}
          >
            Artist Workspace
          </p>

          <p
            className="mt-1 text-[7px] uppercase tracking-[0.12em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Editorial controls will live here
          </p>
        </div>

        <div className="grid min-h-[180px] grid-cols-1 gap-3 md:grid-cols-2">

          {/* ARTIST MOVEMENT */}

          <div
            className="flex items-center justify-center border"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor: 'var(--bora-surface-elevated)',
            }}
          >
            <div className="text-center">
              <p
                className="text-[8px] font-black uppercase tracking-[0.2em]"
                style={{
                  color: 'var(--bora-text-subtle)',
                }}
              >
                Artist Movement
              </p>

              <p
                className="mt-3 font-cinzel text-xl font-black uppercase"
                style={{
                  color: 'var(--bora-text-muted)',
                }}
              >
                Awaiting Data
              </p>
            </div>
          </div>

          {/* RANKING */}

          <div
            className="flex items-center justify-center border"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor: 'var(--bora-surface-elevated)',
            }}
          >
            <div className="text-center">
              <p
                className="text-[8px] font-black uppercase tracking-[0.2em]"
                style={{
                  color: 'var(--bora-text-subtle)',
                }}
              >
                Artist Ranking
              </p>

              <p
                className="mt-3 font-mono text-xl font-black"
                style={{
                  color: 'var(--bora-text-muted)',
                }}
              >
                --
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}