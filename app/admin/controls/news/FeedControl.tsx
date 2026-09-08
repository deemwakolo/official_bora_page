'use client';

import React, { useState } from 'react';

interface FeaturedNews {
  title: string;
  category: string;
  excerpt: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
}

export default function FeaturedControl() {
  const [featured, setFeatured] =
    useState<FeaturedNews>({
      title: 'FEATURED NEWS HEADLINE',
      category: 'MUSIC',
      excerpt:
        'Featured news story summary goes here.',
      imageUrl: '',
      source: 'BORA NEWS',
      publishedAt: '',
    });

  const updateField = (
    field: keyof FeaturedNews,
    value: string
  ) => {
    setFeatured((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <div className="w-full">
      <div
        className="w-full border"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >
        <div
          className="border-b px-4 py-4 sm:px-5"
          style={{
            borderColor: 'var(--bora-border)',
          }}
        >
          <p
            className="text-[8px] font-black uppercase tracking-[0.2em]"
            style={{
              color: 'var(--bora-gold)',
            }}
          >
            Featured Story
          </p>

          <p
            className="mt-1 text-[7px] uppercase tracking-[0.12em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Main story displayed on BORA News
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4">
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
              value={featured.title}
              onChange={(event) =>
                updateField(
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

          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                value={featured.category}
                onChange={(event) =>
                  updateField(
                    'category',
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
                value={featured.source}
                onChange={(event) =>
                  updateField(
                    'source',
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
          </div>

          <div className="mb-4">
            <label
              className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
              style={{
                color: 'var(--bora-text-muted)',
              }}
            >
              Excerpt
            </label>

            <textarea
              value={featured.excerpt}
              onChange={(event) =>
                updateField(
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

          <div className="mb-4">
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
              value={featured.imageUrl}
              onChange={(event) =>
                updateField(
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

          <div className="mb-4">
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
              value={featured.publishedAt}
              onChange={(event) =>
                updateField(
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
            className="w-full border px-4 py-3 text-[8px] font-black uppercase tracking-[0.18em] transition-all duration-200"
            style={{
              borderColor: 'var(--bora-gold)',
              backgroundColor: 'var(--bora-gold)',
              color: 'var(--bora-background)',
            }}
          >
            Save Featured Story
          </button>
        </div>
      </div>
    </div>
  );
}