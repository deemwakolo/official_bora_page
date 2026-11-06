'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  FileClock,
  Gauge,
  LockKeyhole,
  Radio,
  ShieldAlert,
} from 'lucide-react';
import type {
  EngineRoomCurrentHourInputs,
  EngineRoomPlatformMappings,
  EngineRoomOperationsSnapshot,
  EngineRoomSongList,
} from '@/lib/bora-engine/admin-room-read-model';
import DailyRankPublicationControl from './DailyRankPublicationControl';
import type { PlatformSourceAssessment } from '@/lib/bora-engine/source-readiness';
import EngineRoomNavbar, {
  type EngineRoomSection,
} from './EngineRoomNavbar';
import EngineRoomHeader from './EngineRoomHeader';
import EngineRoomWorkspace from './EngineRoomWorkspace';
import {
  runSecureVoteReconciliation,
  type RunSecureVoteReconciliationResult,
} from '@/lib/bora-engine/vote-event-reconciliation-action';
import { toggleBoraChartHoldSong } from '@/lib/bora-engine/chart-hold-actions';

type RoomSection = EngineRoomSection;
type OperationsSection =
  | 'overview'
  | 'coverage'
  | 'processing'
  | 'publications';

interface EngineRoomAccess {
  readonly isAdministrator: boolean;
  readonly isOperator: boolean;
  readonly unavailable: boolean;
}

interface EngineRoomGUIProps {
  readonly access: EngineRoomAccess;
  readonly operations: EngineRoomOperationsSnapshot | null;
  readonly songList: EngineRoomSongList | null;
  readonly platformMappings: EngineRoomPlatformMappings;
  readonly sourceAssessments: readonly PlatformSourceAssessment[];
  readonly currentHourInputs: EngineRoomCurrentHourInputs | null;
  readonly chartHoldSongIds: readonly string[];
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  boomplay: 'Boomplay',
};

const READINESS_LABELS: Record<string, string> = {
  trustedPersistence: 'Trusted persistence',
  initialState: 'Initial Engine state',
  voteHistory: 'Vote history',
  seedHours: 'Seed-hour coverage',
  youtube: 'YouTube coverage',
  spotify: 'Spotify coverage',
  boomplay: 'Boomplay coverage',
  databaseContract: 'Database contract',
};

const COVERAGE_READINESS_KEYS: Record<string, string> = {
  VOTES: 'voteHistory',
  SEED: 'seedHours',
  YOUTUBE: 'youtube',
  SPOTIFY: 'spotify',
  BOOMPLAY: 'boomplay',
};

function displayStatus(value: string): string {
  return value.replaceAll('-', ' ').replaceAll('_', ' ').toLowerCase();
}

function dateTime(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
}

function StatusPill({ value }: { readonly value: string }) {
  const isReady = ['ready', 'available', 'completed', 'published'].includes(
    value.toLowerCase(),
  );
  const isBlocked = [
    'unavailable',
    'not-ready',
    'not-configured',
    'not-authorized',
    'unsupported',
    'failed',
  ].includes(value.toLowerCase());

  const color = isReady
    ? 'var(--bora-green)'
    : isBlocked
      ? 'var(--bora-red)'
      : 'var(--bora-gold)';

  return (
    <span
      className="inline-flex items-center gap-1.5 border px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em]"
      style={{ borderColor: color, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {displayStatus(value)}
    </span>
  );
}

function Panel({
  title,
  description,
  icon: Icon,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly icon: typeof Database;
  readonly children: React.ReactNode;
}) {
  return (
    <section
      className="border"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      <header
        className="flex items-start gap-3 border-b px-4 py-4 sm:px-5"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        <Icon size={15} style={{ color: 'var(--bora-gold)' }} aria-hidden />
        <div>
          <h2 className="font-cinzel text-[10px] font-black uppercase tracking-[0.14em]">
            {title}
          </h2>
          {description && (
            <p
              className="mt-1 text-[7px] leading-5"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              {description}
            </p>
          )}
        </div>
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly detail: string;
}) {
  return (
    <div
      className="border p-4"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-background-deep)',
      }}
    >
      <p
        className="text-[7px] font-black uppercase tracking-[0.16em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        {label}
      </p>
      <p className="mt-3 font-cinzel text-2xl font-black">{value}</p>
      <p
        className="mt-2 text-[7px] leading-4"
        style={{ color: 'var(--bora-text-subtle)' }}
      >
        {detail}
      </p>
    </div>
  );
}

