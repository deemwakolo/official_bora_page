'use client';

import React from 'react';

import { MomentOPData } from './MomentOP';

interface TopThroneProps {
  data: MomentOPData;
}

function PlatformBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border px-3 py-1 text-[8px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--bora-text-muted)', borderColor: 'var(--bora-border-strong)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
      {label}
    </span>
  );
}

export default function TopThrone({ data }: TopThroneProps) {
  const top = data.songs[0] ?? null;
  if (!top) return null;
  const m = top.metadata;
  const platforms = [
    { id: 'youtube', label: 'YouTube', url: m.youtube },
    { id: 'spotify', label: 'Spotify', url: m.spotify },
    { id: 'boomplay', label: 'Boomplay', url: m.boomplay },
  ].filter((p) => p.url && p.url.trim().length > 0);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-[1.4rem] border" style={{ backgroundColor: '#050505', borderColor: 'var(--bora-border)', boxShadow: '0 24px 60px -24px rgba(0,0,0,0.8)' }}>
        {m.artwork ? (
          <span className="pointer-events-none absolute inset-0" style={{ backgroundImage: "url('" + m.artwork + "')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.22 }} />
        ) : null}
        <span className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 30%, rgba(212,175,55,0.16), transparent 70%)' }} />
        <span aria-hidden className="pointer-events-none absolute right-4 top-2 select-none font-cinzel text-[92px] font-black leading-none" style={{ color: 'var(--bora-gold)', opacity: 0.10 }}>{'\u265B'}</span>
        <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.72))' }} />
        <div className="relative px-6 pb-6 pt-10 text-center sm:px-10">
          <div className="text-[8px] font-black uppercase tracking-[0.34em]" style={{ color: 'var(--bora-gold)' }}>Number One &mdash; {data.periodLabel}</div>
          <h2 className="mx-auto mt-4 max-w-xl font-cinzel text-[30px] font-black uppercase leading-[1.05] tracking-[0.04em] sm:text-[38px]" style={{ background: 'linear-gradient(to bottom, #f6e27a, var(--bora-gold) 55%, #8a6a1f)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
            {m.title}
          </h2>
          <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--bora-text)' }}>{m.artist}</div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {platforms.map((p) => <PlatformBadge key={p.id} label={p.label} />)}
          </div>
          <div className="mx-auto mt-6 h-px w-24" style={{ backgroundColor: 'var(--bora-gold)', opacity: 0.6 }} />
          <div className="mt-3 text-[8px] font-bold uppercase tracking-[0.26em]" style={{ color: 'var(--bora-text-subtle)' }}>{data.date}</div>
        </div>
      </div>
    </div>
  );
}
