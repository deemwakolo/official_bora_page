'use client';

import React, { useState } from 'react';

import type { FaqItem } from './../../../Faq/faqData';
import { faqData as seedFaqs } from './../../../Faq/faqData';

const categories = [
  'BORA',
  'VOTING',
  'CHARTS',
  'TRENDS',
  'PROFILE',
  'ACCOUNT',
  'GENERAL',
];

interface FaqForm {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  published: boolean;
}

const emptyForm: FaqForm = {
  question: '',
  answer: '',
  category: 'GENERAL',
  sortOrder: 1,
  published: true,
};

// FAQ CONTROL: POSTING STATION (LOCAL STATE BADO, SUPABASE BAADAYE)
export default function FAQControl() {
  const [items, setItems] = useState<FaqItem[]>(
    [...seedFaqs].sort(
      (a, b) => a.sortOrder - b.sortOrder
    )
  );

  const [form, setForm] = useState<FaqForm>(emptyForm);
  const [editingId, setEditingId] = useState<
    string | null
  >(null);

  const updateForm = <K extends keyof FaqForm>(
    field: K,
    value: FaqForm[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const saveFaq = () => {
    if (!form.question.trim() || !form.answer.trim()) {
      return;
    }

    if (editingId) {
      setItems((current) =>
        current.map((item) =>
          item.id === editingId
            ? {
                ...item,
                question: form.question,
                answer: form.answer,
                category: form.category,
                sortOrder: form.sortOrder,
                published: form.published,
              }
            : item
        )
      );
    } else {
      setItems((current) => [
        ...current,
        {
          id: Date.now().toString(),
          question: form.question,
          answer: form.answer,
          category: form.category,
          sortOrder: form.sortOrder,
          published: form.published,
        },
      ]);
    }

    resetForm();
  };

  const editFaq = (item: FaqItem) => {
    setEditingId(item.id);
    setForm({
      question: item.question,
      answer: item.answer,
      category: item.category || 'GENERAL',
      sortOrder: item.sortOrder,
      published: item.published,
    });
  };

  const togglePublished = (id: string) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, published: !item.published }
          : item
      )
    );
  };

  const sortedItems = [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  return (
    <div className="w-full">
      {/* SECTION HEADER */}
      <p
        className="mb-4 font-cinzel text-sm font-black uppercase tracking-[0.14em]"
        style={{ color: 'var(--bora-gold)' }}
      >
        FAQ Control
      </p>

      {/* EDITOR PANEL */}
      <div
        className="w-full border p-4 sm:p-5"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >
        <p
          className="mb-4 text-[7px] font-black uppercase tracking-[0.15em]"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          {editingId
            ? 'Editing existing FAQ'
            : 'New FAQ'}
        </p>

        {/* QUESTION */}
        <div className="mb-3">
          <label
            className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Question
          </label>

          <input
            type="text"
            value={form.question}
            onChange={(event) =>
              updateForm('question', event.target.value)
            }
            className="w-full border px-3 py-3 text-xs outline-none"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor: 'var(--bora-background)',
              color: 'var(--bora-text)',
            }}
          />
        </div>

        {/* ANSWER */}
        <div className="mb-3">
          <label
            className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Answer
          </label>

          <textarea
            value={form.answer}
            onChange={(event) =>
              updateForm('answer', event.target.value)
            }
            rows={4}
            className="w-full resize-none border px-3 py-3 text-xs outline-none"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor: 'var(--bora-background)',
              color: 'var(--bora-text)',
            }}
          />
        </div>

        {/* CATEGORY + SORT ORDER */}
        <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              Category
            </label>

            <select
              value={form.category}
              onChange={(event) =>
                updateForm('category', event.target.value)
              }
              className="w-full border px-3 py-3 text-xs outline-none"
              style={{
                borderColor: 'var(--bora-border)',
                backgroundColor:
                  'var(--bora-background)',
                color: 'var(--bora-text)',
              }}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-2 block text-[7px] font-black uppercase tracking-[0.15em]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              Sort order
            </label>

            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(event) =>
                updateForm(
                  'sortOrder',
                  Number(event.target.value) || 0
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

        {/* PUBLISHED */}
        <label className="mb-4 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) =>
              updateForm(
                'published',
                event.target.checked
              )
            }
            className="h-4 w-4"
            style={{ accentColor: 'var(--bora-gold)' }}
          />

          <span
            className="text-[8px] font-black uppercase tracking-[0.15em]"
            style={{ color: 'var(--bora-text)' }}
          >
            Published
          </span>
        </label>

        {/* SAVE / CANCEL */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveFaq}
            className="border px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300"
            style={{
              borderColor: 'var(--bora-gold)',
              color: 'var(--bora-gold)',
            }}
          >
            {editingId ? 'Update FAQ' : 'Save FAQ'}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="border px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em]"
              style={{
                borderColor: 'var(--bora-border)',
                color: 'var(--bora-text-muted)',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* EXISTING FAQS */}
      <p
        className="mb-4 mt-6 text-[7px] font-black uppercase tracking-[0.15em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        Existing FAQs
      </p>

      <div
        className="w-full border"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        {sortedItems.map((item, index) => (
          <div
            key={item.id}
            className="border-b p-4 last:border-b-0 sm:p-5"
            style={{
              borderColor: 'var(--bora-border)',
              backgroundColor: 'var(--bora-surface)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="font-cinzel text-sm font-black"
                  style={{
                    color: item.published
                      ? 'var(--bora-gold)'
                      : 'var(--bora-text-subtle)',
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span
                  className="truncate text-[8px] font-black uppercase tracking-[0.14em]"
                  style={{ color: 'var(--bora-text)' }}
                >
                  {item.question}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <span
                  className="text-[7px] font-black uppercase tracking-[0.12em]"
                  style={{
                    color: item.published
                      ? 'var(--bora-gold)'
                      : 'var(--bora-text-muted)',
                  }}
                >
                  {item.published ? 'Published' : 'Draft'}
                </span>

                <button
                  type="button"
                  onClick={() => togglePublished(item.id)}
                  className="text-[7px] font-black uppercase tracking-[0.12em]"
                  style={{
                    color: 'var(--bora-text-muted)',
                  }}
                >
                  {item.published ? 'Unpublish' : 'Publish'}
                </button>

                <button
                  type="button"
                  onClick={() => editFaq(item)}
                  className="text-[7px] font-black uppercase tracking-[0.12em]"
                  style={{ color: 'var(--bora-gold)' }}
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
