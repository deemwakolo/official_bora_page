'use client';

import React from 'react';

import type { ProfileTab } from './ProfileGUI';

interface ProfileTabsProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

const tabs = [
  { id: 'activity', label: 'Activity' },
  { id: 'songs', label: 'Songs' },
  { id: 'artists', label: 'Artists' },
] as const;

export default function ProfileTabs({
  activeTab,
  onTabChange,
}: ProfileTabsProps) {
  return (
    <div
      className="mt-5 flex items-center justify-center gap-8 border-b"
      style={{ borderColor: 'var(--bora-border)' }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className="relative pb-3 font-cinzel text-sm font-black uppercase tracking-[0.12em] transition-colors duration-300"
            style={{
              color: isActive
                ? 'var(--bora-gold)'
                : 'var(--bora-text-muted)',
            }}
          >
            {tab.label}

            {/* ACTIVE UNDERLINE */}
            <span
              className="absolute inset-x-0 bottom-[-1px] h-[2px] transition-opacity duration-300"
              style={{
                backgroundColor: 'var(--bora-gold)',
                opacity: isActive ? 1 : 0,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
