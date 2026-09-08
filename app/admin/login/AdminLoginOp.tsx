'use client';

import React, { useState } from 'react';

import { ArrowRight, LockKeyhole } from 'lucide-react';

interface AdminLoginOpProps {
  onEnter: () => void;
  entering: boolean;
}

export default function AdminLoginOp({
  onEnter,
  entering,
}: AdminLoginOpProps) {
  const [showPassword, setShowPassword] =
    useState(false);

  return (
    <div className="relative z-10">
      {/* HEADER */}
      <div className="mb-7 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg border"
          style={{
            borderColor:
              'color-mix(in srgb, var(--bora-red) 65%, var(--bora-border))',
            background:
              'radial-gradient(circle at center, var(--bora-red-glow), transparent 75%)',
            color: 'var(--bora-red)',
            boxShadow:
              '0 0 18px var(--bora-red-glow), inset 0 0 15px var(--bora-red-glow)',
          }}
        >
          <LockKeyhole size={15} />
        </div>

        <div>
          <p
            className="font-cinzel text-sm font-black uppercase tracking-[0.12em]"
            style={{
              color: 'var(--bora-text)',
            }}
          >
            Admin Access
          </p>

          <p
            className="mt-1 text-[7px] font-bold uppercase tracking-[0.18em]"
            style={{
              color: 'var(--bora-text-subtle)',
            }}
          >
            Restricted Area
          </p>
        </div>
      </div>

      {/* EMAIL */}
      <div className="mb-5">
        <label
          htmlFor="email"
          className="mb-2 block text-[7px] font-black uppercase tracking-[0.2em]"
          style={{
            color: 'var(--bora-text-muted)',
          }}
        >
          Email
        </label>

        <div className="relative">
          <input
            id="email"
            type="email"
            placeholder="admin@bora..."
            className="w-full rounded-lg border px-3 py-3 text-xs outline-none transition-all duration-300"
            style={{
              borderColor:
                'var(--bora-border-strong)',
              backgroundColor:
                'color-mix(in srgb, var(--bora-background-deep) 75%, transparent)',
              color: 'var(--bora-text)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter:
                'blur(12px)',
              boxShadow:
                'inset 0 1px 0 color-mix(in srgb, var(--bora-text) 4%, transparent), inset 0 0 25px rgba(0,0,0,0.15)',
            }}
          />

          <div
            className="pointer-events-none absolute inset-x-3 bottom-0 h-px opacity-40"
            style={{
              background:
                'linear-gradient(90deg, transparent, var(--bora-gold), transparent)',
            }}
          />
        </div>
      </div>

      {/* PASSWORD */}
      <div className="mb-7">
        <label
          htmlFor="password"
          className="mb-2 block text-[7px] font-black uppercase tracking-[0.2em]"
          style={{
            color: 'var(--bora-text-muted)',
          }}
        >
          Password
        </label>

        <div className="relative">
          <input
            id="password"
            type={
              showPassword
                ? 'text'
                : 'password'
            }
            placeholder="••••••••••••"
            className="w-full rounded-lg border px-3 py-3 pr-20 text-xs outline-none transition-all duration-300"
            style={{
              borderColor:
                'var(--bora-border-strong)',
              backgroundColor:
                'color-mix(in srgb, var(--bora-background-deep) 75%, transparent)',
              color: 'var(--bora-text)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter:
                'blur(12px)',
              boxShadow:
                'inset 0 1px 0 color-mix(in srgb, var(--bora-text) 4%, transparent), inset 0 0 25px rgba(0,0,0,0.15)',
            }}
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                !showPassword
              )
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase tracking-[0.12em]"
            style={{
              color:
                'var(--bora-text-subtle)',
            }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* ENTER */}
      <button
        type="button"
        onClick={onEnter}
        disabled={entering}
        className="group flex w-full items-center justify-between rounded-lg border px-4 py-3.5 transition-all duration-300"
        style={{
          borderColor: 'var(--bora-gold)',
          background:
            'linear-gradient(135deg, var(--bora-gold), color-mix(in srgb, var(--bora-gold) 78%, white))',
          color: 'var(--bora-background)',
          boxShadow:
            '0 0 25px var(--bora-gold-glow), inset 0 1px 0 rgba(255,255,255,0.22)',
          opacity: entering ? 0.85 : 1,
        }}
      >
        <span className="font-cinzel text-[9px] font-black uppercase tracking-[0.14em]">
          {entering
            ? 'Entering Control Room'
            : 'Enter Control Room'}
        </span>

        <ArrowRight
          size={14}
          className={`transition-transform duration-300 ${
            entering
              ? 'translate-x-1'
              : 'group-hover:translate-x-1'
          }`}
        />
      </button>

      {/* STATUS */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor:
                'var(--bora-green)',
              boxShadow:
                '0 0 7px var(--bora-green)',
            }}
          />

          <span
            className="text-[6px] font-bold uppercase tracking-[0.18em]"
            style={{
              color:
                'var(--bora-text-subtle)',
            }}
          >
            System Ready
          </span>
        </div>

        <span
          className="font-mono text-[6px] uppercase tracking-[0.12em]"
          style={{
            color:
              'var(--bora-text-subtle)',
          }}
        >
          AUTH_01
        </span>
      </div>
    </div>
  );
}