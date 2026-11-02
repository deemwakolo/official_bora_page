'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getDailyPlatformRankSnapshot,
  submitDailyPlatformRanks,
} from '@/lib/bora-engine/manual-platform-actions';
import type {
  EngineRoomPlatformMappings,
  EngineRoomSong,
} from '@/lib/bora-engine/admin-room-read-model';
import type {
  DailyPlatformRankActionResult,
  DailyPlatformRankSnapshotResult,
  ManualPlatform,
} from '@/lib/bora-engine/manual-platform-types';

const PLATFORMS: readonly {
  readonly value: ManualPlatform;
  readonly label: string;
}[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'boomplay', label: 'Boomplay' },
];

function rankKey(songId: string, platform: ManualPlatform): string {
  return `${songId}:${platform}`;
}

function resultMessage(result: DailyPlatformRankActionResult): string {
  switch (result.status) {
    case 'recorded':
    case 'already-recorded':
      return `Ranks saved for EAT date ${result.effectiveDate} (revision ${result.revision}).`;
    case 'unauthorized':
      return 'Your account is not authorized to submit platform ranks.';
    case 'configuration-unavailable':
      return 'Admin authorization or the service connection is unavailable.';
    case 'invalid-input':
      return 'Every song needs a positive integer rank and evidence reference for all platforms.';
    case 'idempotency-conflict':
      return 'This retry identifier was already used with different rank data.';
    case 'outside-entry-window':
      return 'Daily rank entry is open from 20:00 until midnight EAT.';
    case 'invalid-or-incomplete-ranks':
      return 'Ranks must cover every active song and platform, with unique positions per platform.';
    case 'mapping-required':
      return 'Save a source mapping for every song and platform before submitting ranks.';
    case 'correction-required':
      return 'The daily snapshot changed. Reload it and explicitly select correction mode.';
    case 'correction-not-allowed':
      return 'A correction was supplied, but there is no existing snapshot to correct.';
    case 'rank-slot-conflict':
      return 'A different platform observation already uses this daily scoring slot.';
    case 'no-songs':
      return 'No songs are available for the daily rank snapshot.';
    case 'persistence-failed':
      return 'The rank submission could not be confirmed. Retry without changing the data.';
  }
}

