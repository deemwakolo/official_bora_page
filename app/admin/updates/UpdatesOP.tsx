'use client';

import React, { useState } from 'react';

import UpdatesNav, {
  type UpdatesSection,
} from './UpdatesNav';

import UpdatesAboutEditor from './UpdatesAboutEditor';
import UpdatesNewsEditor from './UpdatesNewsEditor';

function PendingSection({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div
      className="flex w-full flex-col items-center justify-center border px-6 py-12 text-center"
      style={{
        borderColor: 'var(--bora-border)',
        backgroundColor: 'var(--bora-surface)',
      }}
    >
      <p
        className="font-cinzel text-[10px] font-black uppercase leading-none tracking-[0.18em]"
        style={{ color: 'var(--bora-gold)' }}
      >
        {title}
      </p>

      {lines.map((line) => (
        <p
          key={line}
          className="mt-2 max-w-[440px] text-[7px] uppercase leading-relaxed tracking-[0.14em]"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

/*
 * BORA UPDATES ROOM
 *
 * Editorial/content room: FAQ · NEWS · ABOUT US.
 * Room Selector -> /admin/updates inaingia hapa (adminRooms.ts
 * haijasishikiliwa). Ndani yake destinations tatu.
 */
export default function UpdatesOP() {
  const [activeSection, setActiveSection] =
    useState<UpdatesSection>('about');

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-5 md:px-8">
      <div
        className="w-full border"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-background-deep)',
        }}
      >
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5">
          <div className="min-w-0">
            <p
              className="text-[7px] font-black uppercase tracking-[0.24em]"
              style={{ color: 'var(--bora-gold)' }}
            >
              BORA Admin
            </p>
            <h2 className="mt-2 font-cinzel text-lg font-black uppercase tracking-[0.14em] sm:text-xl">
              Updates
            </h2>
            <p
              className="mt-2 text-[7px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              Editorial · FAQ · News · About
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <UpdatesNav
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      </div>

      <div className="mt-3">
        {activeSection === 'about' && <UpdatesAboutEditor />}

        {activeSection === 'faq' && (
          <PendingSection
            title="FAQ Editor — Coming Next"
            lines={[
              'FAQ content lives in app/Faq/faqData.ts (local React data).',
              'No faqs table exists in the database and none will be created.',
              'This editor will edit the existing public FAQ content in place.',
            ]}
          />
        )}

        {activeSection === 'news' && <UpdatesNewsEditor />}
      </div>
    </div>
  );
}
