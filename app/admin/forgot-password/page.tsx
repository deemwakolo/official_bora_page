'use client';

import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!email || loading) return;

    const supabase = createClient();

    setLoading(true);
    setError('');

    const { error } =
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin/update-password`,
      });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  };

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center px-4"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      <div className="w-full max-w-md -translate-y-12">
        <div
          className="font-cinzel text-3xl font-black tracking-[0.18em]"
          style={{ color: 'var(--bora-text)' }}
        >
          BORA
        </div>

        <h1
          className="mt-6 font-cinzel text-sm font-black uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-gold)' }}
        >
          Reset Password
        </h1>

        {sent ? (
          <p
            className="mt-4 text-[9px] font-bold uppercase tracking-[0.14em]"
            style={{ color: 'var(--bora-text-muted)' }}
          >
            Reset link sent. Check your email.
          </p>
        ) : (
          <>
            <label
              htmlFor="bora-reset-email"
              className="mt-6 mb-2 block text-[7px] font-black uppercase tracking-[0.2em]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              Email
            </label>

            <input
              id="bora-reset-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border px-3 py-3 text-xs outline-none"
              style={{
                borderColor: 'var(--bora-border-strong)',
                backgroundColor:
                  'color-mix(in srgb, var(--bora-background-deep) 75%, transparent)',
                color: 'var(--bora-text)',
              }}
            />

            {error && (
              <p
                className="mt-3 text-[8px] font-bold uppercase tracking-[0.12em]"
                style={{ color: 'var(--bora-red)' }}
              >
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !email}
              className="mt-5 w-full rounded-lg border px-4 py-3.5 font-cinzel text-[9px] font-black uppercase tracking-[0.14em]"
              style={{
                borderColor: 'var(--bora-gold)',
                background:
                  'linear-gradient(135deg, var(--bora-gold), color-mix(in srgb, var(--bora-gold) 78%, white))',
                color: 'var(--bora-background)',
                opacity: loading || !email ? 0.6 : 1,
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </>
        )}

        <a
          href="/admin/login"
          className="mt-6 block text-[7px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          ← Back to login
        </a>
      </div>
    </main>
  );
}
