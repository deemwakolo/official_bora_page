'use client';

import React from 'react';
import { BarChart3, Database, Activity } from 'lucide-react';

export default function Top15Control() {
  return (
    <div className="w-full">
      {/* CONTROL HEADER */}
      <div
        className="mb-6 flex items-center justify-between border-b pb-4"
        style={{
          borderColor: 'var(--bora-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <BarChart3
            size={16}
            style={{
              color: 'var(--bora-gold)',
            }}
          />

          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{
                color: 'var(--bora-text)',
              }}
            >
              TOP 15
            </p>

            <p
              className="mt-1 text-[8px] uppercase tracking-[0.12em]"
              style={{
                color: 'var(--bora-text-subtle)',
              }}
            >
              Chart Control
            </p>
          </div>
        </div>

        <span
          className="text-[8px] font-bold uppercase tracking-[0.15em]"
          style={{
            color: 'var(--bora-text-subtle)',
          }}
        >
          CHART_01
        </span>
      </div>

      {/* CONTROL AREA */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {/* CHART STATUS */}
        <div
          className="border p-5"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
          }}
        >
          <div className="mb-5 flex items-center justify-between">
            <span
              className="text-[8px] font-black uppercase tracking-[0.2em]"
              style={{
                color: 'var(--bora-text-subtle)',
              }}
            >
              Chart Status
            </span>

            <Activity
              size={14}
              style={{
                color: 'var(--bora-green)',
              }}
            />
          </div>

          <p
            className="text-2xl font-black uppercase"
            style={{
              color: 'var(--bora-text)',
            }}
          >
            READY
          </p>

          <p
            className="mt-2 text-[8px] uppercase tracking-[0.12em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Top 15 system awaiting input
          </p>
        </div>

        {/* DATA CONNECTION */}
        <div
          className="border p-5"
          style={{
            borderColor: 'var(--bora-border)',
            backgroundColor: 'var(--bora-surface)',
          }}
        >
          <div className="mb-5 flex items-center justify-between">
            <span
              className="text-[8px] font-black uppercase tracking-[0.2em]"
              style={{
                color: 'var(--bora-text-subtle)',
              }}
            >
              Data Layer
            </span>

            <Database
              size={14}
              style={{
                color: 'var(--bora-gold)',
              }}
            />
          </div>

          <p
            className="text-2xl font-black uppercase"
            style={{
              color: 'var(--bora-text)',
            }}
          >
            STANDBY
          </p>

          <p
            className="mt-2 text-[8px] uppercase tracking-[0.12em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Database connection comes later
          </p>
        </div>
      </div>

      {/* WORKSPACE */}
      <div
        className="mt-3 min-h-[220px] border p-6"
        style={{
          borderColor: 'var(--bora-border)',
          backgroundColor: 'var(--bora-surface)',
        }}
      >
        <div className="flex min-h-[170px] items-center justify-center">
          <div className="text-center">
            <BarChart3
              size={32}
              className="mx-auto mb-4"
              style={{
                color: 'var(--bora-text-subtle)',
              }}
            />

            <p
              className="text-[9px] font-black uppercase tracking-[0.25em]"
              style={{
                color: 'var(--bora-text-muted)',
              }}
            >
              Top 15 Control Workspace
            </p>

            <p
              className="mt-2 text-[8px] uppercase tracking-[0.12em]"
              style={{
                color: 'var(--bora-text-subtle)',
              }}
            >
              Chart controls will live here
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}