function BlockedNotice({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div
      className="flex gap-3 border p-4"
      style={{
        borderColor: 'color-mix(in srgb, var(--bora-gold) 45%, transparent)',
        backgroundColor: 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))',
      }}
      role="status"
    >
      <AlertTriangle
        size={16}
        className="mt-0.5 shrink-0"
        style={{ color: 'var(--bora-gold)' }}
        aria-hidden
      />
      <div>
        <p className="text-[8px] font-black uppercase tracking-[0.12em]">
          {title}
        </p>
        <div
          className="mt-2 text-[7px] leading-5"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ReadinessPanel({
  snapshot,
}: {
  readonly snapshot: EngineRoomOperationsSnapshot;
}) {
  const checks = snapshot.readiness?.checks;
  if (!checks) {
    return (
      <BlockedNotice title="Engine readiness unavailable">
        The readiness RPC could not provide an assessment. No readiness is
        inferred from empty tables or missing records.
      </BlockedNotice>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {Object.entries(checks).map(([key, check]) => (
        <div
          key={key}
          className="flex items-center justify-between gap-3 border px-3 py-3"
          style={{ borderColor: 'var(--bora-border)' }}
        >
          <div className="min-w-0">
            <p className="text-[7px] font-bold uppercase tracking-[0.08em]">
              {READINESS_LABELS[key] ?? displayStatus(key)}
            </p>
            {typeof check.missing === 'number' && (
              <p
                className="mt-1 text-[7px]"
                style={{ color: 'var(--bora-text-muted)' }}
              >
                {check.missing} missing
                {typeof check.expected === 'number'
                  ? ` of ${check.expected}`
                  : ''}
              </p>
            )}
          </div>
          <StatusPill value={check.status} />
        </div>
      ))}
    </div>
  );
}

function VoteReconciliationPanel() {
  const [result, setResult] =
    useState<RunSecureVoteReconciliationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function reconcile() {
    if (running) return;

    setRunning(true);
    setFailure(null);
    try {
      setResult(await runSecureVoteReconciliation());
    } catch (error) {
      console.error('[bora-engine-vote-reconciliation] operator action failed:', error);
      setResult(null);
      setFailure('Unexpected server failure. Check server logs for details.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-3">
      <p
        className="text-[8px] leading-5"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        Retry pending secure-vote events from the server-configured activation
        time. The timestamp is not accepted from the browser, and earlier
        aggregate votes are never reconstructed.
      </p>
      <button
        type="button"
        onClick={() => void reconcile()}
        disabled={running}
        className="border px-3 py-2 text-[7px] font-black uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-gold)' }}
      >
        {running ? 'Reconciling…' : 'Retry pending vote events'}
      </button>
      {failure && (
        <p
          className="border p-3 text-[7px] leading-5"
          style={{ borderColor: 'var(--bora-red)', color: 'var(--bora-red)' }}
          role="alert"
        >
          Reconciliation failed: {failure}
        </p>
      )}
      {result && (
        <div
          className="border p-3 text-[7px] leading-5"
          style={{ borderColor: 'var(--bora-border)' }}
          role="status"
          aria-live="polite"
        >
          {result.status === 'authorized' ? (
            <>
              <p className="font-bold uppercase">
                Reconciliation {result.report.status}
              </p>
              {result.report.status === 'completed' ||
              result.report.status === 'aborted' ? (
                <p>
                  {result.report.counts.ingested} ingested ·{' '}
                  {result.report.counts.alreadyIngested} already present ·{' '}
                  {result.report.counts.persistenceFailure +
                    result.report.counts.commitUnknown +
                    result.report.counts.invalidInput +
                    result.report.counts.conflictingIdentity}{' '}
                  need attention · {result.report.stopReason}
                </p>
              ) : null}
              {result.report.status === 'configuration-unavailable' && (
                <p>Engine service-role persistence is not configured.</p>
              )}
              {result.report.status === 'invalid-input' && (
                <p>Cutover input was rejected: {result.report.reasons.join(', ')}</p>
              )}
            </>
          ) : (
            <p>
              Reconciliation was not authorized or is unavailable
              {'detail' in result ? `: ${result.detail}` : '.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ChartHoldManager({
  songList,
  initialHeldSongIds,
}: {
  readonly songList: EngineRoomSongList | null;
  readonly initialHeldSongIds: readonly string[];
}) {
  const [heldSongIds, setHeldSongIds] = useState<string[]>([...initialHeldSongIds]);
  const [savingSongId, setSavingSongId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const songs = songList?.status === 'ready' ? songList.songs : [];

  const toggleHold = async (songId: string) => {
    if (savingSongId) return;

    setSavingSongId(songId);
    setError(null);

    try {
      const result = await toggleBoraChartHoldSong(songId);

      if (!result.success) {
        throw new Error(result.error ?? 'Unable to update the chart hold.');
      }

      setHeldSongIds((current) =>
        result.held
          ? Array.from(new Set([...current, songId]))
          : current.filter((id) => id !== songId),
      );
    } catch (caughtError) {
      console.error('[bora-chart-hold] toggle failed:', caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to update the chart hold.',
      );
    } finally {
      setSavingSongId(null);
    }
  };

  return (
    <Panel
      title="Chart hold manager"
      description="Server-backed hold list for songs kept out of the active chart. This is the authoritative admin control layer for chart holds, without exposing a create button yet."
      icon={ShieldAlert}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 border px-3 py-2" style={{ borderColor: 'var(--bora-border)' }}>
          <p className="text-[7px] font-black uppercase tracking-[0.12em]" style={{ color: 'var(--bora-text-muted)' }}>
            Held songs
          </p>
          <StatusPill value={heldSongIds.length === 0 ? 'empty' : `${heldSongIds.length} active`} />
        </div>

        {error && (
          <p className="border p-3 text-[7px] leading-5" style={{ borderColor: 'var(--bora-red)', color: 'var(--bora-red)' }} role="alert">
            {error}
          </p>
        )}

        {songs.length === 0 ? (
          <p className="text-[8px]" style={{ color: 'var(--bora-text-muted)' }}>
            No songs are available to stage in the chart hold registry.
          </p>
        ) : (
          <div className="space-y-2">
            {songs.map((song) => {
              const isHeld = heldSongIds.includes(song.id);
              return (
                <div
                  key={song.id}
                  className="flex flex-col gap-3 border p-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderColor: 'var(--bora-border)' }}
                >
                  <div>
                    <p className="font-cinzel text-[10px] font-black uppercase tracking-[0.08em]">
                      {song.title}
                    </p>
                    <p className="mt-1 text-[7px]" style={{ color: 'var(--bora-text-muted)' }}>
                      {song.artist || 'Unknown artist'} · Slot {song.slotNumber}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleHold(song.id)}
                    disabled={savingSongId === song.id}
                    className="border px-3 py-2 text-[7px] font-black uppercase tracking-[0.1em] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      borderColor: isHeld ? 'var(--bora-red)' : 'var(--bora-border)',
                      color: isHeld ? 'var(--bora-red)' : 'var(--bora-gold)',
                    }}
                  >
                    {savingSongId === song.id
                      ? 'Updating…'
                      : isHeld
                        ? 'Remove from chart hold'
                        : 'Add to chart hold'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}

function OperationsView({
  snapshot,
  songList,
  chartHoldSongIds,
}: {
  readonly snapshot: EngineRoomOperationsSnapshot | null;
  readonly songList: EngineRoomSongList | null;
  readonly chartHoldSongIds: readonly string[];
}) {
  const [section, setSection] = useState<OperationsSection>('overview');
  if (!snapshot || snapshot.status === 'unavailable') {
    return (
      <BlockedNotice title="Operations data unavailable">
        The Engine operations read model could not be loaded
        {snapshot?.reason === 'configuration-unavailable'
          ? ' because its server-side persistence configuration is missing.'
          : '.'}
        No operational data is being represented as ready.
      </BlockedNotice>
    );
  }

  const currentPublication = snapshot.publications.find(
    (publication) => publication.id === snapshot.currentPublicationId,
  );
  const nav: { id: OperationsSection; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'coverage', label: 'Coverage' },
    { id: 'processing', label: 'Hourly processing' },
    { id: 'publications', label: 'Publications' },
  ];

  return (
    <div className="space-y-4">
      <nav
        className="grid grid-cols-2 border sm:grid-cols-4"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-background-deep)',
        }}
        aria-label="Engine operations"
      >
        {nav.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              aria-current={active ? 'page' : undefined}
              className="border-b px-3 py-3 text-[7px] font-black uppercase tracking-[0.1em] sm:border-b-0 sm:border-r last:border-r-0"
              style={{
                borderColor: 'var(--bora-border)',
                color: active ? 'var(--bora-gold)' : 'var(--bora-text-muted)',
                backgroundColor: active
                  ? 'color-mix(in srgb, var(--bora-gold) 6%, transparent)'
                  : 'transparent',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {section === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Registry songs"
              value={snapshot.songCount}
              detail="Existing songs; no records were added or changed."
            />
            <MetricCard
              label="Engine state head"
              value={snapshot.stateHead ? `r${snapshot.stateHead.revision}` : 'Not initialized'}
              detail={
                snapshot.stateHead
                  ? `Reference hour ${snapshot.stateHead.referenceHour}`
                  : 'No reference hour exists.'
              }
            />
            <MetricCard
              label="Recent hourly runs"
              value={snapshot.runs.length}
              detail="Most recent ten are shown in processing."
            />
            <MetricCard
              label="Recent publications"
              value={snapshot.publications.length}
              detail={
                currentPublication
                  ? `Current reference hour ${currentPublication.referenceHour}`
                  : 'No current publication.'
              }
            />
          </div>

          <ChartHoldManager
            songList={songList}
            initialHeldSongIds={chartHoldSongIds}
          />

          <Panel
            title="Platform source status"
            description="Source readiness is a backend policy gate, not inferred from manually entered values."
            icon={Radio}
          >
            <div className="grid gap-3 md:grid-cols-3">
              {snapshot.sourceAssessments.map((assessment) => (
                <div
                  key={assessment.platform}
                  className="border p-3"
                  style={{ borderColor: 'var(--bora-border)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[8px] font-black uppercase">
                      {PLATFORM_LABELS[assessment.platform] ??
                        assessment.platform}
                    </p>
                    <StatusPill value={assessment.status} />
                  </div>
                  <p
                    className="mt-3 text-[7px] leading-5"
                    style={{ color: 'var(--bora-text-muted)' }}
                  >
                    {displayStatus(assessment.reason)}
                  </p>
                  <p
                    className="mt-2 text-[6px]"
                    style={{ color: 'var(--bora-text-subtle)' }}
                  >
                    {assessment.unit} · {assessment.sourceIdentity ?? 'No source identity'}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Readiness checks"
            description="Current database readiness assessment. Missing evidence is not treated as zero."
            icon={Gauge}
          >
            <ReadinessPanel snapshot={snapshot} />
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Publication state" icon={FileClock}>
              {currentPublication ? (
                <div className="space-y-2 text-[8px]">
                  <p>
                    Current publication:{' '}
                    <span className="font-mono">{currentPublication.id}</span>
                  </p>
                  <p>Reference hour: {currentPublication.referenceHour}</p>
                  <p>Published: {dateTime(currentPublication.publishedAt)}</p>
                </div>
              ) : (
                <p
                  className="text-[8px]"
                  style={{ color: 'var(--bora-text-muted)' }}
                >
                  The publication head has no current publication.
                </p>
              )}
            </Panel>
            <Panel title="Operational actions" icon={LockKeyhole}>
              <VoteReconciliationPanel />
              <p
                className="mt-4 border-t pt-3 text-[7px] leading-5"
                style={{
                  borderColor: 'var(--bora-border)',
                  color: 'var(--bora-text-muted)',
                }}
              >
                Hourly triggers, bootstrap, evaluation, and publishing remain
                disabled until trusted source evidence and initial Engine
                history are ready.
              </p>
            </Panel>
          </div>
        </div>
      )}

      {section === 'coverage' && (
        <div className="space-y-4">
          <BlockedNotice title="Coverage is not complete">
            Counts below are persisted coverage rows, not proof that the
            required measurement source is approved. A complete hourly window
            and the source-evidence checks are still required.
          </BlockedNotice>
          <Panel
            title="Coverage by input"
            description="Raw row counts from the private coverage table, broken down by input and status."
            icon={Activity}
          >
            <div className="overflow-x-auto border" style={{ borderColor: 'var(--bora-border)' }}>
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead>
                  <tr
                    className="text-[7px] uppercase tracking-[0.12em]"
                    style={{
                      color: 'var(--bora-text-subtle)',
                      backgroundColor: 'var(--bora-background-deep)',
                    }}
                  >
                    <th className="px-3 py-3 font-black">Input</th>
                    <th className="px-3 py-3 font-black">Current</th>
                    <th className="px-3 py-3 font-black">Fresh</th>
                    <th className="px-3 py-3 font-black">Unavailable</th>
                    <th className="px-3 py-3 font-black">Failed</th>
                    <th className="px-3 py-3 font-black">Stale</th>
                    <th className="px-3 py-3 font-black">Invalidated</th>
                    <th className="px-3 py-3 font-black">Unresolved</th>
                    <th className="px-3 py-3 font-black">Required missing</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.coverage.map((row) => {
                    const checkKey = COVERAGE_READINESS_KEYS[row.inputType];
                    const check = checkKey
                      ? snapshot.readiness?.checks[
                          checkKey as keyof typeof snapshot.readiness.checks
                        ]
                      : undefined;
                    return (
                      <tr
                        key={row.inputType}
                        className="border-t"
                        style={{ borderColor: 'var(--bora-border)' }}
                      >
                        <td className="px-3 py-3 text-[8px] font-bold">
                          {row.inputType}
                        </td>
                        <td className="px-3 py-3 text-[8px]">{row.current}</td>
                        <td className="px-3 py-3 text-[8px]">{row.fresh}</td>
                        <td className="px-3 py-3 text-[8px]">{row.unavailable}</td>
                        <td className="px-3 py-3 text-[8px]">{row.failed}</td>
                        <td className="px-3 py-3 text-[8px]">{row.stale}</td>
                        <td className="px-3 py-3 text-[8px]">{row.invalidated}</td>
                        <td className="px-3 py-3 text-[8px]">{row.unresolved}</td>
                        <td className="px-3 py-3 text-[8px]">
                          {typeof check?.missing === 'number'
                            ? check.missing
                            : 'Not assessed'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel title="Source evidence gates" icon={ShieldAlert}>
            <ReadinessPanel snapshot={snapshot} />
          </Panel>
          <Panel
            title="Recently checked coverage slots"
            description="Latest persisted coverage records, including evidence identity and validation/invalidation reason when present."
            icon={FileClock}
          >
            {snapshot.recentCoverage.length === 0 ? (
              <p
                className="text-[8px]"
                style={{ color: 'var(--bora-text-muted)' }}
              >
                No coverage records are available.
              </p>
            ) : (
              <div
                className="overflow-x-auto border"
                style={{ borderColor: 'var(--bora-border)' }}
              >
                <table className="w-full min-w-[980px] border-collapse text-left">
                  <thead>
                    <tr
                      className="text-[7px] uppercase tracking-[0.12em]"
                      style={{
                        color: 'var(--bora-text-subtle)',
                        backgroundColor: 'var(--bora-background-deep)',
                      }}
                    >
                      <th className="px-3 py-3 font-black">Song ID</th>
                      <th className="px-3 py-3 font-black">Input</th>
                      <th className="px-3 py-3 font-black">Hour</th>
                      <th className="px-3 py-3 font-black">Result</th>
                      <th className="px-3 py-3 font-black">Currentness</th>
                      <th className="px-3 py-3 font-black">Source / evidence</th>
                      <th className="px-3 py-3 font-black">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.recentCoverage.map((row) => (
                      <tr
                        key={`${row.songId}:${row.inputType}:${row.hourIndex}`}
                        className="border-t"
                        style={{ borderColor: 'var(--bora-border)' }}
                      >
                        <td className="px-3 py-3 font-mono text-[6px]">
                          {row.songId}
                        </td>
                        <td className="px-3 py-3 text-[7px]">{row.inputType}</td>
                        <td className="px-3 py-3 text-[7px]">{row.hourIndex}</td>
                        <td className="px-3 py-3">
                          <StatusPill value={row.status} />
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill value={row.currentness} />
                        </td>
                        <td className="max-w-[220px] px-3 py-3 text-[6px]">
                          <p className="truncate">{row.sourceIdentity ?? 'No source'}</p>
                          <p
                            className="mt-1 truncate font-mono"
                            style={{ color: 'var(--bora-text-subtle)' }}
                          >
                            {row.evidenceId ?? 'No evidence ID'}
                          </p>
                        </td>
                        <td className="max-w-[260px] px-3 py-3 text-[6px]">
                          {row.reason ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {section === 'processing' && (
        <Panel
          title="Hourly processing history"
          description="Recent durable hourly-run records. This screen does not trigger or retry a run."
          icon={Clock3}
        >
          {snapshot.runs.length === 0 ? (
            <p
              className="text-[8px]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              No hourly runs are recorded.
            </p>
          ) : (
            <div className="overflow-x-auto border" style={{ borderColor: 'var(--bora-border)' }}>
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr
                    className="text-[7px] uppercase tracking-[0.12em]"
                    style={{
                      color: 'var(--bora-text-subtle)',
                      backgroundColor: 'var(--bora-background-deep)',
                    }}
                  >
                    <th className="px-3 py-3 font-black">Closed hour</th>
                    <th className="px-3 py-3 font-black">Status</th>
                    <th className="px-3 py-3 font-black">Attempts</th>
                    <th className="px-3 py-3 font-black">Completed</th>
                    <th className="px-3 py-3 font-black">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.runs.map((run) => (
                    <tr
                      key={run.closedHour}
                      className="border-t"
                      style={{ borderColor: 'var(--bora-border)' }}
                    >
                      <td className="px-3 py-3 text-[8px]">{run.closedHour}</td>
                      <td className="px-3 py-3">
                        <StatusPill value={run.status} />
                      </td>
                      <td className="px-3 py-3 text-[8px]">{run.attemptCount}</td>
                      <td className="px-3 py-3 text-[8px]">
                        {dateTime(run.completedAt)}
                      </td>
                      <td className="px-3 py-3 font-mono text-[7px]">
                        {run.lastErrorCode ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {section === 'publications' && (
        <Panel
          title="Publication history"
          description="Persisted publication headers; entries and the active head remain controlled by the atomic publication transaction."
          icon={FileClock}
        >
          <DailyRankPublicationControl />
          {snapshot.publications.length === 0 ? (
            <p
              className="text-[8px]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              No Engine publications are recorded.
            </p>
          ) : (
            <div className="overflow-x-auto border" style={{ borderColor: 'var(--bora-border)' }}>
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead>
                  <tr
                    className="text-[7px] uppercase tracking-[0.12em]"
                    style={{
                      color: 'var(--bora-text-subtle)',
                      backgroundColor: 'var(--bora-background-deep)',
                    }}
                  >
                    <th className="px-3 py-3 font-black">State</th>
                    <th className="px-3 py-3 font-black">Reference hour</th>
                    <th className="px-3 py-3 font-black">Published</th>
                    <th className="px-3 py-3 font-black">Active C</th>
                    <th className="px-3 py-3 font-black">YouTube</th>
                    <th className="px-3 py-3 font-black">Spotify</th>
                    <th className="px-3 py-3 font-black">Boomplay</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.publications.map((publication) => {
                    const isCurrent =
                      publication.id === snapshot.currentPublicationId;
                    return (
                      <tr
                        key={publication.id}
                        className="border-t"
                        style={{ borderColor: 'var(--bora-border)' }}
                      >
                        <td className="px-3 py-3">
                          <StatusPill value={isCurrent ? 'published' : 'archived'} />
                        </td>
                        <td className="px-3 py-3 text-[8px]">
                          {publication.referenceHour}
                        </td>
                        <td className="px-3 py-3 text-[8px]">
                          {dateTime(publication.publishedAt)}
                        </td>
                        <td className="px-3 py-3 text-[8px]">
                          {publication.totalActiveC}
                        </td>
                        <td className="px-3 py-3 text-[8px]">
                          {publication.platformTotalYouTube}
                        </td>
                        <td className="px-3 py-3 text-[8px]">
                          {publication.platformTotalSpotify}
                        </td>
                        <td className="px-3 py-3 text-[8px]">
                          {publication.platformTotalBoomplay}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {snapshot.currentPublicationEntries.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-3 text-[8px] font-black uppercase tracking-[0.12em]">
                Current publication entries
              </h3>
              <div
                className="overflow-x-auto border"
                style={{ borderColor: 'var(--bora-border)' }}
              >
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <thead>
                    <tr
                      className="text-[7px] uppercase tracking-[0.12em]"
                      style={{
                        color: 'var(--bora-text-subtle)',
                        backgroundColor: 'var(--bora-background-deep)',
                      }}
                    >
                      <th className="px-3 py-3 font-black">Rank</th>
                      <th className="px-3 py-3 font-black">Song ID</th>
                      <th className="px-3 py-3 font-black">Lifecycle</th>
                      <th className="px-3 py-3 font-black">BORA score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.currentPublicationEntries.map((entry) => (
                      <tr
                        key={entry.songId}
                        className="border-t"
                        style={{ borderColor: 'var(--bora-border)' }}
                      >
                        <td className="px-3 py-3 text-[8px]">
                          {entry.rank ?? '—'}
                        </td>
                        <td className="px-3 py-3 font-mono text-[7px]">
                          {entry.songId}
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill value={entry.lifecycle} />
                        </td>
                        <td className="px-3 py-3 text-[8px]">
                          {entry.boraScore ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

export default function EngineRoomGUI({
  access,
  operations,
  songList,
  platformMappings,
  sourceAssessments,
  currentHourInputs,
  chartHoldSongIds,
}: EngineRoomGUIProps) {
  const searchParams = useSearchParams();
  const [roomSection, setRoomSection] = useState<RoomSection>(() =>
    !access.isAdministrator
      ? 'operations'
      : searchParams.get('category') === 'premium'
        ? 'premium'
        : 'songs',
  );

  if (!access.isAdministrator && !access.isOperator) {
    return (
      <main
        className="min-h-screen px-4 py-16"
        style={{
          backgroundColor: 'var(--bora-background)',
          color: 'var(--bora-text)',
        }}
      >
        <div className="mx-auto max-w-xl border p-6" style={{ borderColor: 'var(--bora-border)' }}>
          <LockKeyhole size={20} style={{ color: 'var(--bora-gold)' }} aria-hidden />
          <h1 className="mt-4 font-cinzel text-lg font-black uppercase">
            Engine access unavailable
          </h1>
          <p
            className="mt-3 text-[8px] leading-5"
            style={{ color: 'var(--bora-text-muted)' }}
            role="alert"
          >
            {access.unavailable
              ? 'The administrator or Engine-operator authorization could not be verified. Access is closed until configuration is corrected.'
              : 'This room requires an authorized BORA administrator for Data Entry or an approved Engine operator for Operations.'}
          </p>
          <Link
            href="/admin/room-selector"
            className="mt-6 inline-flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.12em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            <ArrowLeft size={12} aria-hidden />
            Return to room selector
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden pb-24"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      <EngineRoomHeader />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute left-1/2 top-0 h-[460px] w-[780px] -translate-x-1/2 rounded-full blur-[150px]"
          style={{ backgroundColor: 'color-mix(in srgb, var(--bora-gold-glow) 45%, transparent)' }}
        />
      </div>
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-10 pt-8 md:px-8">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[7px] font-black uppercase tracking-[0.22em]" style={{ color: 'var(--bora-gold)' }}>
              BORA Engine Room
            </p>
            <h1 className="mt-2 font-cinzel text-2xl font-black uppercase tracking-[0.12em]">
              {roomSection === 'songs'
                ? 'Song studio'
                : roomSection === 'premium'
                  ? 'Premium performance'
                  : 'Engine operations'}
            </h1>
          </div>
          <Link
            href="/admin/room-selector"
            className="shrink-0 text-[7px] font-black uppercase tracking-[0.12em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Room selector
          </Link>
        </header>
        {access.isAdministrator && (
          <div
            className="mb-5 flex snap-x gap-3 overflow-x-auto pb-2"
            role="tablist"
            aria-label="Engine Room categories"
          >
            {([
              ['songs', 'Song studio', 'Edit each song, its artwork, identity, and source records.'],
              ['premium', 'Premium performance', 'Enter all-song chart positions and inspect Engine performance inputs.'],
            ] as const).map(([section, title, description]) => (
              <button
                key={section}
                type="button"
                role="tab"
                aria-selected={roomSection === section}
                onClick={() => setRoomSection(section)}
                className="min-w-[220px] flex-1 snap-start border p-4 text-left transition-colors sm:min-w-[280px] sm:p-5"
                style={{
                  borderColor:
                    roomSection === section
                      ? 'var(--bora-gold)'
                      : 'var(--bora-border)',
                  backgroundColor:
                    roomSection === section
                      ? 'color-mix(in srgb, var(--bora-gold) 7%, var(--bora-surface))'
                      : 'var(--bora-surface)',
                }}
              >
                <span className="text-[8px] font-black uppercase tracking-[0.12em]">
                  {title}
                </span>
                <span className="mt-2 block text-[7px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
                  {description}
                </span>
              </button>
            ))}
          </div>
        )}
        {roomSection === 'songs' && access.isAdministrator ? (
          <EngineRoomWorkspace
            songList={songList}
            platformMappings={platformMappings}
            sourceAssessments={sourceAssessments}
            category="songs"
            currentHourInputs={currentHourInputs}
          />
        ) : roomSection === 'premium' && access.isAdministrator ? (
          <EngineRoomWorkspace
            songList={songList}
            platformMappings={platformMappings}
            sourceAssessments={sourceAssessments}
            category="premium"
            currentHourInputs={currentHourInputs}
          />
        ) : access.isOperator ? (
            <OperationsView
              snapshot={operations}
              songList={songList}
              chartHoldSongIds={chartHoldSongIds}
            />
          ) : (
            <div className="border p-5" style={{ borderColor: 'var(--bora-border)' }}>
              <CheckCircle2
                size={16}
                style={{ color: 'var(--bora-gold)' }}
                aria-hidden
              />
              <p className="mt-3 text-[8px] font-black uppercase">
                Engine operator access required
              </p>
              <p
                className="mt-2 text-[7px] leading-5"
                style={{ color: 'var(--bora-text-muted)' }}
              >
                Operations data is restricted to the separate Engine operator
                allowlist. Site administrator access does not grant Engine
                operator access.
              </p>
            </div>
          )}
        <p className="mt-5 text-right text-[6px] uppercase tracking-[0.12em]" style={{ color: 'var(--bora-text-subtle)' }}>
          Hourly processing and publication require real, database-verified evidence
        </p>
      </div>
      <EngineRoomNavbar
        activeSection={roomSection}
        onSectionChange={setRoomSection}
        canOpenOperations={access.isOperator}
      />
    </main>
  );
}
