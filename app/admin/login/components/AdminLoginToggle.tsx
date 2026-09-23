'use client';

import React, { useState } from 'react';

import { Settings2 } from 'lucide-react';

import { useBoraTheme } from '@/app/components/components-themes/MasterGUI';
import { useMasterSound } from '@/app/components/components-themes/haptics/MasterSound';
import { useMasterHaptics } from '@/app/components/components-themes/haptics/MasterHaptics';

function ToggleRow({
  label,
  active,
  onToggle,
  disabled,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className="text-[8px] font-bold uppercase tracking-[0.14em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        {label}
      </span>

      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={`Toggle ${label}`}
        className="flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors"
        style={{
          borderColor: 'var(--bora-border-strong)',
          backgroundColor: active
            ? 'color-mix(in srgb, var(--bora-gold) 30%, transparent)'
            : 'color-mix(in srgb, var(--bora-text) 8%, transparent)',
          justifyContent: active ? 'flex-end' : 'flex-start',
        }}
      >
        <span
          className="h-4 w-4 rounded-full"
          style={{
            backgroundColor: active
              ? 'var(--bora-gold)'
              : 'var(--bora-text-subtle)',
          }}
        />
      </button>
    </div>
  );
}

// BORA GUI TOGGLE: inacontrol EXISTING MasterGUI state
// (theme + sound + haptics) — hakuna duplicate preferences.
export default function AdminLoginToggle() {
  const [open, setOpen] = useState(false);

  const { theme, changeTheme, mounted } =
    useBoraTheme();

  const { soundEnabled, setSoundEnabled } =
    useMasterSound();

  const { hapticsEnabled, setHapticsEnabled } =
    useMasterHaptics();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center">
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        {open && (
          <div
            className="w-[220px] rounded-xl border p-3 backdrop-blur-xl"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--bora-surface) 80%, transparent)',
              borderColor:
                'color-mix(in srgb, var(--bora-gold) 25%, var(--bora-border-strong))',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <p
              className="mb-2 text-[6px] font-black uppercase tracking-[0.3em]"
              style={{ color: 'var(--bora-text-subtle)' }}
            >
              GUI
            </p>

            <div className="mb-2">
              <ToggleRow
                label="Theme"
                active={theme === 'white'}
                disabled={!mounted}
                onToggle={() =>
                  changeTheme(
                    theme === 'black' ? 'white' : 'black'
                  )
                }
              />
            </div>

            <div className="mb-2">
              <ToggleRow
                label="Sound"
                active={soundEnabled}
                onToggle={() =>
                  setSoundEnabled(!soundEnabled)
                }
              />
            </div>

            <ToggleRow
              label="Haptics"
              active={hapticsEnabled}
              onToggle={() =>
                setHapticsEnabled(!hapticsEnabled)
              }
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-label="Open GUI settings"
          className="flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-xl transition-transform duration-300 hover:scale-105"
          style={{
            borderColor:
              'color-mix(in srgb, var(--bora-gold) 30%, var(--bora-border-strong))',
            backgroundColor:
              'color-mix(in srgb, var(--bora-surface) 75%, transparent)',
            color: 'var(--bora-gold)',
            boxShadow:
              '0 8px 30px rgba(0,0,0,0.45), 0 0 20px var(--bora-gold-glow)',
          }}
        >
          <Settings2 size={15} />
        </button>
      </div>
    </div>
  );
}