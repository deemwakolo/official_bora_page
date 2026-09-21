'use client';

import React, { useEffect } from 'react';

import {
  TapTarget,
  platformLinks,
} from './TapOP';

interface TapGUIProps {
  song: TapTarget | null;
  onClose: () => void;
}

// TAP GUI — metadata ya song iliyochaguliwa pekee.
// HAKUNA BORA score/points/K/XP hapa.
export default function TapGUI({
  song,
  onClose,
}: TapGUIProps) {
  useEffect(() => {
    if (!song) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [song, onClose]);

  if (!song) return null;

  const { metadata } = song;
  const links = platformLinks(metadata);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">

      {/* BACKDROP */}
      <button
        type="button"
        aria-label="Close song info"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      {/* PANEL */}
      <div
        className="relative max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border p-5 sm:rounded-[28px]"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--bora-background-deep) 96%, transparent)',
          borderColor: 'var(--bora-border)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
        }}
      >

        {/* PANEL HEADER */}
        <div className="mb-5 flex items-start justify-between gap-4">

          <span
            className="text-[8px] font-black uppercase tracking-[0.3em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            SONG INFO
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close song info"
            className="flex h-9 items-center gap-2 rounded-full border px-4 text-[8px] font-black uppercase tracking-[0.22em]"
            style={{
              color: 'var(--bora-text)',
              borderColor: 'var(--bora-border-strong)',
            }}
          >
            CLOSE ✕
          </button>

        </div>

        {/* COVER + TITLE */}
        <div className="flex items-center gap-4">

          <span
            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--bora-surface-elevated) 80%, transparent)',
              borderColor:
                'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
            }}
          >
            {metadata.artwork ? (
              <span
                className="h-full w-full"
                style={{
                  backgroundImage: `url('${metadata.artwork}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            ) : (
              <span
                className="font-cinzel text-2xl"
                style={{ color: 'var(--bora-gold)' }}
              >
                ♪
              </span>
            )}
          </span>

          <div className="flex min-w-0 flex-1 flex-col">

            <span className="font-cinzel text-base font-bold leading-tight tracking-[0.1em]">
              {metadata.title}
            </span>

            <span
              className="mt-2 truncate text-[9px] font-bold uppercase tracking-[0.22em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              {metadata.artist}
            </span>

            <span
              className="mt-2 text-[8px] font-black uppercase tracking-[0.22em]"
              style={{ color: 'var(--bora-gold)' }}
            >
              #{song.rank}
            </span>

          </div>

        </div>

        {/* METADATA ROWS */}
        <div className="mt-5 flex flex-col gap-2">

          <MetaRow
            label="FEATURE"
            value={metadata.feature}
          />

          <MetaRow
            label="PRODUCER"
            value={metadata.producer}
          />

          <MetaRow
            label="RELEASE DATE"
            value={metadata.releaseDate}
          />

          <MetaRow
            label="GENRE"
            value={metadata.genre}
          />

        </div>

        {/* PLATFORM LINKS */}
        <div className="mt-5">

          <span
            className="text-[8px] font-black uppercase tracking-[0.3em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            LISTEN ON
          </span>

          <div className="mt-3 flex flex-wrap gap-2">

            {links.map((link) =>
              link.url ? (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border px-4 py-2 text-[8px] font-black uppercase tracking-[0.22em]"
                  style={{
                    color: 'var(--bora-gold)',
                    borderColor:
                      'color-mix(in srgb, var(--bora-border-strong) 80%, transparent)',
                  }}
                >
                  {link.label}
                </a>
              ) : (
                <span
                  key={link.id}
                  className="rounded-full border px-4 py-2 text-[8px] font-black uppercase tracking-[0.22em]"
                  style={{
                    color: 'var(--bora-text-subtle)',
                    borderColor: 'var(--bora-border)',
                    opacity: 0.7,
                  }}
                >
                  {link.label}
                </span>
              )
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--bora-surface-elevated) 60%, transparent)',
        borderColor: 'var(--bora-border)',
      }}
    >
      <span
        className="text-[8px] font-black uppercase tracking-[0.24em]"
        style={{ color: 'var(--bora-text-subtle)' }}
      >
        {label}
      </span>

      <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.16em]">
        {value}
      </span>
    </div>
  );
}