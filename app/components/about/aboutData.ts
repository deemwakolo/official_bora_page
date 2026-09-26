'use client';

import { useSyncExternalStore } from 'react';

// ============================================================
// ABOUT US — SHARED CONTENT (CLIENT-SAFE)
//
// Hii ni MOCK content. Hakuna Supabase, hakuna auth.
//
// Control Room → Updates → ABOUT US inaandika hapa.
// Public /about inaisoma hapa. Hakuna nakala tofauti.
//
// Pattern ile ile kama profileData.ts: module store +
// useSyncExternalStore, kwa sababu Control Room na public site
// hawashirikiwi mzizi mmoja unao mountiwa.
//
// CONTENT HAPA NI PLACEHOLDER SEED — si final BORA copy.
// Badilisha kutoka Updates → About Us.
// ============================================================

export interface AboutFact {
  id: string;
  label: string;
  value: string;
}

export interface AboutValue {
  id: string;
  title: string;
  description: string;
}

export interface AboutLink {
  id: string;
  label: string;
  href: string;
}

export interface AboutContent {
  eyebrow: string;
  title: string;
  tagline: string;
  body: string[];
  facts: AboutFact[];
  values: AboutValue[];
  links: AboutLink[];
}

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  eyebrow: 'BORA // MATITU NATION',
  title: 'ABOUT US',
  tagline:
    'PLACEHOLDER TAGLINE — replace from Control Room → Updates → About Us.',

  body: [
    'PLACEHOLDER PARAGRAPH 1 — this is seed copy, not final BORA editorial. Edit it in Control Room → Updates → About Us.',
    'PLACEHOLDER PARAGRAPH 2 — add or remove body paragraphs from the same editor.',
  ],

  facts: [
    {
      id: 'fact-base',
      label: 'Base',
      value: 'PLACEHOLDER — Dar es Salaam, Tanzania',
    },
    {
      id: 'fact-focus',
      label: 'Focus',
      value: 'PLACEHOLDER — sound, visuals and strategy',
    },
    {
      id: 'fact-since',
      label: 'Since',
      value: 'PLACEHOLDER — year',
    },
  ],

  values: [
    {
      id: 'value-1',
      title: 'PLACEHOLDER VALUE 1',
      description:
        'PLACEHOLDER — describe the first studio value.',
    },
    {
      id: 'value-2',
      title: 'PLACEHOLDER VALUE 2',
      description:
        'PLACEHOLDER — describe the second studio value.',
    },
    {
      id: 'value-3',
      title: 'PLACEHOLDER VALUE 3',
      description:
        'PLACEHOLDER — describe the third studio value.',
    },
  ],

  links: [
    {
      id: 'link-1',
      label: 'PLACEHOLDER LINK 1',
      href: '#',
    },
    {
      id: 'link-2',
      label: 'PLACEHOLDER LINK 2',
      href: '#',
    },
  ],
};

let current: AboutContent = DEFAULT_ABOUT_CONTENT;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

/** Soma About Us content yote. */
export function useAboutContent(): AboutContent {
  return useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot
  );
}

/** Badilisha scalars (eyebrow / title / tagline). */
export function setAboutField(
  field: 'eyebrow' | 'title' | 'tagline',
  value: string
) {
  current = { ...current, [field]: value };
  emit();
}

/** Badilisha body paragraph kwa index. */
export function setAboutBody(
  index: number,
  value: string
) {
  current = {
    ...current,
    body: current.body.map((line, i) =>
      i === index ? value : line
    ),
  };
  emit();
}

export function addAboutBody() {
  current = {
    ...current,
    body: [...current.body, 'NEW PLACEHOLDER PARAGRAPH'],
  };
  emit();
}

export function removeAboutBody(index: number) {
  if (current.body.length <= 1) return;
  current = {
    ...current,
    body: current.body.filter((_, i) => i !== index),
  };
  emit();
}

export function setAboutFact(
  index: number,
  patch: Partial<AboutFact>
) {
  current = {
    ...current,
    facts: current.facts.map((fact, i) =>
      i === index ? { ...fact, ...patch } : fact
    ),
  };
  emit();
}

export function setAboutValue(
  index: number,
  patch: Partial<AboutValue>
) {
  current = {
    ...current,
    values: current.values.map((value, i) =>
      i === index ? { ...value, ...patch } : value
    ),
  };
  emit();
}

export function setAboutLink(
  index: number,
  patch: Partial<AboutLink>
) {
  current = {
    ...current,
    links: current.links.map((link, i) =>
      i === index ? { ...link, ...patch } : link
    ),
  };
  emit();
}

/** Rudisha content yote kwa default. */
export function resetAboutContent() {
  current = DEFAULT_ABOUT_CONTENT;
  emit();
}
