'use client';

import { Suspense } from 'react';

import AdminLoginOP from './AdminLoginOP';

// SUSPENSE INAHITAJIKA: AdminLoginOP inatumia useSearchParams()
// (injasoma ?error=oauth kutoka kwa OAuth callback).
export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminLoginOP />
    </Suspense>
  );
}
