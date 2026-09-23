'use client';

import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

import AdminLoginBackground from './graphics/AdminLoginBackground';
import AdminLoginBrand from './graphics/AdminLoginBrand';
import GitHubLogin from './auth/GitHubLogin';
import AuthDivider from './auth/AuthDivider';
import PasskeyLogin from './auth/PasskeyLogin';
import EmailPasswordLogin from './auth/EmailPasswordLogin';
import LoginFooter from './components/LoginFooter';

import type {
  AdminLoginState,
} from './AdminLoginOP';

interface AdminLoginGUIProps {
  state: AdminLoginState;
  onGitHub: () => void;
  onPasskey: () => void;
  onEmailPassword: (
    email: string,
    password: string
  ) => void;
}

export default function AdminLoginGUI({
  state,
  onGitHub,
  onPasskey,
  onEmailPassword,
}: AdminLoginGUIProps) {
  const router = useRouter();

  const isLoading =
    (state as { status: string }).status === 'loading';

  const renderCard = () => {
    switch (state.status) {
      case 'success':
        return (
          <div className="py-10 text-center">
            <p
              className="font-cinzel text-sm font-black uppercase tracking-[0.14em]"
              style={{ color: 'var(--bora-gold)' }}
            >
              Authentication Verified
            </p>
            <p
              className="mt-2 text-[7px] font-bold uppercase tracking-[0.2em]"
              style={{ color: 'var(--bora-text-muted)' }}
            >
              Entering Control Room...
            </p>
          </div>
        );

      case 'loading':
        return (
          <div className="py-10 text-center">
            <p
              className="font-cinzel text-sm font-black uppercase tracking-[0.14em]"
              style={{ color: 'var(--bora-text)' }}
            >
              {state.label}
            </p>
          </div>
        );

      default:
        return (
          <>
            <GitHubLogin
              disabled={isLoading}
              onClick={onGitHub}
            />

            <AuthDivider />

            <PasskeyLogin
              disabled={isLoading}
              onClick={onPasskey}
            />

            <AuthDivider />

            <EmailPasswordLogin
              loading={isLoading}
              error={state.status === 'error' ? state.message : ''}
              onSubmit={onEmailPassword}
            />
          </>
        );
    }
  };

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4"
      style={{
        backgroundColor: 'var(--bora-background)',
        color: 'var(--bora-text)',
      }}
    >
      <AdminLoginBackground />

      <div className="relative z-10 w-full max-w-md -translate-y-12">
        <AdminLoginBrand />

        <div
          className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
          style={{
            borderColor:
              'color-mix(in srgb, var(--bora-gold) 28%, var(--bora-border-strong))',
            background:
              'linear-gradient(145deg, color-mix(in srgb, var(--bora-surface) 78%, transparent), color-mix(in srgb, var(--bora-background-deep) 82%, transparent))',
            backdropFilter: 'blur(28px) saturate(120%)',
            WebkitBackdropFilter: 'blur(28px) saturate(120%)',
            boxShadow:
              '0 30px 100px rgba(0,0,0,0.5), 0 0 60px var(--bora-gold-glow), inset 0 1px 0 color-mix(in srgb, var(--bora-text) 9%, transparent), inset 0 0 50px color-mix(in srgb, var(--bora-gold) 3%, transparent)',
          }}
        >
          {renderCard()}
        </div>

        <LoginFooter />
      </div>
    </main>
  );
}
