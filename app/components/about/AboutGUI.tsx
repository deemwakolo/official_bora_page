'use client';

import React from 'react';

import { useAboutContent } from './aboutData';

// BORA PUBLIC ABOUT US VIEW
// Lugha ya macho: Cinzel headings, gold eyebrows, thin borders,
// --bora-* tokens. Hakuna design system mpya.
export default function AboutGUI() {
  const about = useAboutContent();

  return (
    <section
      className="w-full px-4 pb-24 pt-8 md:px-6 md:pt-10"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      <div className="mx-auto w-full max-w-3xl">
        {/* HEADER */}
        <div
          className="flex flex-col gap-3 border-b pb-6 sm:flex-row sm:items-end sm:justify-between"
          style={{ borderColor: 'var(--bora-border-strong)' }}
        >
          <div>
            <p
              className="mb-2 text-[9px] font-black uppercase tracking-[0.34em]"
              style={{ color: 'var(--bora-gold)' }}
            >
              {about.eyebrow}
            </p>

            <h1
              className="font-cinzel text-2xl font-black uppercase tracking-[0.12em] md:text-3xl"
              style={{ color: 'var(--bora-text)' }}
            >
              {about.title}
            </h1>
          </div>

          <p
            className="font-mono text-[7px] uppercase tracking-[0.22em]"
            style={{ color: 'var(--bora-text-subtle)' }}
          >
            ABOUT.EDITABLE
          </p>
        </div>

        {/* TAGLINE */}
        <p
          className="mt-6 text-sm font-semibold uppercase tracking-[0.1em]"
          style={{ color: 'var(--bora-gold)' }}
        >
          {about.tagline}
        </p>

        {/* BODY */}
        <div className="mt-5 space-y-4">
          {about.body.map((paragraph, index) => (
            <p
              key={index}
              className="text-sm leading-relaxed"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              {paragraph}
            </p>
          ))}
        </div>

        {/* FACTS */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {about.facts.map((fact) => (
            <div
              key={fact.id}
              className="border p-4"
              style={{
                borderColor: 'var(--bora-border)',
                backgroundColor: 'var(--bora-surface)',
              }}
            >
              <p
                className="text-[7px] font-black uppercase tracking-[0.2em]"
                style={{ color: 'var(--bora-text-subtle)' }}
              >
                {fact.label}
              </p>

              <p
                className="mt-2 text-[11px] font-black uppercase tracking-[0.08em]"
                style={{ color: 'var(--bora-text)' }}
              >
                {fact.value}
              </p>
            </div>
          ))}
        </div>

        {/* VALUES */}
        <div className="mt-8 space-y-3">
          {about.values.map((value, index) => (
            <div
              key={value.id}
              className="flex items-start gap-4 border-b pb-4"
              style={{ borderColor: 'var(--bora-border)' }}
            >
              <span
                className="w-7 shrink-0 font-cinzel text-sm font-black"
                style={{ color: 'var(--bora-gold)' }}
              >
                {String(index + 1).padStart(2, '0')}
              </span>

              <div className="min-w-0">
                <h2
                  className="text-[11px] font-black uppercase tracking-[0.12em]"
                  style={{ color: 'var(--bora-text)' }}
                >
                  {value.title}
                </h2>

                <p
                  className="mt-1.5 text-xs leading-relaxed"
                  style={{ color: 'var(--bora-text-muted)' }}
                >
                  {value.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* LINKS */}
        <div className="mt-8 flex flex-wrap gap-3">
          {about.links.map((link) => (
            <a
              key={link.id}
              href={link.href}
              className="border px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.16em] transition-colors duration-300"
              style={{
                borderColor: 'var(--bora-border-strong)',
                color: 'var(--bora-text-muted)',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
