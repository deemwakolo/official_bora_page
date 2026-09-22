'use client';

import React from 'react';

// MOCK METRICS: NAMBA TU KWA SASA, SI BUTTONS
// BAADAYE: Streak, Voting days, Pandisha/Shusha counts, Fan level, Fan XP
const metrics = [
  { label: 'Votes', value: 248 },
  { label: 'Artists', value: 37 },
  { label: 'Songs', value: 84 },
];

export default function FanMetrics() {
  return (
    <div
      className="mx-auto mt-6 flex max-w-sm items-center justify-between"
    >
      {metrics.map((metric) => (
        <div key={metric.label} className="text-center">
          {/* VALUE */}
          <p className="font-cinzel text-xl font-black text-[var(--bora-gold)]">
            {metric.value}
          </p>

          {/* LABEL */}
          <p
            className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            {metric.label}
          </p>
        </div>
      ))}
    </div>
  );
}
