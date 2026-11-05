'use client';

import { useEffect, useState } from 'react';
import {
  saveSongDailyPlatformRankDraft,
} from '@/lib/bora-engine/manual-platform-actions';
import type {
  DailyPlatformRankDraftReadResult,
  ManualPlatform,
} from '@/lib/bora-engine/manual-platform-types';
import type { EngineRoomSong } from '@/lib/bora-engine/admin-room-read-model';

const PLATFORMS: readonly {
  readonly value: ManualPlatform;
  readonly label: string;
}[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'boomplay', label: 'Boomplay' },
];

const EMPTY_POSITIONS: Record<ManualPlatform, string> = {
  youtube: '',
  spotify: '',
  boomplay: '',
};

function messageForStatus(
  status: Awaited<ReturnType<typeof saveSongDailyPlatformRankDraft>>['status'],
): string {
  switch (status) {
    case 'saved':
      return 'Unpublished draft positions saved.';
    case 'unauthorized':
      return 'Your account is not authorized to edit platform ranks.';
    case 'configuration-unavailable':
      return 'Admin authorization or the service connection is unavailable.';
    case 'invalid-input':
      return 'Enter a positive whole-number position for all three platforms.';
    case 'snapshot-exists':
      return 'A snapshot already exists for the next EAT date. Use the roster-wide correction workflow.';
    case 'persistence-failed':
      return 'The draft could not be confirmed. Retry without changing the values.';
  }
}

export default function DailyPlatformRankDraftEditor({
  song,
  draft,
}: {
  readonly song: EngineRoomSong;
  readonly draft: DailyPlatformRankDraftReadResult;
}) {
  const [positions, setPositions] =
    useState<Record<ManualPlatform, string>>(EMPTY_POSITIONS);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (draft.status !== 'ready') return;
    const savedPositions = { ...EMPTY_POSITIONS };
    for (const entry of draft.entries) {
      if (entry.songId === song.id) {
        savedPositions[entry.platform] = String(entry.rank);
      }
    }
    setPositions(savedPositions);
  }, [draft, song.id]);

  const complete = PLATFORMS.every(({ value }) => {
    const rank = Number(positions[value]);
    return Number.isSafeInteger(rank) && rank > 0 && rank <= 2_147_483_647;
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !complete) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await saveSongDailyPlatformRankDraft({
        songId: song.id,
        entries: PLATFORMS.map(({ value }) => ({
          platform: value,
          rank: Number(positions[value]),
        })),
      });
      setMessage(messageForStatus(result.status));
      if (result.status === 'saved') {
        setMessage(
          `Unpublished draft positions saved for ${result.effectiveDate} (EAT).`,
        );
      }
    } catch (error) {
      console.error(
        '[bora-engine-song-workspace] daily rank draft save failed:',
        error instanceof Error ? error.message : 'unknown',
      );
      setMessage('The draft could not be confirmed. Retry without changing the values.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      id="platform-ranks"
      className="scroll-mt-6 border p-4 sm:p-6"
      style={{ borderColor: 'var(--bora-border)', backgroundColor: 'var(--bora-surface)' }}
    >
      <div className="mb-4">
        <p
          className="text-[7px] font-black uppercase tracking-[0.18em]"
          style={{ color: 'var(--bora-gold)' }}
        >
          Daily chart input · manual draft
        </p>
        <h2 className="mt-2 font-cinzel text-sm font-black uppercase">
          Platform positions for this song
        </h2>
        <p className="mt-2 text-[7px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
          Enter the song&apos;s position on each platform. Position 1 is highest.
          These values are drafts only: they are not verified, do not change the
          chart or Engine score, and need a complete roster review before publication.
        </p>
      </div>

      {draft.status !== 'ready' && (
        <p className="mb-3 border p-3 text-[7px]" style={{ borderColor: 'var(--bora-red)' }} role="alert">
          Saved draft values could not be loaded. No positions were substituted; any new save will be checked by the server.
        </p>
      )}
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[6px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--bora-text-subtle)' }}>
          Target EAT date: {draft.status === 'ready' ? draft.effectiveDate : 'resolved when saved'}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {PLATFORMS.map(({ value, label }) => (
            <label
              key={value}
              className="block text-[7px] font-bold uppercase tracking-[0.08em]"
            >
              {label} position
              <input
                type="number"
                min={1}
                max={2_147_483_647}
                step={1}
                required
                value={positions[value]}
                onChange={(event) => {
                  setPositions((current) => ({
                    ...current,
                    [value]: event.target.value,
                  }));
                  setMessage(null);
                }}
                className="mt-1 w-full border bg-transparent px-3 py-2.5 text-[8px] font-normal normal-case outline-none focus:border-[color:var(--bora-gold)]"
                style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text)' }}
              />
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={!complete || pending}
          className="border px-4 py-2.5 text-[7px] font-black uppercase tracking-[0.12em] disabled:opacity-50"
          style={{ borderColor: 'var(--bora-gold)', color: 'var(--bora-gold)' }}
        >
          {pending ? 'Saving…' : 'Save song rank draft'}
        </button>
        {message && (
          <p
            className="text-[7px]"
            style={{ color: message.includes('saved') ? 'var(--bora-green)' : 'var(--bora-red)' }}
            role="status"
          >
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
