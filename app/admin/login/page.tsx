'use client';

import React, { useState } from 'react';

import { useRouter } from 'next/navigation';

import AdminLoginGraphics from './AdminLoginGraphics';
import AdminLoginOp from './AdminLoginOp';

export default function AdminLoginPage() {
  const router = useRouter();

  const [entering, setEntering] =
    useState(false);

  const handleEnter = () => {
    setEntering(true);

    setTimeout(() => {
      router.push('/admin/control-room');
    }, 900);
  };

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4"
      style={{
        backgroundColor:
          'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      <AdminLoginGraphics />

      <div className="relative z-10 w-full max-w-md -translate-y-12">
        {/* BRAND */}
        <div className="mb-7 text-center">
          <div className="flex items-center justify-center">
            <div
              className="font-cinzel text-3xl font-black tracking-[0.18em]"
              style={{
                color: 'var(--bora-text)',
                textShadow:
                  '0 0 20px var(--bora-gold-glow)',
              }}
            >
              BORA
            </div>

            <span
              className="ml-1.5 mt-4 h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor:
                  'var(--bora-gold)',
                boxShadow:
                  '0 0 5px var(--bora-gold), 0 0 15px var(--bora-gold-glow)',
              }}
            />
          </div>

          <div
            className="mt-1.5 text-[7px] font-black uppercase tracking-[0.35em]"
            style={{
              color:
                'var(--bora-text-subtle)',
            }}
          >
            Control Room
          </div>
        </div>

        {/* CARD */}
        <div
          className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
          style={{
            borderColor:
              'color-mix(in srgb, var(--bora-gold) 28%, var(--bora-border-strong))',
            background:
              'linear-gradient(145deg, color-mix(in srgb, var(--bora-surface) 78%, transparent), color-mix(in srgb, var(--bora-background-deep) 82%, transparent))',
            backdropFilter:
              'blur(28px) saturate(120%)',
            WebkitBackdropFilter:
              'blur(28px) saturate(120%)',
            boxShadow:
              '0 30px 100px rgba(0,0,0,0.5), 0 0 60px var(--bora-gold-glow), inset 0 1px 0 color-mix(in srgb, var(--bora-text) 9%, transparent), inset 0 0 50px color-mix(in srgb, var(--bora-gold) 3%, transparent)',
          }}
        >
          <AdminLoginOp
            onEnter={handleEnter}
            entering={entering}
          />
        </div>

        {/* FOOTER */}
        <div className="mt-5 text-center">
          <p
            className="text-[6px] uppercase tracking-[0.2em]"
            style={{
              color:
                'var(--bora-text-subtle)',
            }}
          >
            BORA // MATITU NATION
          </p>
        </div>
      </div>

      {/* ENTRY TRANSITION */}
      {entering && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor:
              'var(--bora-background)',
            animation:
              'boraSectionIn 0.3s ease-out',
          }}
        >
          <div className="text-center">
            <div
              className="font-cinzel text-3xl font-black tracking-[0.18em]"
              style={{
                color: 'var(--bora-text)',
                textShadow:
                  '0 0 25px var(--bora-gold-glow)',
              }}
            >
              BORA
            </div>

            <div
              className="mt-3 text-[7px] font-black uppercase tracking-[0.3em]"
              style={{
                color: 'var(--bora-gold)',
              }}
            >
              Entering Control Room
            </div>

            <div
              className="mx-auto mt-5 h-px w-20"
              style={{
                backgroundColor:
                  'var(--bora-gold)',
                boxShadow:
                  '0 0 15px var(--bora-gold)',
              }}
            />
          </div>
        </div>
      )}
    </main>
  );
}