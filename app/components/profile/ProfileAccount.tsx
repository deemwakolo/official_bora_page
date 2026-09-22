'use client';

import React from 'react';

import { ChevronRight } from 'lucide-react';

// PLACEHOLDERS: HAKUNA PAGES BADO
const controls = [
  'Edit Profile',
  'Notifications',
  'Preferences',
  'Privacy',
  'Account',
];

export default function ProfileAccount() {
  return (
    <div
      className="mt-8 border-t pt-5"
      style={{ borderColor: 'var(--bora-border)' }}
    >
      {/* SECTION HEADER */}
      <p
        className="mb-3 text-center font-mono text-[10px] font-black uppercase tracking-[0.22em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        ACCOUNT
      </p>

      {/* CONTROL ROWS */}
      <div
        className="divide-y rounded-2xl border"
        style={{ borderColor: 'var(--bora-border)' }}
      >
        {controls.map((control) => (
          <button
            key={control}
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors duration-300 hover:bg-white/[0.03]"
          >
            <span>{control}</span>

            <ChevronRight
              size={14}
              style={{ color: 'var(--bora-text-muted)' }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
