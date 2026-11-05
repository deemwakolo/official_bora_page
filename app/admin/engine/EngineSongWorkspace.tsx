'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ImagePlus, Save, TrendingDown, TrendingUp } from 'lucide-react';
import { updateSlot } from '@/lib/admin-actions';
import type {
  EngineRoomCurrentHourInputs,
  EngineRoomPlatformMappings,
  EngineRoomSong,
  EngineRoomSongEngineInputs,
} from '@/lib/bora-engine/admin-room-read-model';
import ManualPlatformEntry from './ManualPlatformEntry';

function hourLabel(hourIndex: number): string {
  const date = new Date(hourIndex * 3_600_000);
  return Number.isNaN(date.getTime()) ? `UTC hour ${hourIndex}` : date.toLocaleString();
}

export default function EngineSongWorkspace({
  song,
  platformMappings,
  engineInputs,
  currentHourInputs,
  returnCategory,
}: {
  readonly song: EngineRoomSong;
  readonly platformMappings: EngineRoomPlatformMappings;
  readonly engineInputs: EngineRoomSongEngineInputs;
  readonly currentHourInputs: EngineRoomCurrentHourInputs;
  readonly returnCategory: 'songs' | 'premium';
}) {
  const router = useRouter();
  const [coverUrl, setCoverUrl] = useState(song.coverUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const currentSongInput =
    currentHourInputs.status === 'ready'
      ? currentHourInputs.songs.find((input) => input.songId === song.id) ?? null
      : null;
  const returnHref =
    returnCategory === 'premium'
      ? '/admin/engine?category=premium'
      : '/admin/engine';

  useEffect(() => setCoverUrl(song.coverUrl), [song.coverUrl]);

  async function saveSong(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const formData = new FormData(event.currentTarget);
    const selectedFile = formData.get('cover');
    setPending(true);
    setMessage(null);
    try {
      const result = await updateSlot(formData);
      if (!result.success) {
        setMessage(result.error || 'Song details could not be saved.');
        return;
      }
      if (selectedFile instanceof File && selectedFile.size > 0) {
        setCoverUrl('');
      }
      setPreviewUrl(null);
      setMessage('Song details saved.');
      router.refresh();
    } catch (error) {
      console.error('[bora-engine-song-workspace] song update failed:', error);
      setMessage('Song details could not be confirmed. Retry without changing the fields.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden pb-24" style={{ backgroundColor: 'var(--bora-background)', color: 'var(--bora-text)' }}>
      <header className="relative overflow-hidden border-b" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-background-deep)' }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-cover bg-top bg-no-repeat opacity-35"
          style={{
            backgroundImage: "url('/assets/Tinga.png')",
            maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
          }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-6 pt-5 md:px-8">
          <Link href={returnHref} className="inline-flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--bora-text-muted)' }}>
            <ArrowLeft size={12} aria-hidden />
            Engine Room
          </Link>
          <div className="mt-5 flex items-center gap-5 sm:gap-8">
            <div
              role="img"
              aria-label={song.coverUrl ? `${song.title} artwork` : 'No song artwork'}
              className="relative h-[92px] w-[92px] shrink-0 rounded-full border bg-cover bg-center shadow-2xl sm:h-[120px] sm:w-[120px] md:h-[152px] md:w-[152px]"
              style={{
                borderColor: 'color-mix(in srgb, var(--bora-gold) 40%, transparent)',
                backgroundColor: 'var(--bora-surface)',
                backgroundImage: previewUrl
                  ? `url("${previewUrl}")`
                  : song.coverUrl
                    ? `url("${song.coverUrl.replaceAll('"', '%22')}")`
                    : undefined,
              }}
            />
            <div className="min-w-0">
              <p className="text-[7px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--bora-gold)' }}>
                Engine song workspace · slot {song.slotNumber}
              </p>
              <h1 className="mt-2 break-words font-cinzel text-2xl font-black uppercase leading-[0.95] tracking-[-0.05em] sm:text-4xl md:text-5xl">
                {song.title}
              </h1>
              <p className="mt-3 break-words font-cinzel text-[8px] font-bold uppercase tracking-[0.2em] sm:text-[9px]" style={{ color: 'var(--bora-text-muted)' }}>
                {song.artist}
              </p>
            </div>
          </div>
          <nav aria-label="Song workspace sections" className="mt-5 flex flex-wrap gap-2">
            {[
              ['#song-details', 'Edit song details'],
              ['#engine-inputs', 'Engine history'],
              ['#platform-evidence', 'Edit platform evidence'],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="border px-3 py-2 text-[6px] font-black uppercase tracking-[0.12em] transition-colors hover:border-[color:var(--bora-gold)]"
                style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text-muted)' }}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8">
        <section className="border p-4 sm:p-6" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'color-mix(in srgb, var(--bora-surface) 58%, transparent)' }}>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[7px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--bora-gold)' }}>
                Performance
              </p>
              <h2 className="mt-2 font-cinzel text-sm font-black uppercase">Current Engine hour</h2>
            </div>
            <p className="text-[6px] font-mono uppercase tracking-[0.12em]" style={{ color: 'var(--bora-text-subtle)' }}>
              {currentHourInputs.status === 'ready'
                ? `UTC hour ${currentHourInputs.referenceHour}`
                : 'Current-hour data unavailable'}
            </p>
          </div>
          {currentHourInputs.status === 'ready' && currentSongInput ? (
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="border p-4" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-background-deep)' }}>
                <p className="text-[6px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--bora-text-subtle)' }}>Seed C</p>
                <p className="mt-2 font-mono text-2xl font-black tabular-nums text-[var(--bora-gold)]">{currentSongInput.seedC ?? '—'}</p>
                <p className="mt-2 text-[6px] uppercase" style={{ color: currentSongInput.seedProvenance === 'synthetic-demo-v1' ? 'var(--bora-gold)' : 'var(--bora-text-subtle)' }}>
                  {currentSongInput.seedProvenance ?? (currentSongInput.seedC === null ? 'No seed recorded' : 'Unverified')}
                </p>
              </div>
              <div className="border p-4" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-background-deep)' }}>
                <p className="text-[6px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--bora-text-subtle)' }}>Accepted upvotes</p>
                <p className="mt-2 font-mono text-2xl font-black tabular-nums"><TrendingUp size={15} className="mr-1 inline" style={{ color: 'var(--bora-gold)' }} aria-hidden />{currentSongInput.upvotes}</p>
              </div>
              <div className="border p-4" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-background-deep)' }}>
                <p className="text-[6px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--bora-text-subtle)' }}>Accepted downvotes</p>
                <p className="mt-2 font-mono text-2xl font-black tabular-nums"><TrendingDown size={15} className="mr-1 inline" style={{ color: 'var(--bora-red)' }} aria-hidden />{currentSongInput.downvotes}</p>
              </div>
              <div className="border p-4" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-background-deep)' }}>
                <p className="text-[6px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--bora-text-subtle)' }}>Lifecycle</p>
                <p className="mt-2 font-cinzel text-lg font-black">{currentSongInput.lifecycle}</p>
                <p className="mt-2 text-[6px] uppercase" style={{ color: 'var(--bora-text-subtle)' }}>Engine roster state</p>
              </div>
            </div>
          ) : (
            <p className="border p-4 text-[7px]" style={{ borderColor: currentHourInputs.status === 'ready' ? 'var(--bora-border)' : 'var(--bora-red)', color: currentHourInputs.status === 'ready' ? 'var(--bora-text-muted)' : 'var(--bora-red)' }} role={currentHourInputs.status === 'ready' ? undefined : 'alert'}>
              {currentHourInputs.status === 'ready'
                ? 'No current-hour Engine row exists for this song.'
                : 'Current-hour performance could not be loaded.'}
            </p>
          )}
        </section>

        <section id="engine-inputs" className="scroll-mt-6 border p-4 sm:p-6" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-surface)' }}>
          <div className="mb-4">
            <p className="text-[7px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--bora-gold)' }}>
              Registry details
            </p>
            <h2 className="mt-2 font-cinzel text-sm font-black uppercase">Artwork and song identity</h2>
          </div>
          <form onSubmit={saveSong} className="grid gap-4 md:grid-cols-[180px_1fr]">
            <div
              className="aspect-square w-full border bg-cover bg-center"
              style={{
                borderColor: 'var(--bora-border)',
                backgroundColor: 'var(--bora-background-deep)',
                backgroundImage: previewUrl
                  ? `url("${previewUrl}")`
                  : coverUrl
                    ? `url("${coverUrl.replaceAll('"', '%22')}")`
                    : undefined,
              }}
              aria-label="Artwork preview"
            />
            <div className="space-y-3">
              <input type="hidden" name="slot_number" value={song.slotNumber} />
              <input type="hidden" name="yt_views" value={song.youtubeViews} />
              <input type="hidden" name="sp_plays" value={song.spotifyPlays} />
              <input type="hidden" name="momentum_score" value={song.momentumScore} />
              <input type="hidden" name="existing_cover_url" value={coverUrl} />
              <label className="block text-[7px] font-bold uppercase tracking-[0.08em]">
                Song title
                <input
                  name="title"
                  defaultValue={song.title}
                  required
                  maxLength={200}
                  className="mt-1 w-full border bg-transparent px-3 py-2.5 text-[8px] font-normal normal-case outline-none focus:border-[color:var(--bora-gold)]"
                  style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text)' }}
                />
              </label>
              <label className="block text-[7px] font-bold uppercase tracking-[0.08em]">
                Artist
                <input
                  name="artist"
                  defaultValue={song.artist}
                  required
                  maxLength={200}
                  className="mt-1 w-full border bg-transparent px-3 py-2.5 text-[8px] font-normal normal-case outline-none focus:border-[color:var(--bora-gold)]"
                  style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text)' }}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 border px-3 py-3 text-[7px] font-black uppercase tracking-[0.1em]" style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text-muted)' }}>
                <ImagePlus size={14} style={{ color: 'var(--bora-gold)' }} aria-hidden />
                Choose artwork
                <input
                  name="cover"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const nextPreview = URL.createObjectURL(file);
                    setPreviewUrl((previous) => {
                      if (previous) URL.revokeObjectURL(previous);
                      return nextPreview;
                    });
                  }}
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 border px-4 py-2.5 text-[7px] font-black uppercase tracking-[0.12em] disabled:opacity-50"
                style={{ borderColor: 'var(--bora-gold)', color: 'var(--bora-gold)' }}
              >
                <Save size={13} aria-hidden />
                {pending ? 'Saving…' : 'Save song details'}
              </button>
              {message && (
                <p className="text-[7px]" style={{ color: message.includes('saved') ? 'var(--bora-green)' : 'var(--bora-red)' }} role="status">
                  {message}
                </p>
              )}
            </div>
          </form>
        </section>

        <section id="song-details" className="scroll-mt-6 border p-4 sm:p-6" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-surface)' }}>
          <div className="mb-4">
            <p className="text-[7px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--bora-gold)' }}>
              Engine inputs
            </p>
            <h2 className="mt-2 font-cinzel text-sm font-black uppercase">Seed history and state</h2>
          </div>
          {engineInputs.status === 'ready' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Lifecycle', engineInputs.lifecycle],
                  ['Historical K', engineInputs.k],
                  ['Persistent Kura', Number(engineInputs.persistentKura).toFixed(3)],
                ].map(([label, value]) => (
                  <div key={label} className="border p-3" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-background-deep)' }}>
                    <p className="text-[6px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--bora-text-subtle)' }}>{label}</p>
                    <p className="mt-2 text-[9px] font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 border" style={{ borderColor: 'var(--bora-border)' }}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-3" style={{ borderColor: 'var(--bora-border)' }}>
                  <p className="text-[7px] font-black uppercase tracking-[0.12em]">Seeded C by UTC hour</p>
                  <p className="text-[6px]" style={{ color: 'var(--bora-text-subtle)' }}>
                    Engine head: {hourLabel(engineInputs.referenceHour)}
                  </p>
                </div>
                {engineInputs.seedHours.length > 0 ? (
                  <div className="max-h-64 overflow-auto">
                    {engineInputs.seedHours.map((seed) => (
                      <div key={seed.hourIndex} className="flex items-center justify-between gap-3 border-b px-3 py-2 last:border-b-0" style={{ borderColor: 'var(--bora-border)' }}>
                        <span className="text-[7px]" style={{ color: 'var(--bora-text-muted)' }}>{hourLabel(seed.hourIndex)}</span>
                        <span className="font-mono text-[8px] font-bold">C {seed.c}</span>
                        <span className="text-[6px] uppercase" style={{ color: seed.source === 'SEED' ? 'var(--bora-gold)' : 'var(--bora-text-subtle)' }}>
                          {seed.source} · {seed.lifecycle}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="px-3 py-5 text-[7px]" style={{ color: 'var(--bora-text-muted)' }}>
                    No seed-hour records are stored for this song.
                  </p>
                )}
              </div>
              <p className="mt-3 text-[6px] leading-5" style={{ color: 'var(--bora-text-subtle)' }}>
                Seed inputs are hour-specific (0–2 C). Existing synthetic history
                remains visibly identified and is not changed by this editor.
              </p>
            </>
          ) : (
            <p className="border p-4 text-[7px]" style={{ borderColor: 'var(--bora-red)', color: 'var(--bora-red)' }} role="alert">
              Engine state could not be loaded. No defaults were substituted.
            </p>
          )}
        </section>

        <section id="platform-evidence" className="scroll-mt-6 border p-4 sm:p-6" style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-surface)' }}>
          <div className="mb-4">
            <p className="text-[7px] font-black uppercase tracking-[0.18em]" style={{ color: 'var(--bora-gold)' }}>
              Platform performance
            </p>
            <h2 className="mt-2 font-cinzel text-sm font-black uppercase">Identity and evidence for this song</h2>
          </div>
          <ManualPlatformEntry songs={[song]} mappingState={platformMappings} />
        </section>
      </div>
    </main>
  );
}
