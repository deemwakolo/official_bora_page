'use client';

import { useState } from 'react';

import { ArrowRight } from 'lucide-react';

import AuthDivider from './AuthDivider';

interface EmailPasswordLoginProps {
  loading: boolean;
  error: string;
  onSubmit: (
    email: string,
    password: string
  ) => void;
}

export default function EmailPasswordLogin({
  loading,
  error,
  onSubmit,
}: EmailPasswordLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] =
    useState(false);

  const canSubmit =
    email.length > 0 && password.length > 0 && !loading;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit(email, password);
      }}
    >
      {/* EMAIL */}
      <label
        htmlFor="bora-email"
        className="mb-2 block text-[7px] font-black uppercase tracking-[0.2em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        Email
      </label>

      <input
        id="bora-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="admin@bora..."
        className="mb-5 w-full rounded-lg border px-3 py-3 text-xs outline-none transition-all duration-300"
        style={{
          borderColor: 'var(--bora-border-strong)',
          backgroundColor:
            'color-mix(in srgb, var(--bora-background-deep) 75%, transparent)',
          color: 'var(--bora-text)',
        }}
      />

      {/* PASSWORD */}
      <label
        htmlFor="bora-password"
        className="mb-2 block text-[7px] font-black uppercase tracking-[0.2em]"
        style={{ color: 'var(--bora-text-muted)' }}
      >
        Password
      </label>

      <div className="relative mb-3">
        <input
          id="bora-password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          value={password}
          onChange={(event) =>
            setPassword(event.target.value)
          }
          placeholder="••••••••••••"
          className="w-full rounded-lg border px-3 py-3 pr-16 text-xs outline-none transition-all duration-300"
          style={{
            borderColor: 'var(--bora-border-strong)',
            backgroundColor:
              'color-mix(in srgb, var(--bora-background-deep) 75%, transparent)',
            color: 'var(--bora-text)',
          }}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase tracking-[0.12em]"
          style={{ color: 'var(--bora-text-subtle)' }}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <p
          className="mb-3 text-[8px] font-bold uppercase tracking-[0.12em]"
          style={{ color: 'var(--bora-red)' }}
        >
          Authentication Failed — {error}
        </p>
      )}

      {/* SUBMIT */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="group flex w-full items-center justify-between rounded-lg border px-4 py-3.5 transition-all duration-300"
        style={{
          borderColor: 'var(--bora-gold)',
          background:
            'linear-gradient(135deg, var(--bora-gold), color-mix(in srgb, var(--bora-gold) 78%, white))',
          color: 'var(--bora-background)',
          boxShadow:
            '0 0 25px var(--bora-gold-glow), inset 0 1px 0 rgba(255,255,255,0.22)',
          opacity: canSubmit ? 1 : 0.6,
        }}
      >
        <span className="font-cinzel text-[9px] font-black uppercase tracking-[0.14em]">
          {loading
            ? 'Authenticating...'
            : 'Enter Control Room'}
        </span>

        <ArrowRight
          size={14}
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      </button>

      {/* FORGOT */}
      <div className="mt-4 text-center">
        <a
          href="/admin/forgot-password"
          className="text-[7px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          Forgot password?
        </a>
      </div>

      {/* Hidden divider user later in composition */}
      <AuthDivider />
    </form>
  );
}
