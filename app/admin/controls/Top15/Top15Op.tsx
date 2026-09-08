'use client';

import React from 'react';

interface Top15OpProps {
  position: number;
}

export default function Top15Op({
  position,
}: Top15OpProps) {
  return (
    <div className="p-6">
      {/* HEADER */}

      <div className="mb-6">
        <p
          className="text-[8px] font-black uppercase tracking-[0.2em]"
          style={{
            color: 'var(--bora-gold)',
          }}
        >
          Chart Entry
        </p>

        <p
          className="mt-1 text-[7px] uppercase tracking-[0.12em]"
          style={{
            color: 'var(--bora-text-subtle)',
          }}
        >
          Fill position {String(position).padStart(2, '0')}
        </p>
      </div>

      {/* SONG TITLE */}

      <div className="mb-4">
        <label
          className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
          style={{
            color: 'var(--bora-text-muted)',
          }}
        >
          Song Title
        </label>

        <input
          type="text"
          placeholder="Enter song title"
          className="w-full border px-3 py-3 text-xs outline-none"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
            color: 'var(--bora-text)',
          }}
        />
      </div>

      {/* ARTIST */}

      <div className="mb-4">
        <label
          className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
          style={{
            color: 'var(--bora-text-muted)',
          }}
        >
          Artist
        </label>

        <input
          type="text"
          placeholder="Enter artist name"
          className="w-full border px-3 py-3 text-xs outline-none"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
            color: 'var(--bora-text)',
          }}
        />
      </div>

      {/* YOUTUBE */}

      <div className="mb-4">
        <label
          className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
          style={{
            color: 'var(--bora-text-muted)',
          }}
        >
          YouTube ID
        </label>

        <input
          type="text"
          placeholder="Enter YouTube ID"
          className="w-full border px-3 py-3 text-xs outline-none"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
            color: 'var(--bora-text)',
          }}
        />
      </div>

      {/* SPOTIFY */}

      <div className="mb-6">
        <label
          className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
          style={{
            color: 'var(--bora-text-muted)',
          }}
        >
          Spotify ID
        </label>

        <input
          type="text"
          placeholder="Enter Spotify ID"
          className="w-full border px-3 py-3 text-xs outline-none"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
            color: 'var(--bora-text)',
          }}
        />
      </div>

      {/* SAVE */}

      <button
        type="button"
        className="w-full border px-4 py-3 text-[8px] font-black uppercase tracking-[0.18em] transition-all duration-200"
        style={{
          borderColor: 'var(--bora-gold)',
          backgroundColor: 'var(--bora-gold)',
          color: 'var(--bora-background)',
        }}
      >
        Save Position
      </button>
    </div>
  );
}