'use client';

import React, { useState } from 'react';

interface NewsItem {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
}

export default function FeedControl() {
  const [news, setNews] = useState<NewsItem[]>([
    {
      id: 1,
      title: 'NEWS HEADLINE 01',
      category: 'MUSIC',
      excerpt: 'News story summary goes here.',
      imageUrl: '',
      source: 'BORA NEWS',
      publishedAt: '',
    },
    {
      id: 2,
      title: 'NEWS HEADLINE 02',
      category: 'MUSIC',
      excerpt: 'News story summary goes here.',
      imageUrl: '',
      source: 'BORA NEWS',
      publishedAt: '',
    },
  ]);

  const addNews = () => {
    setNews((current) => [
      ...current,
      {
        id: Date.now(),
        title: `NEWS HEADLINE ${String(
          current.length + 1
        ).padStart(2, '0')}`,
        category: 'MUSIC',
        excerpt: '',
        imageUrl: '',
        source: 'BORA NEWS',
        publishedAt: '',
      },
    ]);
  };

  const removeNews = (id: number) => {
    setNews((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  const updateField = (
    id: number,
    field: keyof NewsItem,
    value: string
  ) => {
    setNews((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  return (
    <div className="w-full">
      <div
        className="w-full border"
        style={{
          borderColor: 'var(--bora-border)',
        }}
      >
        {news.map((item, index) => (
          <div
            key={item.id}
            className="border-b p-4 last:border-b-0 sm:p-5"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor: 'var(--bora-surface)',
            }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="font-cinzel text-sm font-black"
                  style={{
                    color:
                      index < 3
                        ? 'var(--bora-gold)'
                        : 'var(--bora-text-subtle)',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span
                  className="text-[13px]"
                  style={{
                    color: 'var(--bora-gold)',
                  }}
                >
                  ≡
                </span>

                <span
                  className="truncate text-[8px] font-black uppercase tracking-[0.14em]"
                  style={{
                    color: 'var(--bora-text)',
                  }}
                >
                  News Story
                </span>
              </div>

              <button
                type="button"
                onClick={() => removeNews(item.id)}
                className="shrink-0 text-[7px] font-black uppercase tracking-[0.12em]"
                style={{
                  color: 'var(--bora-red)',
                }}
              >
                Remove
              </button>
            </div>

            <div className="mb-3">
              <label
                className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                style={{
                  color: 'var(--bora-text-muted)',
                }}
              >
                Headline
              </label>

              <input
                type="text"
                value={item.title}
                onChange={(event) =>
                  updateField(
                    item.id,
                    'title',
                    event.target.value
                  )
                }
                className="w-full border px-3 py-3 text-xs outline-none"
                style={{
                  borderColor: 'var(--bora-border)',
                  backgroundColor:
                    'var(--bora-background)',
                  color: 'var(--bora-text)',
                }}
              />
            </div>

            <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                  style={{
                    color: 'var(--bora-text-muted)',
                  }}
                >
                  Category
                </label>

                <input
                  type="text"
                  value={item.category}
                  onChange={(event) =>
                    updateField(
                      item.id,
                      'category',
                      event.target.value
                    )
                  }
                  className="w-full border px-3 py-3 text-xs outline-none"
                  style={{
                    borderColor:
                      'var(--bora-border)',
                    backgroundColor:
                      'var(--bora-background)',
                    color: 'var(--bora-text)',
                  }}
                />
              </div>

              <div>
                <label
                  className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                  style={{
                    color: 'var(--bora-text-muted)',
                  }}
                >
                  Source
                </label>

                <input
                  type="text"
                  value={item.source}
                  onChange={(event) =>
                    updateField(
                      item.id,
                      'source',
                      event.target.value
                    )
                  }
                  className="w-full border px-3 py-3 text-xs outline-none"
                  style={{
                    borderColor:
                      'var(--bora-border)',
                    backgroundColor:
                      'var(--bora-background)',
                    color: 'var(--bora-text)',
                  }}
                />
              </div>
            </div>

            <div className="mb-3">
              <label
                className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                style={{
                  color: 'var(--bora-text-muted)',
                }}
              >
                Excerpt
              </label>

              <textarea
                value={item.excerpt}
                onChange={(event) =>
                  updateField(
                    item.id,
                    'excerpt',
                    event.target.value
                  )
                }
                rows={4}
                className="w-full resize-none border px-3 py-3 text-xs outline-none"
                style={{
                  borderColor: 'var(--bora-border)',
                  backgroundColor:
                    'var(--bora-background)',
                  color: 'var(--bora-text)',
                }}
              />
            </div>

            <div className="mb-3">
              <label
                className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                style={{
                  color: 'var(--bora-text-muted)',
                }}
              >
                Image URL
              </label>

              <input
                type="text"
                value={item.imageUrl}
                onChange={(event) =>
                  updateField(
                    item.id,
                    'imageUrl',
                    event.target.value
                  )
                }
                placeholder="https://..."
                className="w-full border px-3 py-3 text-xs outline-none"
                style={{
                  borderColor: 'var(--bora-border)',
                  backgroundColor:
                    'var(--bora-background)',
                  color: 'var(--bora-text)',
                }}
              />
            </div>

            <div>
              <label
                className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
                style={{
                  color: 'var(--bora-text-muted)',
                }}
              >
                Published At
              </label>

              <input
                type="datetime-local"
                value={item.publishedAt}
                onChange={(event) =>
                  updateField(
                    item.id,
                    'publishedAt',
                    event.target.value
                  )
                }
                className="w-full border px-3 py-3 text-xs outline-none"
                style={{
                  borderColor: 'var(--bora-border)',
                  backgroundColor:
                    'var(--bora-background)',
                  color: 'var(--bora-text)',
                }}
              />
            </div>

            <button
              type="button"
              className="mt-4 w-full border px-4 py-3 text-[8px] font-black uppercase tracking-[0.18em]"
              style={{
                borderColor: 'var(--bora-gold)',
                backgroundColor:
                  'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))',
                color: 'var(--bora-gold)',
              }}
            >
              Save Story
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addNews}
        className="mt-3 flex w-full items-center justify-center gap-3 border px-4 py-4 transition-all duration-200"
        style={{
          borderColor: 'var(--bora-gold)',
          backgroundColor:
            'color-mix(in srgb, var(--bora-gold) 5%, var(--bora-surface))',
          color: 'var(--bora-gold)',
        }}
      >
        <span className="text-base leading-none">
          +
        </span>

        <span className="text-[8px] font-black uppercase tracking-[0.18em]">
          Add News Story
        </span>
      </button>
    </div>
  );
}