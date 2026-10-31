'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getManualPlatformHistory,
  saveManualPlatformMapping,
  submitManualPlatformBaseline,
  submitManualPlatformHour,
} from '@/lib/bora-engine/manual-platform-actions';
import type {
  EngineRoomPlatformMappings,
  EngineRoomSong,
} from '@/lib/bora-engine/admin-room-read-model';
import type {
  ManualPlatform,
  ManualPlatformActionResult,
  ManualPlatformHistoryItem,
  ManualPlatformHistoryResult,
} from '@/lib/bora-engine/manual-platform-types';

const PLATFORMS: readonly { readonly value: ManualPlatform; readonly label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'boomplay', label: 'Boomplay' },
];

function messageForResult(result: ManualPlatformActionResult): string {
  switch (result.status) {
    case 'saved':
      return 'Platform identity saved.';
    case 'already-saved':
      return 'This identity update was already saved.';
    case 'recorded':
      return 'Evidence recorded. Baselines and snapshots do not count as hourly coverage.';
    case 'already-recorded':
      return 'This evidence was already recorded; no duplicate was created.';
    case 'unauthorized':
      return 'Your account is not authorized to submit platform data.';
    case 'configuration-unavailable':
      return 'Admin authorization or the service connection is unavailable.';
    case 'invalid-input':
      return 'Check the required fields and UTC timestamp format.';
    case 'idempotency-conflict':
      return 'This retry identifier was already used with different data. Start a new submission.';
    case 'mapping-or-input-invalid':
      return 'The platform identity does not match the saved mapping, or the evidence does not meet the required hourly contract.';
    case 'platform-identity-in-use':
      return 'That platform identity is already mapped to another song.';
    case 'correction-required':
      return 'An observation already exists for this song and hour. A correction must explicitly reference the previous evidence.';
    case 'stale-correction':
      return 'The evidence changed since it was loaded. Refresh and verify the current record before correcting.';
    case 'persistence-failed':
      return 'The submission could not be confirmed. Retry without changing the fields, or check server logs.';
  }
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly type?: string;
}) {
  return (
    <label className="block text-[7px] font-bold uppercase tracking-[0.08em]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border bg-transparent px-2 py-2 text-[8px] font-normal normal-case outline-none focus:border-[color:var(--bora-gold)]"
        style={{
          borderColor: 'var(--bora-border)',
          color: 'var(--bora-text)',
        }}
      />
    </label>
  );
}

function formatHistoryTimestamp(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : `${parsed.toLocaleString()} (${value})`;
}

function historySummary(item: ManualPlatformHistoryItem): string {
  if (item.kind === 'mapping') {
    return `${item.platformIdentity} · ${item.sourceDisplayName} · exact-hour source: ${
      item.hourlyEvidenceConfirmed ? 'confirmed' : 'not confirmed'
    }`;
  }
  const measurement = `${item.value ?? '—'} ${item.unit ?? ''}`.trim();
  const interval =
    item.kind === 'hourly' && item.periodStart && item.periodEnd
      ? `${item.periodStart} – ${item.periodEnd}`
      : formatHistoryTimestamp(item.observedAt);
  return `${item.kind} · ${measurement} · ${item.metric ?? '—'} · ${interval} · ${item.sourceDisplayName}`;
}

