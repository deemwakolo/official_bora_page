'use client';

import { Github } from 'lucide-react';

interface GitHubLoginProps {
  disabled: boolean;
  onClick: () => void;
}

export default function GitHubLogin({
  disabled,
  onClick,
}: GitHubLoginProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-full items-center justify-center gap-2.5 rounded-lg border py-3 transition-all duration-300"
      style={{
        borderColor: 'var(--bora-border-strong)',
        background:
          'color-mix(in srgb, var(--bora-background-deep) 70%, transparent)',
        color: 'var(--bora-text)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <Github size={14} />

      <span className="text-[9px] font-black uppercase tracking-[0.14em]">
        Continue with GitHub
      </span>
    </button>
  );
}
