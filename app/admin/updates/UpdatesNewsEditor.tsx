'use client';

import React, { useEffect, useState } from 'react';

import {
  getNewsHubRecords,
  saveNewsHubItem,
  type NewsHubRecord,
} from '../../../lib/news-hub-actions';

import UpdatesNewsField from './UpdatesNewsField';

type Phase = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const BLANK: NewsHubRecord = {
  id: '',
  title: '',
  category: '',
  excerpt: '',
  content: '',
  source: '',
  image: '',
  isHot: false,
  publishedAt: '',
};

/*
 * BORA UPDATES ROOM — NEWS EDITOR
 *
 * Reads and writes the EXISTING public.news_hub through the
 * save_news_hub_item RPC. Hakuna direct table writes.
 */
export default function UpdatesNewsEditor() {
  const [records, setRecords] = useState<NewsHubRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [draft, setDraft] = useState<NewsHubRecord>(BLANK);
  const [phase, setPhase] = useState<Phase>('loading');
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setPhase('loading');
    setMessage(null);
    const rows = await getNewsHubRecords();
    setRecords(rows);
    const first = rows[0];
    if (first) {
      setSelectedId(first.id);
      setDraft(first);
    } else {
      setSelectedId('');
      setDraft(BLANK);
    }
    setPhase('idle');
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    if (phase === 'saving') return;
    setPhase('saving');
    setMessage(null);

    const result = await saveNewsHubItem(draft);

    if (result.success) {
      setMessage('News item saved to news_hub.');
      const rows = await getNewsHubRecords();
      setRecords(rows);
      const saved = rows.find(
        (r) => r.id === (result.id ?? '')
      );
      if (saved) {
        setSelectedId(saved.id);
        setDraft(saved);
      }
      setPhase('saved');
    } else {
      setMessage(
        result.error ?? 'Failed to save news item.'
      );
      setPhase('error');
    }
  };

  const tone =
    phase === 'saving'
      ? 'var(--bora-gold)'
      : phase === 'saved'
        ? 'var(--bora-green)'
        : phase === 'error'
          ? 'var(--bora-red)'
          : 'var(--bora-text-muted)';

  const label =
    phase === 'loading'
      ? 'READING NEWS_HUB'
      : phase === 'saving'
        ? 'SAVING'
        : phase === 'saved'
          ? 'SAVED'
          : phase === 'error'
            ? 'ERROR'
            : 'CLEAN';


  return (
    <div className="w-full">
      <div
        className="flex flex-col gap-3 border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-background-deep)',
        }}
      >
        <div>
          <p
            className="text-[7px] font-black uppercase tracking-[0.24em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            Updates Room
          </p>
          <h2 className="mt-2 font-cinzel text-lg font-black uppercase tracking-[0.14em]">
            News Editor
          </h2>
          <p
            className="mt-1.5 text-[7px] uppercase tracking-[0.16em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            public.news_hub · via secured RPC
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedId('');
              setDraft({ ...BLANK });
              setMessage(null);
            }}
            className="border px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.15em]"
            style={{
              borderColor: 'var(--bora-gold)',
              color: 'var(--bora-gold)',
            }}
          >
            New
          </button>

          <button
            type="button"
            onClick={() => void load()}
            className="border px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.15em]"
            style={{
              borderColor: 'var(--bora-border-strong)',
              color: 'var(--bora-text-muted)',
            }}
          >
            Reload
          </button>
        </div>
      </div>

      <div
        className="mt-3 flex items-center gap-2 border px-4 py-3"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >
        <span
          aria-hidden
          className={`h-1.5 w-1.5 rounded-full ${
            phase === 'loading' || phase === 'saving'
              ? 'animate-pulse'
              : ''
          }`}
          style={{ backgroundColor: tone }}
        />
        <p
          className="text-[7px] font-black uppercase tracking-[0.2em]"
          style={{ color: tone }}
        >
          {label}
        </p>

        <p
          className="ml-auto text-[6px] uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {message ??
            `${records.length} record(s) in news_hub`}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
        <div
          className="flex flex-col border"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
          }}
        >
          <p
            className="border-b px-4 py-3 text-[7px] font-black uppercase tracking-[0.2em]"
            style={{
              borderColor: 'var(--bora-border)',
              color: 'var(--bora-gold)',
            }}
          >
            News Hub Records
          </p>

          {records.length === 0 && phase !== 'loading' ? (
            <p
              className="px-4 py-6 text-center text-[7px] uppercase tracking-[0.14em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              news_hub is empty. Use New to create the
              first record.
            </p>
          ) : (
            records.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => {
                  setSelectedId(record.id);
                  setDraft(record);
                  setMessage(null);
                }}
                className="border-b px-4 py-3 text-left transition-colors duration-300 last:border-b-0"
                style={{
                  borderColor: 'var(--bora-border)',
                  backgroundColor:
                    selectedId === record.id
                      ? 'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))'
                      : 'transparent',
                }}
              >
                <span
                  className="block truncate text-[9px] font-black uppercase tracking-[0.1em]"
                  style={{ color: 'var(--bora-text)' }}
                >
                  {record.title || '(untitled)'}
                </span>
                <span
                  className="mt-0.5 block text-[6px] uppercase tracking-[0.14em]"
                  style={{ color: 'var(--bora-text-subtle)' }}
                >
                  {record.category}
                  {record.isHot ? ' · HOT' : ''}
                </span>
              </button>
            ))
          )}
        </div>


        <div
          className="border p-4"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
          }}
        >
          <p
            className="mb-3 text-[7px] font-black uppercase tracking-[0.2em]"
            style={{ color: 'var(--bora-gold)' }}
          >
            {draft.id ? 'Edit Record' : 'New Record'}
          </p>

          <div className="space-y-3">
            <UpdatesNewsField
              id="cr-news-title"
              label="Title"
              value={draft.title}
              onChange={(v) =>
                setDraft((d) => ({ ...d, title: v }))
              }
            />
            <UpdatesNewsField
              id="cr-news-category"
              label="Category"
              value={draft.category}
              onChange={(v) =>
                setDraft((d) => ({ ...d, category: v }))
              }
            />
            <UpdatesNewsField
              id="cr-news-excerpt"
              label="Excerpt"
              value={draft.excerpt}
              multiline
              onChange={(v) =>
                setDraft((d) => ({ ...d, excerpt: v }))
              }
            />
            <UpdatesNewsField
              id="cr-news-image"
              label="Image URL (media_url)"
              value={draft.image}
              placeholder="https://..."
              onChange={(v) =>
                setDraft((d) => ({ ...d, image: v }))
              }
            />
            <UpdatesNewsField
              id="cr-news-source"
              label="Source"
              value={draft.source}
              onChange={(v) =>
                setDraft((d) => ({ ...d, source: v }))
              }
            />
            <UpdatesNewsField
              id="cr-news-content"
              label="Article Body (content)"
              value={draft.content}
              multiline
              onChange={(v) =>
                setDraft((d) => ({ ...d, content: v }))
              }
            />

            <div className="flex flex-wrap items-center gap-4">
              <label
                className="flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.15em]"
                style={{ color: 'var(--bora-text-muted)' }}
              >
                <input
                  type="checkbox"
                  checked={draft.isHot}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      isHot: e.target.checked,
                    }))
                  }
                  className="h-3.5 w-3.5"
                />
                Hot
              </label>

              <p
                className="text-[6px] uppercase tracking-[0.14em]"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                timestamp derived from published_at
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={phase === 'saving'}
            className="mt-4 w-full border px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed"
            style={{
              borderColor: 'var(--bora-gold)',
              color: 'var(--bora-gold)',
            }}
          >
            {phase === 'saving'
              ? 'Saving…'
              : 'Save News Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
