'use client';

import { useCallback, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

import AdminLoginGUI from './AdminLoginGUI';

export type AdminLoginState =
  | { status: 'idle' }
  | { status: 'loading'; label: string }
  | { status: 'error'; message: string }
  | { status: 'success' };

// BORA LOGIN CONTROLLER: hapa kuna AUTH PEKEE.
// UI (AdminLoginGUI) haijui Supabase ipo.
export default function AdminLoginOP() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<AdminLoginState>(
    searchParams.get('error') === 'oauth'
      ? {
          status: 'error',
          message: 'GitHub authentication failed. Try again.',
        }
      : { status: 'idle' }
  );

  // AUTHENTICATION IMEKAMILIKA → BORA DOORWAY (room selector).
  // Room selector ndiyo inachagua room — si login.
  const enterAdmin = useCallback(() => {
    setState({ status: 'success' });
    router.replace('/admin/room-selector');
  }, [router]);

  const handleGitHub = useCallback(async () => {
    const supabase = createClient();

    setState({
      status: 'loading',
      label: 'Connecting to GitHub...',
    });

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setState({ status: 'error', message: error.message });
    }
  }, []);

  const handlePasskey = useCallback(async () => {
    const supabase = createClient();

    setState({ status: 'loading', label: 'Waiting for device...' });

    try {
      const { error } = await supabase.auth.signInWithPasskey();

      if (error) {
        setState({
          status: 'error',
          message:
            error.name === 'NotAllowedError'
              ? 'Authentication cancelled.'
              : 'Passkey unavailable. Use GitHub or email/password instead.',
        });
        return;
      }

      enterAdmin();
    } catch {
      setState({
        status: 'error',
        message:
          'Passkey unavailable. Use GitHub or email/password instead.',
      });
    }
  }, [enterAdmin]);

  const handleEmailPassword = useCallback(
    async (email: string, password: string) => {
      const supabase = createClient();

      setState({
        status: 'loading',
        label: 'Authenticating...',
      });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState({
          status: 'error',
          message: 'Invalid email or password.',
        });
        return;
      }

      enterAdmin();
    },
    [enterAdmin]
  );

  return (
    <AdminLoginGUI
      state={state}
      onGitHub={handleGitHub}
      onPasskey={handlePasskey}
      onEmailPassword={handleEmailPassword}
    />
  );
}