export default function ManualPlatformEntry({
  songs,
  mappingState,
}: {
  readonly songs: readonly EngineRoomSong[];
  readonly mappingState: EngineRoomPlatformMappings;
}) {
  const [songId, setSongId] = useState(songs[0]?.id ?? '');
  const [platform, setPlatform] = useState<ManualPlatform>('youtube');
  const [entryMode, setEntryMode] = useState<'reference' | 'hourly'>('reference');
  const [platformIdentity, setPlatformIdentity] = useState('');
  const [sourceDisplayName, setSourceDisplayName] = useState('');
  const [authorizationReference, setAuthorizationReference] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [hourlyEvidenceConfirmed, setHourlyEvidenceConfirmed] = useState(false);
  const [recordType, setRecordType] = useState<'baseline' | 'snapshot'>('baseline');
  const [metric, setMetric] = useState('cumulative_views');
  const [unit, setUnit] = useState('views_total');
  const [value, setValue] = useState('');
  const [sourceEvidenceReference, setSourceEvidenceReference] = useState('');
  const [observedAt, setObservedAt] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [hourlyObservedAt, setHourlyObservedAt] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [submitting, setSubmitting] = useState<'mapping' | 'baseline' | 'hourly' | null>(null);
  const [history, setHistory] = useState<ManualPlatformHistoryResult | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [correctionId, setCorrectionId] = useState('');
  const requestId = useRef<string | null>(null);

  const mappings = useMemo(
    () => (mappingState.status === 'ready' ? mappingState.mappings : []),
    [mappingState],
  );
  const [localMappings, setLocalMappings] = useState(mappings);
  useEffect(() => setLocalMappings(mappings), [mappings]);
  const selectedMapping = localMappings.find(
    (mapping) => mapping.songId === songId && mapping.platform === platform,
  );
  const hourlyHistory =
    history?.status === 'ready'
      ? history.items.filter((item) => item.kind === 'hourly')
      : [];
  const supersededObservationIds = new Set(
    hourlyHistory.flatMap((item) =>
      item.supersedesObservationId ? [item.supersedesObservationId] : [],
    ),
  );
  const correctionTargets = hourlyHistory.filter(
    (item) => !supersededObservationIds.has(item.id),
  );
  const selectedCorrection = hourlyHistory.find(
    (item) => item.id === correctionId,
  );
  const correctionPeriodMatches =
    !selectedCorrection ||
    (selectedCorrection.periodStart !== null &&
      selectedCorrection.periodEnd !== null &&
      Date.parse(periodStart) === Date.parse(selectedCorrection.periodStart) &&
      Date.parse(periodEnd) === Date.parse(selectedCorrection.periodEnd));

  useEffect(() => {
    setPlatformIdentity(selectedMapping?.platformIdentity ?? '');
    setSourceDisplayName(selectedMapping?.sourceDisplayName ?? '');
    setAuthorizationReference(selectedMapping?.authorizationReference ?? '');
    setHourlyEvidenceConfirmed(
      selectedMapping?.hourlyEvidenceConfirmed ?? false,
    );
    setAuthorized(false);
  }, [selectedMapping]);

  useEffect(() => {
    setMetric(platform === 'youtube' ? 'cumulative_views' : 'track_streams');
    setUnit(platform === 'youtube' ? 'views_total' : 'streams_total');
  }, [platform]);

  useEffect(() => {
    let active = true;
    setHistory(null);
    setCorrectionId('');
    setHistoryLoading(true);
    void getManualPlatformHistory(songId, platform)
      .then((result) => {
        if (active) setHistory(result);
      })
      .catch((error) => {
        console.error('[bora-engine-manual-platform-intake] history load failed:', error);
        if (active) setHistory({ status: 'unavailable' });
      })
      .finally(() => {
        if (active) setHistoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [songId, platform]);

  async function refreshHistory() {
    setHistoryLoading(true);
    try {
      setHistory(await getManualPlatformHistory(songId, platform));
    } catch (error) {
      console.error('[bora-engine-manual-platform-intake] history refresh failed:', error);
      setHistory({ status: 'unavailable' });
    } finally {
      setHistoryLoading(false);
    }
  }

  function changed(setter: (value: string) => void, next: string) {
    requestId.current = null;
    setMessage(null);
    setter(next);
  }

  function nextRequestId(): string {
    requestId.current ??= window.crypto.randomUUID();
    return requestId.current;
  }

  function finish(result: ManualPlatformActionResult) {
    setMessage(messageForResult(result));
    if (
      result.status === 'saved' ||
      result.status === 'already-saved' ||
      result.status === 'recorded' ||
      result.status === 'already-recorded'
    ) {
      requestId.current = null;
    }
  }

  async function saveMapping() {
    if (pending || !authorized) return;
    setPending(true);
    setSubmitting('mapping');
    try {
      const result = await saveManualPlatformMapping({
        requestId: nextRequestId(),
        songId,
        platform,
        platformIdentity: platformIdentity.trim(),
        sourceDisplayName: sourceDisplayName.trim(),
        authorizationReference: authorizationReference.trim(),
        authorizationConfirmed: true,
        hourlyEvidenceConfirmed,
      });
      finish(result);
      if (result.status === 'saved' || result.status === 'already-saved') {
        setLocalMappings((current) => [
          ...current.filter(
            (mapping) =>
              mapping.songId !== songId || mapping.platform !== platform,
          ),
          {
            songId,
            platform,
            platformIdentity: platformIdentity.trim(),
            sourceDisplayName: sourceDisplayName.trim(),
            authorizationReference: authorizationReference.trim(),
            hourlyEvidenceConfirmed,
            updatedAt: new Date().toISOString(),
          },
        ]);
        await refreshHistory();
      }
    } catch (error) {
      console.error('[bora-engine-manual-platform-intake] mapping submission failed:', error);
      setMessage('The mapping could not be confirmed. Retry without changing the fields.');
    } finally {
      setPending(false);
      setSubmitting(null);
    }
  }

  async function saveBaseline() {
    if (pending || !authorized) return;
    setPending(true);
    setSubmitting('baseline');
    try {
      const result = await submitManualPlatformBaseline({
        requestId: nextRequestId(),
        recordType,
        songId,
        platform,
        platformIdentity: platformIdentity.trim(),
        sourceDisplayName: sourceDisplayName.trim(),
        sourceEvidenceReference: sourceEvidenceReference.trim(),
        metric: metric.trim(),
        unit: unit.trim(),
        value: value.trim(),
        observedAt: observedAt.trim(),
        authorizationConfirmed: true,
      });
      finish(result);
      if (result.status === 'recorded' || result.status === 'already-recorded') {
        await refreshHistory();
      }
    } catch (error) {
      console.error('[bora-engine-manual-platform-intake] baseline submission failed:', error);
      setMessage('The evidence could not be confirmed. Retry without changing the fields.');
    } finally {
      setPending(false);
      setSubmitting(null);
    }
  }

  async function saveHourlyObservation() {
    if (pending || !authorized) return;
    const startMs = Date.parse(periodStart);
    const endMs = Date.parse(periodEnd);
    const hourIndex = Math.floor(startMs / 3_600_000);
    const hourlyMetric = platform === 'youtube' ? 'video_views' : 'track_streams';
    const hourlyUnit = platform === 'youtube' ? 'views_per_hour' : 'streams_per_hour';
    setPending(true);
    setSubmitting('hourly');
    try {
      const result = await submitManualPlatformHour({
        requestId: nextRequestId(),
        songId,
        platform,
        platformIdentity: platformIdentity.trim(),
        sourceDisplayName: sourceDisplayName.trim(),
        sourceEvidenceReference: sourceEvidenceReference.trim(),
        metric: hourlyMetric,
        unit: hourlyUnit,
        value: value.trim(),
        observedAt: hourlyObservedAt.trim(),
        periodStart: periodStart.trim(),
        periodEnd: periodEnd.trim(),
        hourIndex,
        authorizationConfirmed: true,
        ...(selectedCorrection
          ? { supersedesObservationId: selectedCorrection.id }
          : {}),
      });
      finish(result);
      if (result.status === 'recorded' || result.status === 'already-recorded') {
        setCorrectionId('');
        await refreshHistory();
      }
    } catch (error) {
      console.error('[bora-engine-manual-platform-intake] hourly submission failed:', error);
      setMessage('The hourly evidence could not be confirmed. Retry without changing the fields.');
    } finally {
      setPending(false);
      setSubmitting(null);
    }
  }

  if (mappingState.status === 'unavailable') {
    return (
      <div
        className="border p-4 text-[8px] leading-5"
        style={{ borderColor: 'var(--bora-red)', color: 'var(--bora-red)' }}
        role="alert"
      >
        Manual intake is unavailable. Confirm migration 0037 and the server-side
        service credential before accepting evidence.
      </div>
    );
  }

  const canSubmit = Boolean(
    songId &&
    platformIdentity.trim() &&
    sourceDisplayName.trim() &&
    authorized
  );

  return (
    <div className="space-y-4">
      <section className="space-y-3 border p-4" style={{ borderColor: 'var(--bora-border)' }}>
        <div>
          <h3 className="text-[8px] font-black uppercase tracking-[0.12em]">
            Song and authorized platform identity
          </h3>
          <p className="mt-1 text-[7px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
            Mapping is separate for each platform. Save a verified identity and
            source before recording evidence.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-[7px] font-bold uppercase tracking-[0.08em]">
            Song
            <select
              value={songId}
              onChange={(event) => {
                requestId.current = null;
                setSongId(event.target.value);
                setMessage(null);
              }}
              className="mt-1 w-full border bg-transparent px-2 py-2 text-[8px] outline-none"
              style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text)' }}
            >
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.title} — {song.artist} (slot {song.slotNumber})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[7px] font-bold uppercase tracking-[0.08em]">
            Platform
            <select
              value={platform}
              onChange={(event) => {
                requestId.current = null;
                setPlatform(event.target.value as ManualPlatform);
                setMessage(null);
              }}
              className="mt-1 w-full border bg-transparent px-2 py-2 text-[8px] outline-none"
              style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text)' }}
            >
              {PLATFORMS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <InputField
            label="Platform video / track identity"
            value={platformIdentity}
            onChange={(next) => changed(setPlatformIdentity, next)}
            placeholder="Verified video ID or track identity"
          />
          <InputField
            label="Authorized source / report name"
            value={sourceDisplayName}
            onChange={(next) => changed(setSourceDisplayName, next)}
            placeholder="Official report or authorized source"
          />
          <div className="md:col-span-2">
            <InputField
              label="Authorization reference / note"
              value={authorizationReference}
              onChange={(next) => changed(setAuthorizationReference, next)}
              placeholder="How access and use are authorized"
            />
          </div>
        </div>
        <label className="flex items-start gap-2 text-[7px] leading-5">
          <input
            type="checkbox"
            checked={authorized}
            onChange={(event) => {
              requestId.current = null;
              setAuthorized(event.target.checked);
            }}
          />
          I confirm I am authorized to use this platform identity and source for
          BORA chart evidence.
        </label>
        <label className="flex items-start gap-2 text-[7px] leading-5">
          <input
            type="checkbox"
            checked={hourlyEvidenceConfirmed}
            onChange={(event) => {
              requestId.current = null;
              setHourlyEvidenceConfirmed(event.target.checked);
            }}
          />
          This authorized source supplies activity for exact, UTC-aligned
          one-hour intervals. Cumulative public YouTube snapshots do not qualify.
        </label>
        <button
          type="button"
          onClick={() => void saveMapping()}
          disabled={!canSubmit || pending}
          className="border px-3 py-2 text-[7px] font-black uppercase tracking-[0.1em] disabled:opacity-50"
          style={{ borderColor: 'var(--bora-gold)', color: 'var(--bora-gold)' }}
        >
          {submitting === 'mapping' ? 'Saving…' : 'Save platform identity'}
        </button>
      </section>

      <section className="space-y-3 border p-4" style={{ borderColor: 'var(--bora-border)' }}>
        <div>
          <h3 className="text-[8px] font-black uppercase tracking-[0.12em]">
            Actual measurements
          </h3>
          <p className="mt-1 text-[7px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
            Only enter values from authorized sources. Baselines and cumulative
            snapshots are retained separately; they never fill hourly coverage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              requestId.current = null;
              setEntryMode('reference');
              setRecordType('baseline');
              setMessage(null);
            }}
            aria-pressed={recordType === 'baseline'}
            className="border px-3 py-2 text-[7px] font-black uppercase"
            style={{
              borderColor: recordType === 'baseline' ? 'var(--bora-gold)' : 'var(--bora-border)',
              color: recordType === 'baseline' ? 'var(--bora-gold)' : 'var(--bora-text-muted)',
            }}
          >
            Initial baseline
          </button>
          <button
            type="button"
            onClick={() => {
              requestId.current = null;
              setEntryMode('reference');
              setRecordType('snapshot');
              setMessage(null);
            }}
            aria-pressed={recordType === 'snapshot'}
            className="border px-3 py-2 text-[7px] font-black uppercase"
            style={{
              borderColor: recordType === 'snapshot' ? 'var(--bora-gold)' : 'var(--bora-border)',
              color: recordType === 'snapshot' ? 'var(--bora-gold)' : 'var(--bora-text-muted)',
            }}
          >
            Reference snapshot
          </button>
          <button
            type="button"
            onClick={() => {
              requestId.current = null;
              setEntryMode('hourly');
              setMessage(null);
            }}
            aria-pressed={entryMode === 'hourly'}
            className="border px-3 py-2 text-[7px] font-black uppercase"
            style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text-muted)' }}
          >
            Hourly report
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {entryMode === 'reference' ? (
            <>
              <InputField
                label="Metric"
                value={metric}
                onChange={(next) => changed(setMetric, next)}
                placeholder="Metric reported by source"
              />
              <InputField
                label="Unit"
                value={unit}
                onChange={(next) => changed(setUnit, next)}
                placeholder="Unit reported by source"
              />
            </>
          ) : (
            <p
              className="text-[7px] leading-5 md:col-span-2"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              Metric and unit: {platform === 'youtube'
                ? 'video_views · views_per_hour'
                : 'track_streams · streams_per_hour'}
            </p>
          )}
          <InputField
            label="Value"
            value={value}
            onChange={(next) => changed(setValue, next)}
            placeholder="Actual measured value"
          />
          <InputField
            label="Source evidence ID / reference"
            value={sourceEvidenceReference}
            onChange={(next) => changed(setSourceEvidenceReference, next)}
            placeholder="Report or evidence identity"
          />
          {entryMode === 'reference' && (
            <div className="md:col-span-2">
            <InputField
              label="Observation time (UTC ISO 8601)"
              value={observedAt}
              onChange={(next) => changed(setObservedAt, next)}
              placeholder="2026-11-01T20:00:00Z"
            />
            </div>
          )}
        </div>
        {entryMode === 'reference' ? (
          <button
            type="button"
            onClick={() => void saveBaseline()}
            disabled={
              !canSubmit ||
              pending ||
              !selectedMapping
            }
            className="border px-3 py-2 text-[7px] font-black uppercase tracking-[0.1em] disabled:opacity-50"
            style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-gold)' }}
          >
            {submitting === 'baseline' ? 'Recording…' : `Record ${recordType}`}
          </button>
        ) : (
          <>
        <label className="block text-[7px] font-bold uppercase tracking-[0.08em]">
          Correct an existing hourly observation (optional)
          <select
            value={correctionId}
            onChange={(event) => {
              const nextId = event.target.value;
              const selected = hourlyHistory.find((item) => item.id === nextId);
              requestId.current = null;
              setCorrectionId(nextId);
              setPeriodStart(selected?.periodStart ?? '');
              setPeriodEnd(selected?.periodEnd ?? '');
              setHourlyObservedAt('');
              setMessage(null);
            }}
            className="mt-1 w-full border bg-transparent px-2 py-2 text-[8px] font-normal normal-case"
            style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text)' }}
            disabled={historyLoading || correctionTargets.length === 0}
          >
            <option value="">New hourly observation</option>
            {correctionTargets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.periodStart} · {item.value} {item.unit} · v{item.version}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 border-t pt-3 md:grid-cols-2" style={{ borderColor: 'var(--bora-border)' }}>
          <InputField
            label="UTC hour start"
            value={periodStart}
            onChange={(next) => changed(setPeriodStart, next)}
            placeholder="2026-11-01T20:00:00Z"
          />
          <InputField
            label="UTC hour end"
            value={periodEnd}
            onChange={(next) => changed(setPeriodEnd, next)}
            placeholder="2026-11-01T21:00:00Z"
          />
          <div className="md:col-span-2">
            <InputField
              label="Source observation time inside that UTC hour"
              value={hourlyObservedAt}
              onChange={(next) => changed(setHourlyObservedAt, next)}
              placeholder="2026-11-01T20:30:00Z"
            />
          </div>
        </div>
        <p className="text-[7px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
          Hourly submissions require one complete, UTC-aligned hour and the
          Engine&apos;s fixed metric/unit for the selected platform. YouTube
          cumulative view snapshots cannot be submitted as hourly views.
        </p>
        {selectedCorrection && !correctionPeriodMatches && (
          <p className="text-[7px] leading-5" style={{ color: 'var(--bora-red)' }} role="alert">
            Correction period must match the selected observation exactly.
          </p>
        )}
        <button
          type="button"
          onClick={() => void saveHourlyObservation()}
          disabled={
            !canSubmit ||
            pending ||
            !selectedMapping ||
            !selectedMapping.hourlyEvidenceConfirmed ||
            !correctionPeriodMatches
          }
          className="border px-3 py-2 text-[7px] font-black uppercase tracking-[0.1em] disabled:opacity-50"
          style={{ borderColor: 'var(--bora-gold)', color: 'var(--bora-gold)' }}
        >
          {submitting === 'hourly'
            ? 'Recording…'
            : selectedCorrection
              ? 'Record correction'
              : 'Record hourly measurement'}
        </button>
          </>
        )}
        <section className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--bora-border)' }}>
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-[7px] font-black uppercase tracking-[0.1em]">
              Submission history · {history?.status === 'ready' ? history.items.length : '—'}
            </h4>
            <button
              type="button"
              onClick={() => void refreshHistory()}
              disabled={historyLoading}
              className="border px-2 py-1 text-[7px] font-bold uppercase disabled:opacity-50"
              style={{ borderColor: 'var(--bora-border)', color: 'var(--bora-text-muted)' }}
            >
              {historyLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          <p className="text-[7px] leading-5" style={{ color: 'var(--bora-text-muted)' }}>
            The status above shows this session&apos;s latest validation result.
            Rejected attempts are not persisted; this list contains saved mapping,
            baseline, snapshot, and hourly evidence records.
          </p>
          {history?.status === 'unauthorized' && (
            <p className="text-[7px]" style={{ color: 'var(--bora-red)' }} role="alert">
              Administrator authorization expired. Reload and sign in again.
            </p>
          )}
          {history?.status === 'unavailable' && (
            <p className="text-[7px]" style={{ color: 'var(--bora-red)' }} role="alert">
              Submission history could not be loaded. Refresh to retry.
            </p>
          )}
          {history?.status === 'ready' && history.items.length === 0 && (
            <p className="text-[7px]" style={{ color: 'var(--bora-text-subtle)' }}>
              No saved submissions for this song and platform.
            </p>
          )}
          {history?.status === 'ready' && history.items.length > 0 && (
            <ol className="max-h-72 space-y-2 overflow-y-auto">
              {history.items.map((item) => (
                <li
                  key={`${item.kind}:${item.id}`}
                  className="border p-2 text-[7px] leading-5"
                  style={{ borderColor: 'var(--bora-border)' }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="uppercase">{item.kind}</strong>
                    <span>{formatHistoryTimestamp(item.observedAt)}</span>
                  </div>
                  <p className="mt-1">{historySummary(item)}</p>
                  <p style={{ color: 'var(--bora-text-subtle)' }}>
                    Evidence ID: {item.id} · Submitted by: {item.submittedBy ?? 'unknown'}
                    {item.supersedesObservationId
                      ? ` · Supersedes: ${item.supersedesObservationId}`
                      : ''}
                  </p>
                  {item.sourceEvidenceReference && (
                    <p style={{ color: 'var(--bora-text-subtle)' }}>
                      Source evidence: {item.sourceEvidenceReference}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>
        {message && (
          <p
            className="border p-3 text-[7px] leading-5"
            style={{
              borderColor: message.includes('recorded') || message.includes('saved')
                ? 'var(--bora-green)'
                : 'var(--bora-red)',
              color: message.includes('recorded') || message.includes('saved')
                ? 'var(--bora-green)'
                : 'var(--bora-red)',
            }}
            role="status"
            aria-live="polite"
          >
            {message}
          </p>
        )}
      </section>
    </div>
  );
}
