'use client';

import React from 'react';

import { ArrowDown, ArrowUp } from 'lucide-react';

interface ActivityEntry {
  id: string;
  type: 'up' | 'down';
  song: string;
  artist: string;
  time: string;
}

// MOCK ACTIVITY: PANDISHA/SHUSHA NDILO LUGHA YA BORA
const activity: ActivityEntry[] = [
  {
    id: '1',
    type: 'up',
    song: 'Song A',
    artist: 'Artist A',
    time: 'Today',
  },
  {
    id: '2',
    type: 'up',
    song: 'Song B',
    artist: 'Artist B',
    time: 'Today',
  },
  {
    id: '3',
    type: 'down',
    song: 'Song C',
    artist: 'Artist C',
    time: 'Yesterday',
  },
];

export default function ProfileActivity() {
  // GROUP KWA SIKU: TODAY / YESTERDAY
  const groups: { time: string; entries: ActivityEntry[] }[] = [];

  activity.forEach((entry) => {
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.time === entry.time) {
      lastGroup.entries.push(entry);
    } else {
      groups.push({ time: entry.time, entries: [entry] });
    }
  });

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.time}>
          {/* TIME HEADING */}
          <p
            className="mb-3 font-mono text-[10px] font-black uppercase tracking-[0.22em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            {group.time}
          </p>

          {/* ENTRIES */}
          <div
            className="divide-y"
            style={{ borderColor: 'var(--bora-border)' }}
          >
            {group.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 py-3"
              >
                {/* VOTE DIRECTION */}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    entry.type === 'up'
                      ? 'border-[var(--bora-gold)]/40 text-[var(--bora-gold)]'
                      : 'border-red-600/40 text-red-500'
                  }`}
                >
                  {entry.type === 'up' ? (
                    <ArrowUp size={14} />
                  ) : (
                    <ArrowDown size={14} />
                  )}
                </span>

                {/* SONG + ARTIST */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {entry.song}
                  </p>

                  <p
                    className="truncate text-xs"
                    style={{ color: 'var(--bora-text-muted)' }}
                  >
                    {entry.artist}
                    {' · '}
                    {entry.type === 'up'
                      ? 'Pandisha'
                      : 'Shusha'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
