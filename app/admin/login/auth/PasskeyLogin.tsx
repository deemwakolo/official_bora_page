'use client';

import { Fingerprint } from 'lucide-react';

interface PasskeyLoginProps {
  disabled: boolean;
  onClick: () => void;
}

// UI iko PASSKEY — si fingerprint: device ndiyo inachagua
// fingerprint / PIN / Windows Hello / security key.
export default function PasskeyLogin({
  disabled,
  onClick,
}: PasskeyLoginProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center justify-center gap-2.5 rounded-lg border py-3 transition-all duration-300"
      style={{
        borderColor:
          'color-mix(in srgb, var(--bora-gold) 45%, var(--bora-border-strong))',
        background:
          'color-mix(in srgb, var(--bora-gold) 6%, transparent)',
        color: 'var(--bora-gold)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Fingerprint size={14} />

      <span className="text-[9px] font-black uppercase tracking-[0.14em]">
        Sign in with Passkey
      </span>
    </button>
  );
}
