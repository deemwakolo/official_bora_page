import Link from 'next/link';
import { Activity, ArrowLeft } from 'lucide-react';

export default function EngineRoomHeader() {
  return (
    <header
      className="relative isolate overflow-hidden border-b"
      style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-background-deep)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-top bg-no-repeat opacity-[0.24]"
        style={{
          backgroundImage: "url('/assets/Tinga.png')",
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--bora-background) 35%, transparent), var(--bora-background-deep))',
        }}
      />
      <div className="relative z-10 mx-auto flex h-[68px] w-full max-w-7xl items-center justify-between px-4 md:px-8">
        <Link href="/admin/room-selector" className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center border"
            style={{ borderColor: 'var(--bora-red)', color: 'var(--bora-gold)' }}
          >
            <Activity size={15} aria-hidden />
          </span>
          <span>
            <span className="block font-cinzel text-[11px] font-black uppercase tracking-[0.18em]">
              BORA
            </span>
            <span className="mt-1 block text-[6px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--bora-text-subtle)' }}>
              Engine Room
            </span>
          </span>
        </Link>
        <Link
          href="/admin/room-selector"
          className="inline-flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.12em]"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          <ArrowLeft size={12} aria-hidden />
          Rooms
        </Link>
      </div>
    </header>
  );
}