export default function DailyPlatformRankEntry({
  songs,
  mappingState,
}: {
  readonly songs: readonly EngineRoomSong[];
  readonly mappingState: EngineRoomPlatformMappings;
}) {
  const [snapshot, setSnapshot] =
    useState<DailyPlatformRankSnapshotResult | null>(null);
  const [ranks, setRanks] = useState<Record<string, string>>({});
  const [evidenceReferences, setEvidenceReferences] = useState<
    Record<ManualPlatform, string>
  >({ youtube: '', spotify: '', boomplay: '' });
  const [correcting, setCorrecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);

  async function loadSnapshot() {
    setLoading(true);
    try {
      const current = await getDailyPlatformRankSnapshot();
      setSnapshot(current);
      setCorrecting(false);
      if (current.status === 'ready') {
        setRanks(
          Object.fromEntries(
            current.entries.map((entry) => [
              rankKey(entry.songId, entry.platform),
              String(entry.rank),
            ]),
          ),
        );
      } else {
        setRanks({});
      }
    } catch (error) {
      console.error(
        '[bora-engine-daily-platform-ranks] snapshot refresh failed:',
        error instanceof Error ? error.message : 'unknown',
      );
      setSnapshot({ status: 'unavailable' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSnapshot();
  }, []);

  const mappedSongPlatforms = new Set(
    mappingState.status === 'ready'
      ? mappingState.mappings.map((mapping) =>
          rankKey(mapping.songId, mapping.platform),
        )
      : [],
  );
  const allMappingsPresent = songs.every((song) =>
    PLATFORMS.every(({ value: platform }) =>
      mappedSongPlatforms.has(rankKey(song.id, platform)),
    ),
  );
  const completeRanks =
    songs.length > 0 &&
    PLATFORMS.every(({ value: platform }) => {
      const values = songs.map((song) => ranks[rankKey(song.id, platform)]);
      return (
        values.every((value) => /^\d+$/.test(value ?? '') && Number(value) > 0) &&
        new Set(values.map(Number)).size === values.length
      );
    });
  const correctionIsExplicit =
    snapshot?.status !== 'ready' || correcting;
  const canSubmit =
    !loading &&
    !pending &&
    allMappingsPresent &&
    completeRanks &&
    correctionIsExplicit &&
    snapshot?.status !== 'closed-window' &&
    snapshot?.status !== 'unauthorized' &&
    snapshot?.status !== 'unavailable';

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setMessage(null);
    requestId.current ??= crypto.randomUUID();
    try {
      const result = await submitDailyPlatformRanks({
        requestId: requestId.current,
        ...(snapshot?.status === 'ready'
          ? { supersedesSnapshotId: snapshot.snapshotId }
          : {}),
        evidenceReferences,
        entries: songs.flatMap((song) =>
          PLATFORMS.map(({ value: platform }) => ({
            songId: song.id,
            platform,
            rank: Number(ranks[rankKey(song.id, platform)]),
          })),
        ),
      });
      setMessage(resultMessage(result));
      if (result.status === 'recorded' || result.status === 'already-recorded') {
        requestId.current = null;
        await loadSnapshot();
      }
    } catch (error) {
      console.error(
        '[bora-engine-daily-platform-ranks] submission failed:',
        error instanceof Error ? error.message : 'unknown',
      );
      setMessage('The rank submission could not be confirmed. Retry without changing the data.');
    } finally {
      setPending(false);
    }
  }

  const statusMessage =
    snapshot?.status === 'closed-window'
      ? 'Entry opens daily at 20:00 EAT and closes at midnight.'
      : snapshot?.status === 'none'
        ? 'No snapshot exists for the upcoming EAT day.'
        : snapshot?.status === 'ready'
          ? `Current snapshot: ${snapshot.effectiveDate}, revision ${snapshot.revision}.`
          : snapshot?.status === 'unavailable'
            ? 'Daily rank history is unavailable.'
            : snapshot?.status === 'unauthorized'
              ? 'Administrator authorization is required.'
              : 'Loading the current EAT-day snapshot…';

  return (
    <section
      className="mt-5 border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      <header
        className="border-b px-4 py-4 sm:px-5"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <h2 className="font-cinzel text-[10px] font-black uppercase tracking-[0.14em]">
          Daily platform chart positions
        </h2>
        <p
          className="mt-2 text-[7px] leading-5"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          Enter every song’s integer position for all three platforms. Position 1 is best.
          Each rank contributes inverse-rank activity to the latest seven EAT-day window.
          This is separate from hourly vote and seed processing.
        </p>
        <p
          className="mt-2 text-[7px] font-bold"
          style={{ color: 'var(--bora-gold)' }}
          role="status"
        >
          {statusMessage}
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          {PLATFORMS.map(({ value: platform, label }) => (
            <label
              key={platform}
              className="block text-[7px] font-bold uppercase tracking-[0.08em]"
            >
              {label} evidence reference
              <input
                type="text"
                maxLength={2000}
                value={evidenceReferences[platform]}
                onChange={(event) =>
                  setEvidenceReferences((current) => ({
                    ...current,
                    [platform]: event.target.value,
                  }))
                }
                placeholder="Source report or evidence identifier"
                className="mt-1 w-full border bg-transparent px-2 py-2 text-[8px] font-normal normal-case outline-none focus:border-[color:var(--bora-gold)]"
                style={{
                  borderColor: 'var(--bora-border)',
                  color: 'var(--bora-text)',
                }}
              />
            </label>
          ))}
        </div>

        {snapshot?.status === 'ready' && (
          <label className="flex items-center gap-2 text-[8px]">
            <input
              type="checkbox"
              checked={correcting}
              onChange={(event) => setCorrecting(event.target.checked)}
            />
            I am submitting an explicit correction to this saved snapshot.
          </label>
        )}

        {!allMappingsPresent && (
          <p className="text-[8px] text-red-400" role="alert">
            Configure a platform identity for every song and platform before entering ranks.
          </p>
        )}

        <div className="overflow-x-auto border" style={{ borderColor: 'var(--bora-border)' }}>
          <table className="w-full min-w-[620px] border-collapse text-left text-[8px]">
            <thead>
              <tr style={{ color: 'var(--bora-text-muted)' }}>
                <th className="p-2">Song</th>
                {PLATFORMS.map(({ value, label }) => (
                  <th key={value} className="p-2">{label} position</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <tr key={song.id} className="border-t" style={{ borderColor: 'var(--bora-border)' }}>
                  <th className="p-2 font-normal">
                    <span className="font-bold">{song.title}</span>
                    <span className="block text-[7px]" style={{ color: 'var(--bora-text-muted)' }}>
                      {song.artist}
                    </span>
                  </th>
                  {PLATFORMS.map(({ value: platform }) => (
                    <td key={platform} className="p-2">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        required
                        value={ranks[rankKey(song.id, platform)] ?? ''}
                        onChange={(event) =>
                          setRanks((current) => ({
                            ...current,
                            [rankKey(song.id, platform)]: event.target.value,
                          }))
                        }
                        className="w-full border bg-transparent px-2 py-2 outline-none focus:border-[color:var(--bora-gold)]"
                        style={{
                          borderColor: 'var(--bora-border)',
                          color: 'var(--bora-text)',
                        }}
                        aria-label={`${song.title} ${platform} chart position`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="border px-4 py-2 text-[8px] font-black uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              borderColor: 'var(--bora-gold)',
              color: 'var(--bora-gold)',
            }}
          >
            {pending ? 'Saving ranks…' : snapshot?.status === 'ready' ? 'Save correction' : 'Save daily ranks'}
          </button>
          <button
            type="button"
            onClick={() => void loadSnapshot()}
            disabled={loading || pending}
            className="px-2 py-2 text-[8px] underline disabled:opacity-40"
          >
            Reload snapshot
          </button>
          {message && (
            <p className="text-[8px]" role="status">{message}</p>
          )}
        </div>
      </form>
    </section>
  );
}
