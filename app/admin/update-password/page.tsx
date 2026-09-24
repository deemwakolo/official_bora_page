'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async () => {
    if (loading) return;

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const supabase = createClient();

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.replace('/admin/room-selector');
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
        <h1
          className="font-cinzel text-sm font-black uppercase tracking-[0.14em]"
          style={{ color: 'var(--bora-gold)' }}
        >
          New Password
        </h1>

        <label
          htmlFor="bora-new-password"
          className="mt-6 mb-2 block text-[7px] font-black uppercase tracking-[0.2em]"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          New Password
        </label>

        <input
          id="bora-new-password"
          type="password"
          value={newPassword}
          onChange={(event) =>
            setNewPassword(event.target.value)
          }
          className="w-full rounded-lg border px-3 py-3 text-xs outline-none"
          style={{
            borderColor: 'var(--bora-border-strong)',
            backgroundColor:
              'color-mix(in srgb, var(--bora-background-deep) 75%, transparent)',
            color: 'var(--bora-text)',
          }}
        />

        <label
          htmlFor="bora-confirm-password"
          className="mt-4 mb-2 block text-[7px] font-black uppercase tracking-[0.2em]"
          style={{ color: 'var(--bora-text-muted)' }}
        >
          Confirm Password
        </label>

        <input
          id="bora-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(event.target.value)
          }
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
          onClick={handleUpdate}
          disabled={
            loading || !newPassword || !confirmPassword
          }
          className="mt-5 w-full rounded-lg border px-4 py-3.5 font-cinzel text-[9px] font-black uppercase tracking-[0.14em]"
          style={{
            borderColor: 'var(--bora-gold)',
            background:
              'linear-gradient(135deg, var(--bora-gold), color-mix(in srgb, var(--bora-gold) 78%, white))',
            color: 'var(--bora-background)',
            opacity:
              loading || !newPassword || !confirmPassword
                ? 0.6
                : 1,
          }}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </main>
  );
}
