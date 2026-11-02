'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileCheck2, Loader2 } from 'lucide-react';
import {
  publishDailyRankBoraEngineChart,
  type DailyRankPublicationActionResult,
} from '@/lib/bora-engine/daily-rank-publication-action';

function describeResult(result: DailyRankPublicationActionResult): string {
  if (result.status === 'transaction') {
    const outcome = result.outcome;
    if (outcome.status === 'published' || outcome.status === 'already-published') {
      return `Publication ${outcome.publicationId} is current.`;
    }
    if (outcome.status === 'not-ready') {
      return `Publication blocked by database readiness: ${outcome.reasons.join(', ')}.`;
    }
    if (outcome.status === 'stale-state') {
      return `Publication was not committed because ${outcome.reason.replaceAll('-', ' ')}. Refresh and retry.`;
    }
    if (outcome.status === 'commit-unknown') {
      return 'The database did not confirm the commit. Retry with the same request identity.';
    }
    if (outcome.status === 'lease-conflict') {
      return 'Another publication request is still processing. Retry shortly.';
    }
    if (outcome.status === 'failed') {
      return `Publication failed: ${outcome.errorCode}.`;
    }
    return `Publication request rejected: ${outcome.reasons.join(', ')}.`;
  }

  switch (result.status) {
    case 'not-ready':
      return `Publication blocked: ${result.reason.replaceAll('-', ' ')}${
        result.detail ? ` - ${result.detail}` : ''
      }.`;
    case 'snapshot-unavailable':
      return `Publication inputs could not be loaded (${result.reason}${result.errorCode ? `: ${result.errorCode}` : ''}).`;
    case 'persistence-unavailable':
      return 'Publication is unavailable because server-side persistence is not configured.';
    case 'evaluation-failed':
      return `Engine evaluation failed (${result.reason}${
        result.errorCode ? `: ${result.errorCode}` : ''
      })${result.detail ? `: ${result.detail}` : ''}.`;
    case 'invalid-publication':
      return `Publication validation failed: ${result.reasons.join(', ')}.`;
    case 'authorization-unavailable':
      return result.detail;
    case 'unauthenticated':
      return 'Sign in again before publishing.';
    case 'forbidden':
      return 'An authorized Engine operator is required to publish.';
    case 'invalid-request':
      return 'The publication request identity was invalid. Try again.';
  }
}

export default function DailyRankPublicationControl() {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function publish() {
    if (pending) return;
    if (!requestId.current) {
      if (!globalThis.crypto?.randomUUID) {
        setMessage('This browser cannot create a secure publication request identity.');
        return;
      }
      requestId.current = globalThis.crypto.randomUUID();
    }

    setPending(true);
    setMessage(null);
    try {
      const result = await publishDailyRankBoraEngineChart(requestId.current);
      setMessage(describeResult(result));
      if (
        result.status !== 'transaction' ||
        (result.outcome.status !== 'commit-unknown' &&
          result.outcome.status !== 'lease-conflict')
      ) {
        requestId.current = null;
      }
      if (
        result.status === 'transaction' &&
        (result.outcome.status === 'published' ||
          result.outcome.status === 'already-published')
      ) {
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Publication request failed: ${error.message}`
          : 'Publication request failed unexpectedly. Retry with the same request identity.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mb-5 border p-4" style={{ borderColor: 'var(--bora-border)' }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-[8px] font-black uppercase tracking-[0.12em]">
            Daily-rank chart publication
          </h3>
          <p
            className="mt-2 max-w-2xl text-[7px] leading-5"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            This operator action evaluates the current Engine state with the
            latest eligible YouTube, Spotify, and Boomplay rank history. Database
            readiness and the final atomic publication check remain authoritative;
            it never initializes or advances Engine state.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void publish()}
          disabled={pending}
          className="inline-flex shrink-0 items-center justify-center gap-2 border px-4 py-3 text-[7px] font-black uppercase tracking-[0.1em] disabled:cursor-wait disabled:opacity-60"
          style={{
            borderColor: 'var(--bora-gold)',
            color: 'var(--bora-gold)',
          }}
        >
          {pending ? (
            <Loader2 size={13} className="animate-spin" aria-hidden />
          ) : (
            <FileCheck2 size={13} aria-hidden />
          )}
          {pending ? 'Publishing' : 'Evaluate and publish'}
        </button>
      </div>
      {message && (
        <p
          className="mt-3 border-t pt-3 text-[7px] leading-5"
          style={{
            borderColor: 'var(--bora-border)',
            color: 'var(--bora-text-muted)',
          }}
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </div>
  );
}
