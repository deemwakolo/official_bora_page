'use client';

import React, { useState } from 'react';

import TapGUI from './TapGUI';
import { SongMetadata } from './TapOP';

export type MovementKind = 'up' | 'down' | 'same' | 'new';
export interface Movement { kind: MovementKind; delta?: number; }
export interface MomentSong { rank: number; movement: Movement; metadata: SongMetadata; }
export interface MomentChartData {
  title: string; periodLabel: string; date: string;
  badge?: string; songs: MomentSong[];
}
interface MomentChartProps { data: MomentChartData; paneKey: string; }

export function MomentChartHeader({ data }: { data: MomentChartData }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 text-center">
      <span className="font-cinzel text-[10px] font-black uppercase tracking-[0.42em]" style={{ color: 'var(--bora-text-subtle)' }}>BORA</span>
      <h2 className="mt-2 font-cinzel text-[22px] font-black uppercase leading-none tracking-[0.14em]" style={{ color: 'var(--bora-text)' }}>{data.title}</h2>
      <div className="mt-3 text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: 'var(--bora-gold)' }}>{data.periodLabel} CHART</div>
      <div className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.24em]" style={{ color: 'var(--bora-text-subtle)' }}>{data.date}</div>
    </div>
  );
}

function MovementBadge({ movement }: { movement: Movement }) {
  const base = 'shrink-0 text-[10px] font-black uppercase tracking-[0.12em]';
  if (movement.kind === 'up') return <span className={base} style={{ color: 'var(--bora-gold)' }}>{'\u25B2'} {movement.delta ?? 0}</span>;
  if (movement.kind === 'down') return <span className={base} style={{ color: 'var(--bora-red)' }}>{'\u25BC'} {movement.delta ?? 0}</span>;
  if (movement.kind === 'new') return <span className={base} style={{ color: 'var(--bora-gold)' }}>NEW</span>;
  return <span className={base} style={{ color: 'var(--bora-text-subtle)' }}>=</span>;
}

function Artwork({ src, className, radius = '0.65rem' }: { src: string; className: string; radius?: string }) {
  const hasImg = src.trim().length > 0;
  return (
    <span className={'flex shrink-0 items-center justify-center overflow-hidden border ' + className} style={{ borderRadius: radius, backgroundColor: '#1c1c1e', borderColor: 'var(--bora-border)' }}>
      {hasImg ? (
        <span className="h-full w-full" style={{ backgroundImage: "url('" + src + "')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      ) : (
        <span className="font-cinzel text-[15px]" style={{ color: 'var(--bora-gold)', opacity: 0.8 }}>{'\u266A'}</span>
      )}
    </span>
  );
}

export default function MomentChart({ data, paneKey }: MomentChartProps) {
  const [tapIndex, setTapIndex] = useState<number | null>(null);
  const songs = data.songs;
  const selected = tapIndex !== null ? songs[tapIndex] ?? null : null;
  const closeTap = () => setTapIndex(null);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="overflow-hidden rounded-[1.4rem] border" style={{ backgroundColor: 'var(--bora-background-deep)', borderColor: 'var(--bora-border)', boxShadow: '0 24px 60px -24px rgba(0,0,0,0.65)' }}>
        <div className="px-2 py-2 sm:px-3">
          <div className="px-3 pb-1 pt-2 text-[8px] font-black uppercase tracking-[0.32em]" style={{ color: 'var(--bora-text-subtle)' }}>Top 10</div>
          {songs.map((s) => {
            const i = songs.indexOf(s);
            return (
              <button key={s.rank} type="button" onClick={() => setTapIndex(i)} aria-label={'Open ' + s.metadata.title} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left" style={{ borderBottom: '1px solid var(--bora-border)' }}>
                <span className="w-6 shrink-0 text-center font-cinzel text-[15px] font-black" style={{ color: s.rank <= 3 ? 'var(--bora-gold)' : 'var(--bora-text-muted)' }}>{s.rank}</span>
                <Artwork src={s.metadata.artwork} className="h-11 w-11" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold leading-tight" style={{ color: 'var(--bora-text)' }}>{s.metadata.title}</span>
                  <span className="mt-0.5 block truncate text-[11px]" style={{ color: 'var(--bora-text-muted)' }}>{s.metadata.artist}</span>
                </span>
                <MovementBadge movement={s.movement} />
              </button>
            );
          })}
        </div>
      </div>
      <TapGUI song={selected ? { rank: selected.rank, metadata: selected.metadata } : null} onClose={closeTap} />
    </div>
  );
}
